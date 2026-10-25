// gerar-notebooklm.mjs — gera as 43 fontes do export para o NotebookLM.
//
// Decisões de desenho (fundamentadas em docs/RAG-NOTEBOOKLM.md):
//   1. Nome descritivo por arquivo → retriever híbrido tem mais pistas
//   2. Cabeçalho com lista de normas + temas → contexto para o retriever
//   3. palavras_chave_auto no cabeçalho de cada norma → busca semântica acerta
//   4. Partes pequenas (corpo ≤300k ⇒ arquivo ≤500k) → reduz "lost in the middle"
//   5. Índice-geral como mapa navegável (tema → parte)
//   6. Partes fora de vigor separadas → não confundem busca de normas vigentes
//   7. Lei Orgânica + Estatuto separados → são as "constituições" locais
//
// Uso: npm run notebooklm (da raiz do repo)

import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { parseFrontmatter } from './lib/frontmatter.ts'
import { fold, classificar } from './lib/notebooklm-classificar.mjs'

const CORPUS = 'leis'
const PASTA = 'notebooklm'
const MAX_PALAVRAS = 300_000 // 60% do teto de 500k (o arquivo final tem
                              // metadados que somam ~40% em cima do corpo)
const TETO_ARQUIVO = 480_000 // margem de segurança sobre o limite de 500k do NotebookLM

const nPalavras = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)

// ─── nomes humanos por grupo (arquivo e título) ───
// O retriever lê o nome do arquivo: "leis-1975-2003" vale mais que "lei-1-1975-2003".
const NOMES = {
  'lei-organica': { arq: 'lei-organica-e-emendas', titulo: 'Lei Orgânica e Emendas' },
  'estatuto': { arq: 'estatuto-dos-servidores-e-alteracoes', titulo: 'Estatuto dos Servidores e Alterações' },
  'lei': { arq: 'leis', titulo: 'Leis Municipais' },
  'lei_complementar': { arq: 'leis-complementares', titulo: 'Leis Complementares' },
  'decreto': { arq: 'decretos', titulo: 'Decretos Municipais' },
  'decreto-nomeacao': { arq: 'decretos-de-nomeacao-e-exoneracao', titulo: 'Decretos de Nomeação e Exoneração' },
  'portaria-readaptacao': { arq: 'portarias-de-readaptacao', titulo: 'Portarias de Readaptação' },
  'portaria-nomeacao-exoneracao': { arq: 'portarias-de-nomeacao-e-exoneracao', titulo: 'Portarias de Nomeação e Exoneração' },
  'portaria-provimento': { arq: 'portarias-de-provimento-e-posse', titulo: 'Portarias de Provimento e Posse' },
  'portaria-disciplinar': { arq: 'portarias-disciplinares', titulo: 'Portarias Disciplinares' },
  'portaria-ferias-licenca': { arq: 'portarias-de-ferias-e-licencas', titulo: 'Portarias de Férias e Licenças' },
  'portaria-designacao': { arq: 'portarias-de-designacao-e-comissoes', titulo: 'Portarias de Designação e Comissões' },
  'portaria-gratificacao': { arq: 'portarias-de-gratificacao-e-premios', titulo: 'Portarias de Gratificação, Adicionais e Prêmios' },
  'portaria-outros': { arq: 'portarias-diversas', titulo: 'Portarias Diversas' },
  'resolucoes-atos-especiais': { arq: 'resolucoes-e-atos-especiais', titulo: 'Resoluções e Atos Especiais' },
  'revogada-lei': { arq: 'leis-revogadas', titulo: 'Leis Revogadas' },
  'revogada-decreto': { arq: 'decretos-revogados', titulo: 'Decretos Revogados' },
  'revogada-portaria': { arq: 'portarias-revogadas', titulo: 'Portarias Revogadas' },
  'fora-vigor-expirada': { arq: 'normas-expiradas-e-cassadas', titulo: 'Normas Expiradas, Anuladas, Inconstitucionais e Suspensas' },
}
const nomeDe = (grupo) => NOMES[grupo] ?? { arq: grupo, titulo: grupo.replace(/-/g, ' ') }

