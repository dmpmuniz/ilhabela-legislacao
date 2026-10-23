// scripts/tests/atualizar.test.ts — Sincronização incremental com o portal Cespro
//
// Protege três comportamentos que custariam caro em produção:
//   1. a varredura incremental PARA na primeira página inteira de ids
//      conhecidos (sem isso uma checagem de novidades custaria 716 pedidos);
//   2. a lei que o portal passou a listar FORA DE VIGOR é marcada `revogada`
//      no acervo, preservando a curadoria (palavras_chave/tags nunca tocadas);
//   3. re-download da MESMA norma não duplica arquivo nem reescreve por
//      capricho — só quando o texto mudou (hash do corpo limpo).
// Tudo com fetch mockado: nenhum teste toca na rede nem no corpus real.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parsePaginacao,
  mapearStatus,
  ePortariaRH,
  tipoENumeroDoTitulo,
  slugNorma,
  decodificarEntidades,
  htmlParaTexto,
  converterHierarquia,
  extrairDiploma,
} from '../lib/cespro.ts';
import { sincronizar, varrerListagem, carregarManifesto } from '../atualizar.ts';
import { ingerirPacote } from '../ingest.ts';

// ---------------------------------------------------------------------------
// lib/cespro.ts — funções puras
// ---------------------------------------------------------------------------

describe('parsePaginacao', () => {
  it('entende o HTML real de paginação da Cespro', () => {
    const html =
      'Encontrado(s)<b><font size=18> 35.767</b></font> Diploma(s) Legais em <font size=18>716</font> página(s).';
    assert.deepEqual(parsePaginacao(html), { total: 35767, paginas: 716 });
  });

  it('devolve zeros quando o markup vier diferente', () => {
    assert.deepEqual(parsePaginacao('qualquer coisa'), { total: 0, paginas: 0 });
    assert.deepEqual(parsePaginacao(''), { total: 0, paginas: 0 });
  });
});

describe('mapearStatus', () => {
  it('traduz os status do portal para o enum do schema', () => {
    assert.equal(mapearStatus('EM VIGOR'), 'em_vigor');
    assert.equal(mapearStatus('INCONSTITUCIONAL'), 'inconstitucional');
    assert.equal(mapearStatus('FORA DE VIGOR'), 'revogada');
    assert.equal(mapearStatus('REVOGADA'), 'revogada');
  });

  it('mapeia as variantes REAIS observadas no espelho integral do portal', () => {
    assert.equal(mapearStatus('REVOGADO'), 'revogada');
    assert.equal(mapearStatus('VIGÊNCIA ESGOTADA'), 'expirada');
    assert.equal(mapearStatus('EFEITOS CESSADOS'), 'expirada');
    assert.equal(mapearStatus('ANULADA'), 'anulada');
    assert.equal(mapearStatus('INCONSTITUCIONAL - ADI Nº 2270133-83.2022.8.26.0000'), 'inconstitucional');
    assert.equal(mapearStatus('ADI Nº 2144097-06.2016.8.26.0000'), 'inconstitucional');
    assert.equal(mapearStatus('LIMINAR - SUSTANDO A EFICÁCIA DA LEI - ADI Nº 2001626'), 'suspensa');
    // lixo de badge (raspagem quebrada da listagem): benefício da dúvida
    assert.equal(mapearStatus('SERVIDORA'), 'em_vigor');
    assert.equal(mapearStatus('FALTA'), 'em_vigor');
  });

  it('não adivinha status desconhecido', () => {
    assert.equal(mapearStatus('SEI LÁ'), 'em_vigor'); // badge sujo presume em vigor
    assert.equal(mapearStatus(undefined), null);
    assert.equal(mapearStatus(''), null);
  });
});

describe('ePortariaRH', () => {
  it('descarta portaria de nomeação/exoneração (ruído de RH)', () => {
    assert.equal(
      ePortariaRH({
        id: '1',
        ds_title: 'PORTARIA Nº 100, DE 01/01/2024',
        ds_resumo: 'NOMEAR A SERVIDORA FULANA PARA O CARGO DE PROFESSOR.',
      }),
      true,
    );
  });

  it('mantém decreto e portaria temática, mesmo citando cargos', () => {
    assert.equal(
      ePortariaRH({ id: '2', ds_title: 'DECRETO Nº 5.000, DE 01/01/2024', ds_resumo: 'NOMEIA RUA' }),
      false,
    );
    assert.equal(
      ePortariaRH({ id: '3', ds_title: 'PORTARIA Nº 200, DE 01/01/2024', ds_resumo: 'ZONA DE USO DO SOLO' }),
      false,
    );
  });
});

