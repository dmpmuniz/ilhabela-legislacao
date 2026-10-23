// scripts/tests/normalize.test.ts — Regras de normalização do corpus
//
// Protege a integridade das CITAÇÕES. O corpus real trazia `numero` como float
// porque o separador de milhar pt-BR foi lido como decimal:
//   "Nº 10.000" → 10  e  "Nº 1.784" → 1.784
// Resultado: dezenas de decretos compartilhando a MESMA ref (`ilh-2023-dec-010`)
// e aliases com número errado ("Decreto 10/2023" para o 10.001).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNumeroTitulo,
  parseNumeroArquivo,
  numeroParaInteiro,
  resolveNumero,
  parseTipoTitulo,
  resolveTipo,
  normalizeTipo,
  makeRef,
  makeAliases,
  refUnica,
} from '../lib/normalize.ts';

describe('parseNumeroTitulo', () => {
  it('entende separador de milhar pt-BR', () => {
    assert.equal(parseNumeroTitulo('DECRETO MUNICIPAL Nº 10.000, DE 01/09/2023'), 10000);
    assert.equal(parseNumeroTitulo('LEI MUNICIPAL Nº 1.784, DE 21/05/2026'), 1784);
    assert.equal(parseNumeroTitulo('DECRETO MUNICIPAL Nº 10.001, DE 01/09/2023'), 10001);
    assert.equal(parseNumeroTitulo('LEI MUNICIPAL Nº 1.234.567, DE 01/01/2020'), 1234567);
  });

  it('entende números simples e com zeros à esquerda', () => {
    assert.equal(parseNumeroTitulo('DECRETO MUNICIPAL Nº 001, DE 01/01/2001'), 1);
    assert.equal(parseNumeroTitulo('LEI Nº 10, DE 02/02/2002'), 10);
    assert.equal(parseNumeroTitulo('PORTARIA Nº 455/2019'), 455);
  });

  it('aceita os símbolos de número usados no corpus', () => {
    assert.equal(parseNumeroTitulo(' Lei n° 1.023 '), 1023);
    assert.equal(parseNumeroTitulo('Lei nº 1.034'), 1034);
  });

  it('não adivinha quando não há número', () => {
    assert.equal(parseNumeroTitulo('CRIADO_PELA_PORTARIA_DE_03/09/1805'), null);
    assert.equal(parseNumeroTitulo(undefined), null);
    assert.equal(parseNumeroTitulo(''), null);
  });
});

describe('parseNumeroArquivo', () => {
  it('extrai do nome do arquivo', () => {
    assert.equal(parseNumeroArquivo('DECRETO_MUNICIPAL_10000_2023.md'), 10000);
    assert.equal(parseNumeroArquivo('leis/LEI_MUNICIPAL_1784_2026.md'), 1784);
    assert.equal(parseNumeroArquivo('LEI_MUNICIPAL_1784_2026'), 1784);
    assert.equal(parseNumeroArquivo('C:\\corpus\\DECRETO_10001_2023.md'), 10001);
  });

  it('trata 000 como marcador de desconhecido', () => {
    assert.equal(parseNumeroArquivo('LEI_ORGANICA_MUNICIPAL_000_1990.md'), null);
  });

  it('devolve null quando o padrão não casa', () => {
    assert.equal(parseNumeroArquivo('SEM_NUMERO.md'), null);
    assert.equal(parseNumeroArquivo(''), null);
  });
});

describe('numeroParaInteiro', () => {
  it('recupera floats que ainda guardam o separador de milhar', () => {
    assert.equal(numeroParaInteiro(10.001), 10001);
    assert.equal(numeroParaInteiro(1.784), 1784);
    assert.equal(numeroParaInteiro(2.003), 2003);
  });

  it('preserva inteiros', () => {
    assert.equal(numeroParaInteiro(10), 10);
    assert.equal(numeroParaInteiro(10000), 10000);
    assert.equal(numeroParaInteiro(0), 0);
  });

  it('entende strings em formato pt-BR', () => {
    assert.equal(numeroParaInteiro('10.000'), 10000);
    assert.equal(numeroParaInteiro('1.784'), 1784);
    assert.equal(numeroParaInteiro('455'), 455);
    assert.equal(numeroParaInteiro('001'), 1);
  });

  it('devolve vazio para valores inúteis', () => {
    assert.equal(numeroParaInteiro(undefined), '');
    assert.equal(numeroParaInteiro(null), '');
    assert.equal(numeroParaInteiro(''), '');
    assert.equal(numeroParaInteiro('abc'), 'abc');
  });
});