const TIPO_LABEL = {
  lei: 'Lei', lei_complementar: 'Lei Complementar', lei_organica: 'Lei Orgânica',
  decreto: 'Decreto', decreto_legislativo: 'Decreto Legislativo',
  portaria: 'Portaria', portaria_conjunta: 'Portaria Conjunta',
  resolucao: 'Resolução', emenda: 'Emenda',
}
const tipoLabel = (t) => TIPO_LABEL[t] ?? String(t).replaceAll('_', ' ')

// ─── lê o corpus ───
const arquivos = (await readdir(CORPUS)).filter(f => f.endsWith('.md')).sort()
const leis = []
for (const nome of arquivos) {
  const { data: fm, body: corpo } = parseFrontmatter(await readFile(join(CORPUS, nome), 'utf8'))
  if (!fm.titulo) continue
  const lei = {
    titulo: fm.titulo,
    arquivo: nome,
    ref: fm.ref ?? '',
    tipo: fold(String(fm.tipo ?? '')),
    ano: Number(fm.ano) || 0,
    numero: Number(fm.numero) || 0,
    status: fold(String(fm.status ?? '')),
    ementa: fm.ementa ?? '',
    url: fm.url_fonte ?? '',
    data_vigencia: fm.data_vigencia ?? '',
    palavras_chave: [...new Set([
      ...(Array.isArray(fm.palavras_chave) ? fm.palavras_chave : []),
      ...(Array.isArray(fm.palavras_chave_auto) ? fm.palavras_chave_auto : []),
    ].map((s) => String(s).trim()).filter(Boolean))],
    corpo,
    grupo: classificar(fm),
    palavras: nPalavras(corpo),
  }
  leis.push(lei)
}
// rede de segurança: nenhuma norma pode ser descartada em silêncio
if (leis.length !== arquivos.length) {
  throw new Error(`LEITURA INCOMPLETA: ${arquivos.length} arquivos em leis, ${leis.length} lidos (${arquivos.length - leis.length} sem título)`)
}

// ─── agrupa por tema ───
const grupos = new Map()
for (const lei of leis) {
  if (!grupos.has(lei.grupo)) grupos.set(lei.grupo, [])
  grupos.get(lei.grupo).push(lei)
}

// ─── divide grupos grandes em partes de ≤300k palavras de corpo ───
function dividirEmPartes(normas) {
  const partes = []
  let atual = []
  let soma = 0

  for (const lei of normas) {
    if (atual.length > 0 && soma + lei.palavras > MAX_PALAVRAS) {
      partes.push(atual)
      atual = []
      soma = 0
    }
    atual.push(lei)
    soma += lei.palavras
  }
  if (atual.length > 0) partes.push(atual)
  return partes
}

const chavePeriodo = (normas) => {
  const anos = normas.map(n => n.ano).filter(a => a > 0)
  return anos.length ? `${Math.min(...anos)}-${Math.max(...anos)}` : 'sem-data'
}

// ─── nome de arquivo descritivo: base humana + período ───
function nomeArquivo(grupo, normas, indice, total, repetido) {
  const { arq } = nomeDe(grupo)
  const anos = normas.map(n => n.ano).filter(a => a > 0)
  let nome = arq
  if (anos.length) {
    const anoMin = Math.min(...anos)
    const anoMax = Math.max(...anos)
    nome += `-${anoMin}`
    if (anoMax !== anoMin) nome += `-${anoMax}`
  }
  // só desempata por ordinal quando duas partes do mesmo grupo têm o MESMO período
  if (total > 1 && repetido) nome += `-parte-${indice}`
  return `${nome}.md`
}

// amostra distribuída por toda a parte (não só as primeiras normas)
function amostra(normas, max = 40) {
  if (normas.length <= max) return normas
  return Array.from({ length: max }, (_, k) =>
    normas[Math.round(k * (normas.length - 1) / (max - 1))])
}

// temas de curadoria para as partes "constitucionais" (a ementa não os revela)
const TEMAS_MANUAIS = {
  'lei-organica': ['organização do município', 'direitos e garantias', 'administração pública', 'câmara municipal', 'tributos e orçamento', 'meio ambiente'],
  'estatuto': ['servidores públicos', 'provimento e carreira', 'remuneração', 'licenças', 'aposentadoria'],
}