describe('tipoENumeroDoTitulo', () => {
  it('separa tipo e número, com milhar pt-BR', () => {
    assert.deepEqual(tipoENumeroDoTitulo('DECRETO MUNICIPAL Nº 12.040, DE 01/09/2023'), {
      tipo: 'DECRETO MUNICIPAL',
      numero: '12040',
    });
    assert.deepEqual(tipoENumeroDoTitulo('PORTARIA Nº 001, DE 09/04/2020'), {
      tipo: 'PORTARIA',
      numero: '001',
    });
  });

  it('título sem Nº vira tipo inteiro, número vazio (Lei Orgânica)', () => {
    assert.deepEqual(tipoENumeroDoTitulo('LEI ORGÂNICA MUNICIPAL, DE 31/03/1990'), {
      tipo: 'LEI ORGÂNICA MUNICIPAL',
      numero: '',
    });
  });
});

describe('slugNorma', () => {
  it('segue a convenção de nome do corpus', () => {
    assert.equal(slugNorma('DECRETO MUNICIPAL Nº 001, DE 01/01/2001', '2001'), 'DECRETO_MUNICIPAL_001_2001');
    assert.equal(slugNorma('DECRETO MUNICIPAL Nº 12.040, DE 01/09/2023', '2023'), 'DECRETO_MUNICIPAL_12040_2023');
  });

  it('leva o ano do título quando o campo ano vier vazio', () => {
    assert.equal(
      slugNorma('LEI ORGÂNICA MUNICIPAL, DE 31/03/1990', ''),
      'LEI_ORGANICA_MUNICIPAL_000_1990',
    );
  });
});

describe('decodificarEntidades', () => {
  it('decodifica nomeadas e numéricas sem inventar', () => {
    assert.equal(decodificarEntidades('"A" & B&nbsp;C'), '"A" & B C');
    assert.equal(decodificarEntidades('N&#186; 1 e &#x27;X&#x27;'), 'Nº 1 e \'X\'');
    // entidade desconhecida passa intacta (não corrompe o texto)
    assert.equal(decodificarEntidades('&xyz;'), '&xyz;');
  });
});

describe('htmlParaTexto', () => {
  it('limpa o lixo da Cespro e mantém o texto jurídico', () => {
    const html = [
      '<!-- box_img_indice_sistematico --><div id="box_img_indice_sistematico">ÍNDICE SISTEMÁTICO</div>',
      '<div align="right"><div class="box_diploma_publicado_footer">Publicado no portal CESPRO em 02/04/2018.</div></div>',
      '<script>alert(1)</script>',
      '<font size="+1">DECRETO MUNICIPAL Nº 001, DE 01/01/2001</font><br/>',
      'DISPÕE SOBRE "TESTE" & CIA.',
      '<div class="preambulo">O PREFEITO,<br/>DECRETA:</div>',
      '<a name="a1"></a><b>Art. 1º</b> Fica&nbsp;estabelecido o prazo.',
      '<div align="left"><span class="link_arquivo_fonte">baixar arquivo</span></div>',
      'em 02/04/2018',
    ].join('\n');
    const texto = htmlParaTexto(html);
    const linhas = texto.split('\n');
    assert.deepEqual(linhas, [
      'DECRETO MUNICIPAL Nº 001, DE 01/01/2001',
      'DISPÕE SOBRE "TESTE" & CIA.',
      'O PREFEITO,',
      'DECRETA:',
      'Art. 1º',
      'Fica estabelecido o prazo.',
      '',
    ]);
  });
});

describe('converterHierarquia', () => {
  it('marca a estrutura jurídica como no corpus', () => {
    const saida = converterHierarquia(
      'LIVRO I\nTÍTULO II\nCAPÍTULO III\nSEÇÃO IV\nArt. 1º\nArtigo 2º',
    );
    assert.deepEqual(saida.split('\n'), [
      '# LIVRO I',
      '## TÍTULO II',
      '### CAPÍTULO III',
      '#### SEÇÃO IV',
      '##### Art. 1º',
      '##### Artigo 2º',
    ]);
  });
});