describe('resolveNumero', () => {
  it('prefere o título oficial sobre o valor corrompido', () => {
    // caso real: numero float 10, mas o título diz 10.000
    assert.equal(
      resolveNumero({ titulo: 'DECRETO MUNICIPAL Nº 10.000, DE 01/09/2023', arquivo: 'DECRETO_MUNICIPAL_10000_2023.md', fallback: 10 }),
      10000
    );
    assert.equal(
      resolveNumero({ titulo: 'LEI MUNICIPAL Nº 1.784, DE 21/05/2026', arquivo: 'LEI_MUNICIPAL_1784_2026.md', fallback: 1.784 }),
      1784
    );
  });

  it('usa o nome do arquivo quando o título não informa número', () => {
    assert.equal(
      resolveNumero({ titulo: 'SEM NUMERO', arquivo: 'PORTARIA_550_2019.md', fallback: 'x' }),
      550
    );
  });

  it('cai no fallback como último recurso', () => {
    assert.equal(resolveNumero({ titulo: 'SEM', arquivo: 'SEM_NUMERO.md', fallback: 42 }), 42);
    assert.equal(resolveNumero({}), '');
  });

  it('preserva o sufixo de emenda (dois atos podem dividir o número)', () => {
    // o corpus traz o Decreto 2.000 e o 2.000/A, ambos de 22/10/2009
    const comSufixo = resolveNumero({ titulo: 'DECRETO MUNICIPAL Nº 2.000/A, DE 22/10/2009' });
    const semSufixo = resolveNumero({ titulo: 'DECRETO MUNICIPAL Nº 2.000, DE 22/10/2009' });
    assert.equal(comSufixo, '2000/A');
    assert.equal(semSufixo, 2000);
    assert.notEqual(comSufixo, semSufixo, 'precisam ser números distintos');
  });
});

describe('resolveTipo — o título é a fonte autoritativa', () => {
  it('recupera o tipo que execuções antigas do enrich colapsaram', () => {
    // o campo já estava gravado como "portaria"; o título diz "CONJUNTA"
    assert.equal(
      resolveTipo({ titulo: 'PORTARIA CONJUNTA Nº 001, DE 21/03/2020', fallback: 'portaria' }),
      'portaria_conjunta'
    );
  });

  it('mantém o tipo das normas cujo título concorda', () => {
    assert.equal(
      resolveTipo({ titulo: 'DECRETO MUNICIPAL Nº 10.000, DE 01/09/2023', fallback: 'decreto' }),
      'decreto'
    );
    assert.equal(
      resolveTipo({ titulo: 'LEI COMPLEMENTAR Nº 946, DE 05/06/2012', fallback: 'lei_complementar' }),
      'lei_complementar'
    );
    assert.equal(
      resolveTipo({ titulo: 'LEI ORGÂNICA MUNICIPAL Nº 000, DE 31/03/1990', fallback: 'lei_organica' }),
      'lei_organica'
    );
  });

  it('cai no campo gravado quando o título não informa o tipo', () => {
    assert.equal(resolveTipo({ titulo: 'SEM NUMERO AQUI', fallback: 'resolucao' }), 'resolucao');
    assert.equal(parseTipoTitulo('SEM NUMERO AQUI'), null);
    assert.equal(parseTipoTitulo(''), null);
    assert.equal(parseTipoTitulo(undefined), null);
  });
});