// ─── cabeçalho rico de cada parte ───
function cabecalho(grupo, normas, indice, total) {
  const anos = normas.map(n => n.ano).filter(a => a > 0)
  const anoMin = anos.length ? Math.min(...anos) : 0
  const anoMax = anos.length ? Math.max(...anos) : 0
  const periodo = anoMin > 0 ? (anoMin === anoMax ? `${anoMin}` : `${anoMin} a ${anoMax}`) : ''

  // temas por FREQUÊNCIA (os mais comuns primeiro — pistas pro retriever)
  const temasFreq = new Map()
  const conta = (p) => temasFreq.set(p, (temasFreq.get(p) ?? 0) + 1)
  const stopWords = new Set([
    'sobre', 'para', 'com', 'que', 'dos', 'das', 'por', 'uma', 'nos', 'nas',
    'aos', 'como', 'em', 'de', 'da', 'do', 'e', 'o', 'a', 'na', 'no', 'seu',
    'sua', 'sera', 'foi', 'sao', 'pela', 'pelo', 'este', 'esta', 'onde',
    'qual', 'quais', 'municipio', 'prefeitura', 'prefeito', 'prefeita',
    'ilhabela', 'secretaria', 'art', 'artigo', 'n', 'i', 'ii', 'iii',
    // boilerplate de ementa (não ajuda a distinguir assunto)
    'dispoe', 'dispoem', 'altera', 'alteracao', 'alteracoes', 'providencias',
    'municipal', 'conjunta', 'conjuntas', 'termos', 'forma', 'bem', 'casos',
    'situacoes', 'relacionadas', 'relacionados', 'compor', 'tratar', 'deliberar',
    'impostas', 'data', 'publicacao', 'disposicoes', 'contrario', 'entra',
    'promulgada', 'promulgado', 'alves', 'nascimento',
    'vigor', 'vigencia', 'autoriza', 'estabelece', 'cria', 'criacao',
    // tratamento e sobrenomes comuns em atos de nomeação (não são tema)
    'senhor', 'senhora', 'senhores', 'senhorita', 'ilustrissimo', 'ilustrissima',
    'silva', 'santos', 'oliveira', 'souza', 'sousa', 'pereira', 'costa',
    'almeida', 'ferreira', 'rodrigues', 'martins', 'barbosa', 'ribeiro',
    'carvalho', 'gomes', 'lima', 'araujo', 'machado', 'nunes', 'moreira',
    'cardoso', 'teixeira', 'correia', 'correa', 'dias', 'castro', 'vieira',
    'monteiro', 'moura', 'freitas', 'campos', 'pinto', 'reis', 'rocha',
    'farias', 'marques', 'fernandes', 'goncalves', 'miranda', 'mendes',
    'leite', 'batista', 'cavalcante', 'cavalcanti', 'xavier', 'fonseca',
    'andrade', 'aparecido', 'aparecida', 'benedito', 'conceicao',
    // verbos de ato de pessoal (o tema já é nomeação/exoneração)
    'nomear', 'nomeado', 'nomeada', 'nomeados', 'nomeadas', 'exonerar',
    'exonerado', 'exonerada', 'designar', 'designado', 'designada', 'exercer',
    'ocupar', 'ocupava', 'ocupante', 'menciona', 'secao', 'gerais',
    // meses (data de publicação não é tema)
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho',
    'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    // prenomes comuns em atos de pessoal
    'maria', 'jose', 'joao', 'ana', 'antonio', 'francisco', 'carlos', 'paulo',
    'pedro', 'luiz', 'luis', 'rafael', 'daniel', 'marcos', 'marcelo', 'eduardo',
    'ricardo', 'sergio', 'roberto', 'fabio', 'alexandre', 'fernando', 'bruno',
    'thiago', 'tiago', 'rodrigo', 'leonardo', 'andre', 'fernanda', 'juliana',
    'cristina', 'patricia', 'adriana', 'sandra', 'marcia', 'claudia', 'vanessa',
    'camila', 'bruna', 'larissa', 'jessica', 'aline', 'simone', 'regina',
    'luciana', 'helena', 'natalia', 'daniela', 'lucia', 'carla', 'marta',
  ])
  for (const n of normas) {
    for (const p of n.palavras_chave) conta(fold(p))
    const ementa = fold(n.ementa)
    for (const palavra of ementa.split(/\s+/)) {
      const p = palavra.replace(/[^a-z0-9]/g, '')
      if (p.length > 4 && !stopWords.has(p)) conta(p)
    }
  }
  const temasAuto = [...temasFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([t]) => t)
  const temas = [...new Set([...(TEMAS_MANUAIS[grupo] ?? []), ...temasAuto])].slice(0, 30)

  // amostra de normas no cabeçalho (distribuída pelo período)
  const lista = amostra(normas).map(n =>
    `- ${n.titulo} (${n.ref}, ${n.status.replaceAll('_', ' ')})`
  ).join('\n')
  const mais = normas.length > 40 ? `\n- … e mais ${normas.length - 40} normas (lista completa no corpo)` : ''

  return `# ${nomeDe(grupo).titulo}${periodo ? ` (${periodo})` : ''} — Legislação de Ilhabela/SP

## O que contém
${lista}${mais}

## Temas frequentes
${temas.join(', ')}

## Período
${periodo ? `${periodo} · ` : ''}${normas.length.toLocaleString('pt-BR')} norma${normas.length === 1 ? '' : 's'} · ~${normas.reduce((a,n) => a+n.palavras, 0).toLocaleString('pt-BR')} palavras de texto
${total > 1 ? `\nParte ${indice} de ${total}` : ''}

## Status
Cada norma tem o seu status no cabeçalho: em_vigor, revogada, expirada, inconstitucional, suspensa ou anulada.

---
`
}