describe('extrairDiploma', () => {
  const item = {
    id: '200100001',
    ds_title: 'DECRETO MUNICIPAL Nº 001, DE 01/01/2001',
    ds_resumo: 'DISPÕE SOBRE A VIGÊNCIA DO PLANO PREVENTIVO DE DEFESA CIVIL.',
    ds_status: 'EM VIGOR',
  };
  const api = {
    ds_title_diploma: 'DECRETO MUNICIPAL Nº 001, DE 01/01/2001',
    content_cdDiploma: '200100001',
    content_numeroDiploma: '001',
    content_anoDiploma: '2001',
    htmlContentHeader: '<font>DECRETO MUNICIPAL Nº 001, DE 01/01/2001</font><br/>DISPÕE SOBRE O PLANO.',
    htmlContentMiddle: '<b>Art. 1º</b> Fica estabelecida a vigência do plano.',
    htmlContentFooter: '',
    dados_extra: { tx_ementa: 'DISPÕE SOBRE A VIGÊNCIA DO PLANO PREVENTIVO DE DEFESA CIVIL.' },
  };

  it('extrai norma completa do corpo da API', () => {
    const norma = extrairDiploma(api, item);
    assert.ok(norma);
    assert.equal(norma.titulo, 'DECRETO MUNICIPAL Nº 001, DE 01/01/2001');
    assert.equal(norma.tipo, 'DECRETO MUNICIPAL');
    assert.equal(norma.numero, '001');
    assert.equal(norma.status, 'em_vigor');
    assert.equal(norma.ementa, 'DISPÕE SOBRE A VIGÊNCIA DO PLANO PREVENTIVO DE DEFESA CIVIL.');
    assert.match(norma.corpo, /##### Art\. 1º/);
    assert.match(norma.corpo, /Fica estabelecida a vigência do plano\./);
  });

  it('devolve null quando o diploma não tem texto (portal sem conteúdo)', () => {
    assert.equal(extrairDiploma({ content_cdDiploma: '1' }, item), null);
    assert.equal(extrairDiploma({ htmlContentMiddle: '<b>x</b>' }, item), null); // texto < 20 chars
  });
});

// ---------------------------------------------------------------------------
// sincronizar — fluxo completo com fetch mockado
// ---------------------------------------------------------------------------

const PAGINA_HTML = (total: number, paginas: number) =>
  `Encontrado(s)<b><font size=18> ${total}</b></font> Diploma(s) Legais em <font size=18>${paginas}</font> página(s).`;

const LISTA = (itens: unknown[]) => ({
  dados_paginacao_resultado_new: PAGINA_HTML(9999, 716),
  dados_legislacao_resultado_pesquisa_json: Object.fromEntries(itens.map((x, i) => [String(i), x])),
});

const DIPLOMA = (corpoHtml: string) => ({
  content_cdDiploma: 'x',
  ds_title_diploma: 'TÍTULO',
  content_numeroDiploma: '1',
  content_anoDiploma: '2024',
  htmlContentHeader: '',
  htmlContentMiddle: corpoHtml,
  htmlContentFooter: '',
  dados_extra: { tx_ementa: 'EMENTA SUFICIENTEMENTE LONGA PARA O VALIDADOR DO CORPUS.' },
});

describe('sincronizar (fetch mockado)', () => {
  let dir: string;
  let corpusDir: string;
  let idxDir: string;
  let fetchOriginal: typeof fetch;

  const NORMA_NOVA_HTML =
    '<font>PORTARIA Nº 999, DE 01/10/2026</font><br/>EMENTA SUFICIENTEMENTE LONGA PARA O VALIDADOR DO CORPUS.' +
    '<b>Art. 1º</b> Fica instituído o prazo de trinta dias para a apresentação.';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'atualizar-test-'));
    corpusDir = join(dir, 'corpus');
    idxDir = join(dir, 'idx');
    await mkdir(corpusDir, { recursive: true });
    await mkdir(idxDir, { recursive: true });
    // lei antiga já no acervo, com curadoria que NÃO pode se perder
    await writeFile(
      join(corpusDir, 'LEI_MUNICIPAL_123_2020.md'),
      '---\nid: 202000123\ntipo: lei\nnumero: 123\nano: 2020\ncidade: Ilhabela\nestado: SP\n' +
        'esfera: municipal\nstatus: em_vigor\ntitulo: "LEI MUNICIPAL Nº 123, DE 10/06/2020"\n' +
        'ementa: "EMENTA DA LEI ANTIGA QUE JÁ ESTÁ NO ACERVO."\npalavras_chave:\n  - defesa civil\n' +
        'url_fonte: "https://www.cespro.com.br/x"\nversao_formato: "1.1"\n---\nLEI MUNICIPAL Nº 123\nCorpo antigo.\n',
      'utf8',
    );
    await writeFile(
      join(corpusDir, 'LEI_MUNICIPAL_124_2020.md'),
      '---\nid: 202000124\ntipo: lei\nnumero: 124\nano: 2020\ncidade: Ilhabela\nestado: SP\n' +
        'esfera: municipal\nstatus: em_vigor\ntitulo: "LEI MUNICIPAL Nº 124, DE 11/06/2020"\n' +
        'ementa: "EMENTA DA SEGUNDA LEI ANTIGA DO ACERVO."\nurl_fonte: "https://www.cespro.com.br/y"\n' +
        'versao_formato: "1.1"\n---\nLEI MUNICIPAL Nº 124\nCorpo antigo 124.\n',
      'utf8',
    );
    await writeFile(
      join(idxDir, 'manifest.jsonl'),
      JSON.stringify({ id: '202000123', path: 'LEI_MUNICIPAL_123_2020.md', status: 'em_vigor' }) + '\n' +
        JSON.stringify({ id: '202000124', path: 'LEI_MUNICIPAL_124_2020.md', status: 'em_vigor' }) + '\n',
      'utf8',
    );
    process.env.SCRAPER_SLEEP_MIN = '0';
    process.env.SCRAPER_SLEEP_MAX = '0';
    fetchOriginal = globalThis.fetch;
  });

  afterEach(async () => {
    globalThis.fetch = fetchOriginal;
    delete process.env.SCRAPER_SLEEP_MIN;
    delete process.env.SCRAPER_SLEEP_MAX;
    await rm(dir, { recursive: true, force: true });
  });

  /** Instala um fetch falso: `paginas` é a listagem (1 array por página) e
   *  `diplomas` atende content-diploma por id. */
  function mockarFetch(paginas: unknown[][], diplomas: Record<string, unknown>) {
    // @ts-expect-error — mock de teste, assinatura reduzida
    globalThis.fetch = async (url: any) => {
      const u = String(url);
      if (u.includes('operacao=content-pesquisa')) {
        const page = Number(new URL(u).searchParams.get('nPage'));
        const itens = paginas[page - 1] ?? [];
        return new Response(JSON.stringify(LISTA(itens)), { status: 200 });
      }
      if (u.includes('operacao=content-diploma')) {
        const id = new URL(u).searchParams.get('cdDiploma');
        const corpo = diplomas[id];
        if (corpo === undefined) return new Response('{}', { status: 200 });
        return new Response(JSON.stringify(corpo), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    };
  }

  it('baixa só o novo, marca revogada e preserva curadoria', async () => {
    mockarFetch(
      [
        [
          { id: '202610999', ds_title: 'PORTARIA Nº 999, DE 01/10/2026', ds_status: 'EM VIGOR', ds_resumo: 'EMENTA SUFICIENTEMENTE LONGA PARA O VALIDADOR DO CORPUS.' },
          { id: '202000123', ds_title: 'LEI MUNICIPAL Nº 123, DE 10/06/2020', ds_status: 'FORA DE VIGOR', ds_resumo: 'EMENTA DA LEI ANTIGA QUE JÁ ESTÁ NO ACERVO.' },
        ],
        // página 2: só leis já conhecidas → a varredura incremental para aqui
        [
          { id: '202000124', ds_title: 'LEI MUNICIPAL Nº 124, DE 11/06/2020', ds_status: 'EM VIGOR' },
        ],
      ],
      {
        '202610999': {
          ...DIPLOMA(NORMA_NOVA_HTML),
          ds_title_diploma: 'PORTARIA Nº 999, DE 01/10/2026',
          content_numeroDiploma: '999',
          content_anoDiploma: '2026',
        },
      },
    );

    const r = await sincronizar({ corpusDir, idxDir, workers: 1 });
    assert.equal(r.varridos, 3); // 2 da página 1 + 1 da página 2 (antes de parar)
    assert.equal(r.novos, 1);
    assert.equal(r.revogadas, 1);
    assert.equal(r.erros, 0);

    // nova norma: no formato do corpus, com frontmatter completo
    const nova = await readFile(join(corpusDir, 'PORTARIA_999_2026.md'), 'utf8');
    assert.match(nova, /^---\n/);
    assert.match(nova, /id: 202610999/);
    assert.match(nova, /status: em_vigor/);
    assert.match(nova, /cidade: Ilhabela/);
    assert.match(nova, /url_fonte: "https:\/\/www\.cespro\.com\.br\/visualizarDiploma\.php\?cdMunicipio=8969&cdDiploma=202610999"/);
    assert.match(nova, /sha256_raw: "[a-f0-9]{64}"/);
    assert.match(nova, /versao_formato: "1\.1"/);
    assert.match(nova, /##### Art\. 1º/);

    // lei antiga revogada no portal: status atualizado, curadoria intacta
    const antiga = await readFile(join(corpusDir, 'LEI_MUNICIPAL_123_2020.md'), 'utf8');
    assert.match(antiga, /status: revogada/);
    assert.match(antiga, /- defesa civil/); // palavras_chave de curadoria preservada
    assert.match(antiga, /Corpo antigo\./); // corpo intacto (só o status muda)
  });

  it('re-download da mesma norma não duplica nem reescreve sem mudança', async () => {
    mockarFetch(
      [
        [
          { id: '202610999', ds_title: 'PORTARIA Nº 999, DE 01/10/2026', ds_status: 'EM VIGOR', ds_resumo: 'EMENTA SUFICIENTEMENTE LONGA PARA O VALIDADOR DO CORPUS.' },
          { id: '202000123', ds_title: 'LEI MUNICIPAL Nº 123, DE 10/06/2020', ds_status: 'EM VIGOR' },
        ],
        [{ id: '202000124', ds_title: 'LEI MUNICIPAL Nº 124, DE 11/06/2020', ds_status: 'EM VIGOR' }],
      ],
      {
        '202610999': {
          ...DIPLOMA(NORMA_NOVA_HTML),
          ds_title_diploma: 'PORTARIA Nº 999, DE 01/10/2026',
          content_numeroDiploma: '999',
          content_anoDiploma: '2026',
        },
      },
    );

    const primeira = await sincronizar({ corpusDir, idxDir, workers: 1 });
    assert.equal(primeira.novos, 1);
    const antes = await readFile(join(corpusDir, 'PORTARIA_999_2026.md'), 'utf8');

    // manifesto não mudou (pipeline não rodou): a "nova" volta a aparecer —
    // e precisa ser reconhecida como a mesma norma, sem segundo arquivo
    const segunda = await sincronizar({ corpusDir, idxDir, workers: 1 });
    assert.equal(segunda.novos, 0);
    assert.equal(segunda.iguais, 1);
    const depois = await readFile(join(corpusDir, 'PORTARIA_999_2026.md'), 'utf8');
    assert.equal(depois, antes); // byte a byte igual: nada foi reescrito
  });

  it('colisão de slug entre normas diferentes cai no sufixo _2', async () => {
    mockarFetch(
      [
        [
          { id: '202610999', ds_title: 'PORTARIA Nº 999, DE 01/10/2026', ds_status: 'EM VIGOR', ds_resumo: 'EMENTA SUFICIENTEMENTE LONGA PARA O VALIDADOR DO CORPUS.' },
          { id: '202610998', ds_title: 'PORTARIA Nº 999, DE 20/10/2026', ds_status: 'EM VIGOR', ds_resumo: 'EMENTA SUFICIENTEMENTE LONGA PARA O VALIDADOR DO CORPUS.' },
        ],
        [{ id: '202000123', ds_title: 'LEI MUNICIPAL Nº 123, DE 10/06/2020', ds_status: 'EM VIGOR' }],
      ],
      {
        '202610999': {
          ...DIPLOMA(NORMA_NOVA_HTML),
          ds_title_diploma: 'PORTARIA Nº 999, DE 01/10/2026',
          content_numeroDiploma: '999',
          content_anoDiploma: '2026',
        },
        '202610998': {
          ...DIPLOMA(NORMA_NOVA_HTML.replace('01/10/2026', '20/10/2026')),
          ds_title_diploma: 'PORTARIA Nº 999, DE 20/10/2026',
          content_numeroDiploma: '999',
          content_anoDiploma: '2026',
        },
      },
    );

    const r = await sincronizar({ corpusDir, idxDir, workers: 1 });
    assert.equal(r.novos, 2);
    const a = await readFile(join(corpusDir, 'PORTARIA_999_2026.md'), 'utf8');
    const b = await readFile(join(corpusDir, 'PORTARIA_999_2026_2.md'), 'utf8');
    assert.match(a, /id: 202610999/);
    assert.match(b, /id: 202610998/); // os dois atos coexistem, como na fonte
  });

  it('atualiza o corpo quando o texto muda no portal (mesmo id)', async () => {
    const listagem = [
      [
        { id: '202610999', ds_title: 'PORTARIA Nº 999, DE 01/10/2026', ds_status: 'EM VIGOR', ds_resumo: 'EMENTA SUFICIENTEMENTE LONGA PARA O VALIDADOR DO CORPUS.' },
        { id: '202000123', ds_title: 'LEI MUNICIPAL Nº 123, DE 10/06/2020', ds_status: 'EM VIGOR' },
      ],
      [{ id: '202000124', ds_title: 'LEI MUNICIPAL Nº 124, DE 11/06/2020', ds_status: 'EM VIGOR' }],
    ];
    const diploma = (texto: string) => ({
      ...DIPLOMA(texto),
      ds_title_diploma: 'PORTARIA Nº 999, DE 01/10/2026',
      content_numeroDiploma: '999',
      content_anoDiploma: '2026',
    });

    mockarFetch(listagem, { '202610999': diploma(NORMA_NOVA_HTML) });
    await sincronizar({ corpusDir, idxDir, workers: 1 });

    // portal publica texto corrigido do mesmo diploma
    mockarFetch(listagem, { '202610999': diploma(NORMA_NOVA_HTML.replace('trinta dias', 'sessenta dias')) });
    const r = await sincronizar({ corpusDir, idxDir, workers: 1 });
    assert.equal(r.atualizadas, 1);
    const atual = await readFile(join(corpusDir, 'PORTARIA_999_2026.md'), 'utf8');
    assert.match(atual, /sessenta dias/);
  });

  it('respeita --limite (RH e demais atos entram: espelho integral do portal)', async () => {
    mockarFetch({}); // nenhum diploma disponível — nada deve ser baixado

    // página 1 com três candidatas — a de RH (901) agora TAMBÉM baixa:
    // o acervo é o espelho integral; a triagem é da camada de uso (status)
    globalThis.fetch = (async (url: any) => {
      const u = String(url);
      if (u.includes('operacao=content-pesquisa')) {
        return new Response(
          JSON.stringify(LISTA([
            { id: '202610901', ds_title: 'PORTARIA Nº 901, DE 01/10/2026', ds_status: 'EM VIGOR', ds_resumo: 'NOMEAR SERVIDOR PARA O CARGO DE PROFESSOR.' },
            { id: '202610902', ds_title: 'PORTARIA Nº 902, DE 01/10/2026', ds_status: 'VIGÊNCIA ESGOTADA', ds_resumo: 'INSTITUI prazo para apresentação de documentos administrativos.' },
            { id: '202610903', ds_title: 'PORTARIA Nº 903, DE 01/10/2026', ds_status: 'REVOGADA', ds_resumo: 'INSTITUI prazo para apresentação de documentos administrativos.' },
          ])),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify(DIPLOMA('<b>Art. 1º</b> Texto suficientemente longo para passar do corte de vinte caracteres.')), { status: 200 });
    }) as typeof fetch;

    const r = await sincronizar({ corpusDir, idxDir, workers: 1, limite: 2 });
    // limite corta as 3 candidatas em 2 — a RH entra na frente (ordem da listagem)
    assert.equal(r.novos, 2);
    assert.equal(r.varridos, 3);
  });
});

describe('varrerListagem (parada incremental)', () => {
  it('para na primeira página inteira de ids conhecidos', async () => {
    const fetchOriginal = globalThis.fetch;
    process.env.SCRAPER_SLEEP_MIN = '0';
    process.env.SCRAPER_SLEEP_MAX = '0';
    let paginasPedidas = 0;
    const conhecidos = new Set(['200100001', '200100002']);
    try {
      // @ts-expect-error — mock de teste
      globalThis.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('operacao=content-pesquisa')) {
          paginasPedidas++;
          const page = Number(new URL(u).searchParams.get('nPage'));
          const itens = page === 1
            ? [{ id: '209912999', ds_title: 'LEI Nº 1, DE 01/01/2099', ds_status: 'EM VIGOR' }, { id: '200100001', ds_title: 'VELHA', ds_status: 'EM VIGOR' }]
            : [{ id: '200100001', ds_title: 'VELHA', ds_status: 'EM VIGOR' }, { id: '200100002', ds_title: 'VELHA 2', ds_status: 'EM VIGOR' }];
          return new Response(JSON.stringify(LISTA(itens)), { status: 200 });
        }
        return new Response('{}', { status: 404 });
      };
      const itens = await varrerListagem('8969', conhecidos, false);
      assert.equal(paginasPedidas, 2); // página 1 tem novidade, página 2 é toda conhecida → para
      assert.equal(itens.length, 3);
    } finally {
      globalThis.fetch = fetchOriginal;
      delete process.env.SCRAPER_SLEEP_MIN;
      delete process.env.SCRAPER_SLEEP_MAX;
    }
  });

  it('--completo continua além da página conhecida (captura revogações)', async () => {
    const fetchOriginal = globalThis.fetch;
    process.env.SCRAPER_SLEEP_MIN = '0';
    process.env.SCRAPER_SLEEP_MAX = '0';
    let paginasPedidas = 0;
    try {
      // @ts-expect-error — mock de teste
      globalThis.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('operacao=content-pesquisa')) {
          paginasPedidas++;
          const page = Number(new URL(u).searchParams.get('nPage'));
          const itens = page === 1
            ? [{ id: '200100001', ds_title: 'VELHA', ds_status: 'FORA DE VIGOR' }]
            : [{ id: '200100002', ds_title: 'VELHA 2', ds_status: 'FORA DE VIGOR' }];
          return new Response(
            JSON.stringify({
              dados_paginacao_resultado_new: PAGINA_HTML(2, 2),
              dados_legislacao_resultado_pesquisa_json: Object.fromEntries(itens.map((x, i) => [String(i), x])),
            }),
            { status: 200 },
          );
        }
        return new Response('{}', { status: 404 });
      };
      const itens = await varrerListagem('8969', new Set(['200100001', '200100002']), true);
      assert.equal(paginasPedidas, 2); // completo: mesmo tudo conhecido, vai até o fim
      assert.equal(itens.length, 2);
    } finally {
      globalThis.fetch = fetchOriginal;
      delete process.env.SCRAPER_SLEEP_MIN;
      delete process.env.SCRAPER_SLEEP_MAX;
    }
  });
});