describe('makeRef e makeAliases — citações não podem colidir', () => {
  it('refs distintos para decretos de mesmo ano', () => {
    const base = { cidade: 'Ilhabela', ano: 2023, tipo: 'decreto' };
    const r10 = makeRef({ ...base, numero: resolveNumero({ titulo: 'DECRETO MUNICIPAL Nº 10.000, DE 01/09/2023' }) });
    const r10001 = makeRef({ ...base, numero: resolveNumero({ titulo: 'DECRETO MUNICIPAL Nº 10.001, DE 01/09/2023' }) });
    const r10004 = makeRef({ ...base, numero: 10004 });

    assert.equal(r10, 'ilh-2023-dec-10000');
    assert.equal(r10001, 'ilh-2023-dec-10001');
    assert.equal(r10004, 'ilh-2023-dec-10004');
    assert.equal(new Set([r10, r10001, r10004]).size, 3, 'refs devem ser únicos');
  });

  it('não usa parseInt sobre float (bug original: parseInt("10.001") = 10)', () => {
    const ref = makeRef({ cidade: 'Ilhabela', ano: 2023, tipo: 'decreto', numero: 10.001 });
    assert.notEqual(ref, 'ilh-2023-dec-010', 'não deve colidir com o decreto 10');
    assert.equal(ref, 'ilh-2023-dec-10001');
  });

  it('sufixo de emenda gera ref distinto (Decreto 2.000 x 2.000/A)', () => {
    const base = { cidade: 'Ilhabela', ano: 2009, tipo: 'decreto' };
    const simples = makeRef({ ...base, numero: resolveNumero({ titulo: 'DECRETO MUNICIPAL Nº 2.000, DE 22/10/2009' }) });
    const emenda = makeRef({ ...base, numero: resolveNumero({ titulo: 'DECRETO MUNICIPAL Nº 2.000/A, DE 22/10/2009' }) });
    assert.equal(simples, 'ilh-2009-dec-2000');
    assert.equal(emenda, 'ilh-2009-dec-2000a');
    assert.notEqual(simples, emenda);
  });

  it('Portaria Conjunta não colide com a Portaria de mesmo número', () => {
    const base = { cidade: 'Ilhabela', ano: 2020, numero: 1 };
    const simples = makeRef({ ...base, tipo: 'portaria' });
    const conjunta = makeRef({ ...base, tipo: 'portaria_conjunta' });
    assert.equal(simples, 'ilh-2020-port-001');
    assert.equal(conjunta, 'ilh-2020-portc-001');
    assert.notEqual(simples, conjunta);
  });

  it('aliases carregam o número correto', () => {
    const aliases = makeAliases({ tipo: 'decreto', numero: 10001, ano: 2023 });
    assert.ok(aliases.includes('Decreto 10001/2023'));
    assert.ok(aliases.includes('Decreto nº 10001/2023'));
    assert.ok(aliases.includes('Decreto nº 10001'));
    assert.ok(!aliases.some(a => a.includes('10/2023')), 'não deve citar o número errado');
  });

  it('lei complementar gera as siglas LC', () => {
    const aliases = makeAliases({ tipo: 'lei_complementar', numero: 71, ano: 2015 });
    assert.ok(aliases.includes('LC 071/2015'));
    assert.ok(aliases.includes('LC 71/2015'));
  });

  it('inclui as formas com sufixo de emenda', () => {
    const aliases = makeAliases({ tipo: 'decreto', numero: '2000/A', ano: 2009 });
    assert.ok(aliases.includes('Decreto 2000/A/2009'), JSON.stringify(aliases));
    assert.ok(aliases.includes('Decreto 2000/A'));
    assert.ok(aliases.includes('Decreto nº 2000/A'));
  });

  it('Portaria Conjunta usa o rótulo correto', () => {
    const aliases = makeAliases({ tipo: 'portaria_conjunta', numero: 1, ano: 2020 });
    assert.ok(aliases.includes('Portaria Conjunta 1/2020'), JSON.stringify(aliases));
    assert.ok(aliases.includes('Portaria Conjunta nº 1/2020'));
  });

  it('não gera alias sem número ou sem ano', () => {
    assert.deepEqual(makeAliases({ tipo: 'decreto', numero: undefined, ano: 2023 }), []);
    assert.deepEqual(makeAliases({ tipo: 'decreto', numero: 42, ano: undefined }), []);
    assert.deepEqual(makeAliases({ tipo: 'decreto', numero: 0, ano: 2023 }), []);
  });
});

describe('refUnica — diplomas de mesmo número/ano não podem dividir a ref', () => {
  // Caso real: DECRETO 9.543/2022 existe duas vezes no Cespro (exoneração de
  // 08/12 e crédito adicional de 13/12). Antes, ambos citavam ilh-2022-dec-9543.
  it('mantém a primeira ref e sufixa as colisões', () => {
    const usadas = new Set<string>();
    assert.equal(refUnica('ilh-2022-dec-9543', usadas), 'ilh-2022-dec-9543');
    assert.equal(refUnica('ilh-2022-dec-9543', usadas), 'ilh-2022-dec-9543-2');
    assert.equal(refUnica('ilh-2022-dec-9543', usadas), 'ilh-2022-dec-9543-3');
    assert.equal(refUnica('ilh-2023-lei-100', usadas), 'ilh-2023-lei-100');
  });

  it('é determinístico na ordem de processamento dos arquivos', () => {
    // mesma sequência processada duas vezes → mesmos sufixos
    const ordem = ['ilh-2017-dec-6270', 'ilh-2017-dec-6270', 'ilh-2019-lei-5', 'ilh-2017-dec-6270'];
    const rodar = () => {
      const usadas = new Set<string>();
      return ordem.map((r) => refUnica(r, usadas));
    };
    const esperado = ['ilh-2017-dec-6270', 'ilh-2017-dec-6270-2', 'ilh-2019-lei-5', 'ilh-2017-dec-6270-3'];
    assert.deepEqual(rodar(), esperado);
    assert.deepEqual(rodar(), esperado);
  });
});

describe('normalizeTipo — tipos truncados do portal', () => {
  // Caso real: LEI_ORGANICA_MUNICIPAL_000_1990.md traz `tipo: lei_orgâ`
  // (truncado). Sem o mapa, a ref da Lei Orgânica saía como ilh-1990-lei-000.
  it('reconhece a Lei Orgânica truncada como lei_organica', () => {
    assert.equal(normalizeTipo('lei_orgâ'), 'lei_organica');
    assert.equal(normalizeTipo('LEI ORGÂNICA MUNICIPAL'), 'lei_organica');
    assert.equal(normalizeTipo('lei_organica'), 'lei_organica');
  });
});