// ─── bloco de UMA norma ───
function blocoNorma(l) {
  const palavrasChave = l.palavras_chave.length
    ? `> **Palavras-chave:** ${l.palavras_chave.join(', ')}`
    : ''
  const meta = [
    `> **Ref:** ${l.ref} · **Tipo:** ${tipoLabel(l.tipo)} · **Ano:** ${l.ano} · **Status:** ${l.status.replaceAll('_', ' ')}`,
    l.ementa ? `> **Ementa:** ${l.ementa}` : '',
    l.data_vigencia ? `> **Efeitos a partir de:** ${l.data_vigencia}` : '',
    l.url ? `> **Fonte:** ${l.url}` : '',
    palavrasChave,
  ].filter(Boolean)
  return `# ${l.titulo}\n\n${meta.join('\n')}\n\n${l.corpo.trim()}\n\n---\n`
}

// ─── índice geral ───
const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

function gerarIndiceGeral(partesGeradas) {
  const totalNormas = partesGeradas.reduce((a, p) => a + p.normas.length, 0)
  const linhas = [
    `# Índice Geral — Legislação Municipal de Ilhabela/SP (${mesAno})`,
    ``,
    `Mapa do acervo: **${totalNormas.toLocaleString('pt-BR')} normas** em **${partesGeradas.length} partes** temáticas.`,
    `Cada parte tem, no topo, uma amostra das normas e os temas mais frequentes.`,
    ``,
    `## Onde procurar por assunto`,
    `As partes são organizadas por **tipo de norma + época**, não por assunto.`,
    `Para um tema, consulte todas as partes dos tipos relevantes:`,
    ``,
    `| Você procura | Consulte |`,
    `|---|---|`,
    `| Regras gerais, direitos e obrigações (leis) | leis-*, leis-complementares-*, estatuto-*, lei-organica-* |`,
    `| Regulamentação de leis, atos do Executivo | decretos-* |`,
    `| Situação funcional de servidor (nomeação, readaptação, férias, licença) | decretos-de-nomeacao-*, portarias-de-* |`,
    `| Norma que não vale mais (histórico) | leis-revogadas-*, decretos-revogados-*, portarias-revogadas-*, normas-expiradas-e-cassadas-* |`,
    ``,
    `Cada arquivo cobre o período indicado no inventário abaixo — para uma época, consulte os arquivos cujo período inclui o ano.`,
    ``,
    `## Inventário das partes`,
    `| Arquivo | Conteúdo | Período | Normas | Palavras |`,
    `|---|---|---|---|---|`,
  ]
  for (const p of partesGeradas) {
    const anos = p.normas.map(n => n.ano).filter(a => a > 0)
    const periodo = anos.length
      ? (Math.min(...anos) === Math.max(...anos) ? String(Math.min(...anos)) : `${Math.min(...anos)}–${Math.max(...anos)}`)
      : '—'
    linhas.push(`| ${p.nomeArquivo} | ${nomeDe(p.grupo).titulo} | ${periodo} | ${p.normas.length.toLocaleString('pt-BR')} | ${p.palavrasArquivo.toLocaleString('pt-BR')} |`)
  }

  // por tipo — com os arquivos onde cada tipo aparece
  const porTipo = new Map()
  for (const p of partesGeradas) for (const l of p.normas) {
    const e = porTipo.get(l.tipo) ?? { n: 0, arquivos: new Set() }
    e.n++
    e.arquivos.add(p.nomeArquivo)
    porTipo.set(l.tipo, e)
  }
  linhas.push('', `## Por tipo de norma`, `| Tipo | Normas | Onde |`, `|---|---|---|`)
  for (const [tipo, e] of [...porTipo.entries()].sort((a, b) => b[1].n - a[1].n)) {
    linhas.push(`| ${tipoLabel(tipo)} | ${e.n.toLocaleString('pt-BR')} | ${[...e.arquivos].join(', ')} |`)
  }

  linhas.push('', `## Por status`, `| Status | Quantidade | Nota |`, `|---|---|---|`)
  const porStatus = new Map()
  for (const l of leis) porStatus.set(l.status, (porStatus.get(l.status) ?? 0) + 1)
  const notas = {
    'em_vigor': 'Vale integralmente',
    'revogada': 'Foi revogada; cite com aviso',
    'expirada': 'Vigência esgotada; cite com aviso',
    'inconstitucional': 'Declarada inconstitucional em ADI/ADIN',
    'suspensa': 'Eficácia sustada por liminar',
    'anulada': 'Anulada pela Administração',
  }
  for (const [status, n] of [...porStatus.entries()].sort((a, b) => b[1] - a[1])) {
    linhas.push(`| ${status.replaceAll('_', ' ')} | ${n.toLocaleString('pt-BR')} | ${notas[status] ?? ''} |`)
  }

  return linhas.join('\n') + '\n'
}