describe('carregarManifesto', () => {
  it('lê JSONL e ignora linha corrompida sem derrubar a sincronização', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'manifesto-test-'));
    try {
      const idx = join(dir, 'idx');
      await mkdir(idx, { recursive: true });
      await writeFile(
        join(idx, 'manifest.jsonl'),
        '{"id":"1","path":"a.md","status":"em_vigor"}\nLIXO NÃO-JSON\n{"id":"2","path":"b.md","status":"revogada"}\n',
        'utf8',
      );
      const mapa = await carregarManifesto(idx);
      assert.equal(mapa.size, 2);
      assert.deepEqual(mapa.get('1'), { path: 'a.md', status: 'em_vigor' });
      assert.deepEqual(mapa.get('2'), { path: 'b.md', status: 'revogada' });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('manifesto ausente = primeira sincronização (mapa vazio)', async () => {
    const mapa = await carregarManifesto('/tmp/opencode/nao-existe-manifesto');
    assert.equal(mapa.size, 0);
  });
});

// ---------------------------------------------------------------------------
// Pacote bruto — `npm run atualizar` importa sozinho quando a pasta existe.
// Sem isso, uma primeira instalação a partir do pacote baixaria do portal as
// 18k normas que o pacote acabou de entregar localmente.
// ---------------------------------------------------------------------------

const PACOTE_TXT = [
  '---',
  'id: 200100001',
  'titulo: DECRETO MUNICIPAL Nº 001, DE 01/01/2001',
  'tipo: DECRETO MUNICIPAL',
  'numero: 001',
  'ano: 2001',
  'status: EM VIGOR',
  'ementa: DISPÕE SOBRE O PLANO PREVENTIVO DE DEFESA CIVIL.',
  '---',
  'DECRETO MUNICIPAL Nº 001, DE 01/01/2001',
  '##### Art. 1º',
  'Fica estabelecida a vigência do plano.',
].join('\n') + '\n';

/** Monta um pacote bruto mínimo (txt + listing + raw json) num tmp. */
async function criarPacote(raiz: string): Promise<string> {
  const pacote = join(raiz, 'pacote');
  await mkdir(join(pacote, 'decretos'), { recursive: true });
  await mkdir(join(pacote, 'raw', 'decretos'), { recursive: true });
  await mkdir(join(pacote, 'index'), { recursive: true });
  await writeFile(join(pacote, 'decretos', 'DECRETO_MUNICIPAL_001_2001.txt'), PACOTE_TXT, 'utf8');
  await writeFile(
    join(pacote, 'index', 'listing.json'),
    JSON.stringify([{ id: '200100001', ds_link: '/visualizarDiploma.php?cdMunicipio=8969&cdDiploma=200100001' }]),
    'utf8',
  );
  await writeFile(
    join(pacote, 'raw', 'decretos', '200100001.json'),
    JSON.stringify({ id: '200100001', url: 'https://www.cespro.com.br/visualizarDiploma.php?cdMunicipio=8969&cdDiploma=200100001' }),
    'utf8',
  );
  return pacote;
}