// ─── instruções ───
function gerarInstrucoes(totalPartes) {
  return `# 00 — INSTRUÇÕES PARA A IA (persona e regras deste notebook)

> **Quem você é:** o curador assistente da legislação municipal de Ilhabela/SP.
> As demais fontes são as ${leis.length.toLocaleString('pt-BR')} normas do município,
> organizadas em ${totalPartes} partes temáticas (cada uma com cabeçalho descritivo).
>
> **Este documento tem prioridade:** em qualquer conflito entre estas regras e
> o jeito "natural" de responder, prevalecem as regras.

## Regras — obedeça sempre

1. **Nunca invente número, artigo, data, ref ou julgado.** Se a norma não estiver
   nas fontes, diga que não encontrou — inventar é o pior erro possível aqui.
   Só afirme efeito, procedimento ou imposição que esteja **escrito** no texto
   **da norma citada**; se o trecho não existir, não afirme.
2. **Copie a citação do bloco — não a construa.** Para cada norma usada, copie
   o título, a **Ref** e o link **Fonte** exatamente como aparecem no cabeçalho
   do bloco (ex.: \`ilh-2024-dec-10558\`). Nunca monte, deduza ou reformate a
   \`ref\` nem o link; se o bloco não trouxer **Ref** ou **Fonte**, diga que não
   encontrou. Confira o **tipo exato** no cabeçalho (Lei, Lei Complementar,
   Decreto, Portaria) — nunca troque um pelo outro. Só cite artigo/inciso cujo
   número esteja **escrito** no texto da norma — nunca deduza nem complete
   números de dispositivos ou de leis.
3. **Respeite o \`status\` — o acervo é histórico:** copie o **Status** do
   cabeçalho do bloco; nunca deduza pelo ano ou pelo tipo. Ele inclui normas
   \`revogada\`, \`expirada\`, \`anulada\`, \`suspensa\` e \`inconstitucional\` como
   registro. Norma fora de vigor só entra na resposta com o aviso explícito —
   inclusive em listas, com o status junto (ex.: "Lei 887/2000, revogada").
   Para o estado ATUAL da lei, procure a norma vigente.
4. **Data do retrato:** este acervo é um retrato de ${mesAno} — normas
   publicadas depois não estão aqui; recomende conferir a fonte oficial.
5. **Idioma:** português do Brasil. Citações no padrão ABNT (NBR 6023/10520).
6. **Limite do acervo:** ele é MUNICIPAL. Para lei federal/estadual, diga que
   está fora do acervo — não responda de memória.
7. **Formato das respostas práticas:** resposta direta → normas aplicáveis com
   trecho literal → como proceder.
8. **Aviso:** ao fundamentar qualquer decisão, lembre que a IA pode errar e que
   a fonte oficial (o link da norma) prevalece; consulte um advogado.
9. **Refs com sufixo \`-2\`** (ex.: \`ilh-2022-dec-9543-2\`): o município tem dois ou mais
   diplomas de mesmo número/ano — um deles é republicação ou ato distinto.
   Cite a ref exata do bloco que usou; nunca troque uma pela outra.
10. **Atos de pessoal** (nomeações, exonerações, readaptações, férias, licenças)
    estão incluídos e são a fonte certa para quem pergunta sobre posse, nomeação,
    readaptação ou histórico funcional. Mas têm valor individual, não normativo:
    **não os use como fundamento jurídico** de matérias gerais.
11. **Navegação:** use o \`01-INDICE-GERAL.md\` (inventário de todas as partes e
    mapa assunto → tipos) para escolher onde buscar. As partes são por tipo +
    época; para um assunto, consulte todas as partes dos tipos relevantes.
12. **Pergunta temporal:** se envolver "o que valia em [ano]", procure em DUAS
    partes: a norma vigente da época E a norma que a substituiu (ou revogou).
13. **Efeitos a partir de:** quando o bloco trouxer \`Efeitos a partir de\`, use essa
    data para perguntas sobre a partir de quando a norma produz efeitos
    (atenção: a data pode ser retroativa à publicação). Se não houver, não
    invente data — diga que a norma não traz essa informação.

## Sobre este acervo

- Retrato de ${mesAno} · espelho integral do portal Cespro (cdMunicipio 8969)
- ${leis.length.toLocaleString('pt-BR')} normas — vigentes, revogadas, expiradas e atos de pessoal
- Cada parte tem cabeçalho com amostra de normas e temas frequentes
- Cada norma tem \`ref\`, \`status\`, \`ementa\`, \`url_fonte\` e, quando houver, \`palavras-chave\` e \`Efeitos a partir de\`
`
}