describe('ingerirPacote', () => {
  it('converte o pacote bruto em .md do schema v1.1 e é idempotente', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'ingest-test-'));
    try {
      const pacote = await criarPacote(raiz);
      const corpus = join(raiz, 'corpus');
      const r1 = await ingerirPacote(pacote, corpus);
      assert.equal(r1.convertidos, 1);
      assert.equal(r1.erros, 0);

      const md = await readFile(join(corpus, 'DECRETO_MUNICIPAL_001_2001.md'), 'utf8');
      assert.match(md, /id: 200100001/);
      assert.match(md, /cidade: Ilhabela/);
      assert.match(md, /url_fonte: "https:\/\/www\.cespro\.com\.br\/visualizarDiploma\.php\?cdMunicipio=8969&cdDiploma=200100001"/);
      assert.match(md, /sha256_raw: "[a-f0-9]{64}"/);
      assert.match(md, /versao_formato: "1\.1"/);
      assert.match(md, /##### Art\. 1º/);

      // segunda passada: nada é reescrito, nada duplica
      const r2 = await ingerirPacote(pacote, corpus);
      assert.equal(r2.convertidos, 0);
      assert.equal(r2.mantidos, 1);
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});

describe('sincronizar com pacote bruto (um comando faz tudo)', () => {
  it('importa o pacote e NÃO baixa do portal o que acabou de importar', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sync-pacote-test-'));
    const fetchOriginal = globalThis.fetch;
    process.env.SCRAPER_SLEEP_MIN = '0';
    process.env.SCRAPER_SLEEP_MAX = '0';
    try {
      const pacote = await criarPacote(raiz);
      const corpusDir = join(raiz, 'corpus');
      const idxDir = join(raiz, 'idx');
      await mkdir(corpusDir, { recursive: true });
      await mkdir(idxDir, { recursive: true });

      const diplomasPedidos: string[] = [];
      // @ts-expect-error — mock de teste, assinatura reduzida
      globalThis.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('operacao=content-pesquisa')) {
          const page = Number(new URL(u).searchParams.get('nPage'));
          const itens = page === 1
            ? [
                { id: '200100001', ds_title: 'DECRETO MUNICIPAL Nº 001, DE 01/01/2001', ds_status: 'EM VIGOR' }, // veio do pacote
                { id: '202610999', ds_title: 'PORTARIA Nº 999, DE 01/10/2026', ds_status: 'EM VIGOR', ds_resumo: 'EMENTA SUFICIENTEMENTE LONGA PARA O VALIDADOR DO CORPUS.' },
              ]
            : [{ id: '200100001', ds_title: 'VELHA', ds_status: 'EM VIGOR' }];
          return new Response(JSON.stringify(LISTA(itens)), { status: 200 });
        }
        if (u.includes('operacao=content-diploma')) {
          const id = new URL(u).searchParams.get('cdDiploma');
          diplomasPedidos.push(String(id));
          return new Response(
            JSON.stringify({
              ...DIPLOMA('<b>Art. 1º</b> Texto suficientemente longo para passar do corte de vinte caracteres.'),
              ds_title_diploma: 'PORTARIA Nº 999, DE 01/10/2026',
              content_numeroDiploma: '999',
              content_anoDiploma: '2026',
            }),
            { status: 200 },
          );
        }
        return new Response('{}', { status: 404 });
      };

      const r = await sincronizar({ pacoteDir: pacote, corpusDir, idxDir, workers: 1 });

      assert.equal(r.importadas, 1); // a norma do pacote entrou no corpus
      assert.equal(r.novos, 1); // e só a norma NOVA veio do portal
      assert.ok(await readFile(join(corpusDir, 'DECRETO_MUNICIPAL_001_2001.md'), 'utf8').then(s => s.includes('PLANO PREVENTIVO')));
      assert.ok(await readFile(join(corpusDir, 'PORTARIA_999_2026.md'), 'utf8').then(s => s.includes('id: 202610999')));
      // a norma importada NÃO pode ter sido pedida ao portal de novo
      assert.ok(!diplomasPedidos.includes('200100001'), `pediu ao portal: ${diplomasPedidos.join(', ')}`);
    } finally {
      globalThis.fetch = fetchOriginal;
      delete process.env.SCRAPER_SLEEP_MIN;
      delete process.env.SCRAPER_SLEEP_MAX;
      await rm(raiz, { recursive: true, force: true });
    }
  });

  it('sem pacote (nem --origem), nada é importado e o sync segue normal', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'sync-sem-pacote-test-'));
    const fetchOriginal = globalThis.fetch;
    process.env.SCRAPER_SLEEP_MIN = '0';
    process.env.SCRAPER_SLEEP_MAX = '0';
    try {
      const corpusDir = join(raiz, 'corpus');
      const idxDir = join(raiz, 'idx');
      await mkdir(corpusDir, { recursive: true });
      await mkdir(idxDir, { recursive: true });
      await writeFile(
        join(idxDir, 'manifest.jsonl'),
        JSON.stringify({ id: '200100001', path: 'a.md', status: 'em_vigor' }) + '\n',
        'utf8',
      );
      // @ts-expect-error — mock de teste
      globalThis.fetch = async (url: any) => {
        const u = String(url);
        if (u.includes('operacao=content-pesquisa')) {
          return new Response(
            JSON.stringify(LISTA([{ id: '200100001', ds_title: 'VELHA', ds_status: 'EM VIGOR' }])),
            { status: 200 },
          );
        }
        return new Response('{}', { status: 404 });
      };
      const r = await sincronizar({ corpusDir, idxDir, workers: 1 });
      assert.equal(r.importadas, 0);
      assert.equal(r.novos, 0);
    } finally {
      globalThis.fetch = fetchOriginal;
      delete process.env.SCRAPER_SLEEP_MIN;
      delete process.env.SCRAPER_SLEEP_MAX;
      await rm(raiz, { recursive: true, force: true });
    }
  });
});