// ─── limpa e gera ───
await mkdir(PASTA, { recursive: true })
// Apaga só o que este gerador (ou versão anterior) criou. Jamais arquivos de
// mão — um "rm *.md" daqui já destruiu o plano de curadoria uma vez.
const GRUPOS_APOSENTADOS = [
  'portaria-nomeacao', 'portaria-exoneracao', 'portaria-concurso', 'portaria-obras',
  'portaria-educacao-cultura', 'portaria-aposentadoria', 'portaria-seguranca',
  'portaria-meio-ambiente', 'resolucoes-miscelanea', 'miscelanea', 'outros',
  'fora-vigor-anulada', 'fora-vigor-inconstitucional', 'fora-vigor-suspensa',
  'revogada-lei_complementar', 'parte',
  // base antiga (sem "e-exoneracao"); o prefixo também casa os arquivos novos,
  // que são apagados e regravados na mesma execução
  'decretos-de-nomeacao',
]
const conhecidos = [
  ...grupos.keys(),
  ...GRUPOS_APOSENTADOS,
  ...Object.values(NOMES).map(n => n.arq), // nomes novos (v3 dos arquivos)
]
for (const f of await readdir(PASTA)) {
  if (!f.endsWith('.md')) continue
  const nosso = f === '00-INSTRUCOES.md' || f === '01-INDICE-GERAL.md' ||
    conhecidos.some(g => f === `${g}.md` || f.startsWith(`${g}-`))
  if (nosso) await rm(join(PASTA, f), { force: true })
}

const partesGeradas = []

// ordem de geração: constituições locais → leis → decretos → portarias → fora de vigor
const ORDEM_GRUPOS = [
  'lei-organica', 'estatuto',
  'lei', 'lei_complementar',
  'decreto', 'decreto-nomeacao',
  'portaria-readaptacao', 'portaria-nomeacao-exoneracao',
  'portaria-provimento', 'portaria-disciplinar',
  'portaria-ferias-licenca', 'portaria-designacao', 'portaria-gratificacao',
  'portaria-outros',
  'resolucoes-atos-especiais',
  'revogada-lei', 'revogada-decreto', 'revogada-portaria',
  'fora-vigor-expirada',
]
// grupo criado pela classificação sem estar na lista cai no final — nada se perde
const ordemFinal = [...ORDEM_GRUPOS, ...[...grupos.keys()].filter(g => !ORDEM_GRUPOS.includes(g))]

for (const grupo of ordemFinal) {
  const normas = grupos.get(grupo)
  if (!normas || normas.length === 0) continue

  // ordena por ano + número (dentro do ano, a numeração é cronológica)
  normas.sort((a, b) => a.ano - b.ano || a.numero - b.numero || a.tipo.localeCompare(b.tipo) || a.titulo.localeCompare(b.titulo))

  const partes = dividirEmPartes(normas)
  // duas partes do mesmo grupo com o mesmo período precisam de ordinal no nome
  const repetido = new Set(partes.map(chavePeriodo)).size < partes.length

  for (let i = 0; i < partes.length; i++) {
    const nomeArq = nomeArquivo(grupo, partes[i], i + 1, partes.length, repetido)
    const cabeca = cabecalho(grupo, partes[i], i + 1, partes.length)
    const corpo = partes[i].map(blocoNorma).join('\n')
    const conteudo = cabeca + corpo
    const palavrasArquivo = nPalavras(conteudo)
    if (palavrasArquivo > TETO_ARQUIVO) {
      throw new Error(`PARTE ACIMA DO TETO: ${nomeArq} tem ${palavrasArquivo} palavras (limite ${TETO_ARQUIVO})`)
    }
    await writeFile(join(PASTA, nomeArq), conteudo, 'utf8')
    partesGeradas.push({ grupo, nomeArquivo: nomeArq, normas: partes[i], palavrasArquivo })
  }
}

// rede de segurança: toda norma de leis tem que estar em exatamente uma parte
const totalNasPartes = partesGeradas.reduce((a, p) => a + p.normas.length, 0)
if (totalNasPartes !== leis.length) {
  throw new Error(`PERDA DE NORMAS: ${leis.length} em leis, ${totalNasPartes} nas partes`)
}

// índice geral
await writeFile(join(PASTA, '01-INDICE-GERAL.md'), gerarIndiceGeral(partesGeradas), 'utf8')

// instruções
await writeFile(join(PASTA, '00-INSTRUCOES.md'), gerarInstrucoes(partesGeradas.length), 'utf8')

// relatório
console.log(`\n${leis.length.toLocaleString('pt-BR')} normas em ${partesGeradas.length} partes temáticas:`)
for (const p of partesGeradas) {
  const palavrasCorpo = p.normas.reduce((a, n) => a + n.palavras, 0)
  console.log(`  ${p.nomeArquivo}  (${p.normas.length} norma${p.normas.length === 1 ? '' : 's'}, ~${(palavrasCorpo/1000).toFixed(0)}k de texto, ~${(p.palavrasArquivo/1000).toFixed(0)}k no arquivo)`)
}
console.log(`\n+ 00-INSTRUCOES.md (persona e regras)`)
console.log(`+ 01-INDICE-GERAL.md (mapa do acervo)`)
console.log(`\nTotal de fontes: ${partesGeradas.length + 2}`)
