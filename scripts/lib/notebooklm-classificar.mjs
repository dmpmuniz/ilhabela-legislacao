// Classificação temática do export NotebookLM.
//
// Fica fora do gerador para ser testável sem varrer as 35.776 normas: cada
// regra abaixo nasceu de um caso real do acervo (ver notebooklm-classificar.test.ts).

// frontmatter pode devolver número em campo textual ("ementa: 1"); coage sempre
export const fold = (s) => String(s ?? '').normalize('NFD').toLowerCase().replace(/[\u0300-\u036f]/g, '')

// Subtipos de portaria (para agrupar por tema)
export const SUBTIPO_PORTARIA = (ementa) => {
  const e = fold(ementa)
  if (/readapta/.test(e)) return 'readaptacao'
  // PAD e sindicância são o mesmo tema disciplinar; vêm antes de nomeação
  // para não perder o caso "PAD ... e nomeia" (não há, mas a ordem é a regra).
  if (/processo administrativo disciplinar|sindicancia/.test(e)) return 'disciplinar'
  if (/nomeia|nomeacao/.test(e)) return 'nomeacao'
  if (/exonera|exoneracao|dispensa/.test(e)) return 'exoneracao'
  if (/ferias|licenca|afastamento|abono|faltas/.test(e)) return 'ferias-licenca'
  if (/designa|designacao|substitui|comissao/.test(e)) return 'designacao'
  // 356 "adicional por tempo de serviço" + 2 insalubridade estavam no catch-all
  if (/gratifica|premio|retribui|adicional/.test(e)) return 'gratificacao'
  // 228 ementas de provimento/posse/demissão: o rótulo antigo "concurso" era
  // impreciso (0 ementas dizem "concurso").
  if (/provimento|posse|demissao|selecao/.test(e)) return 'provimento'
  if (/aposenta|aposentadoria|pensao/.test(e)) return 'aposentadoria'
  if (/seguranca|vigilancia|patrimonial/.test(e)) return 'seguranca'
  if (/obras|servicos|manutencao|construcao/.test(e)) return 'obras'
  if (/educacao|escola|cultura|esporte|biblioteca/.test(e)) return 'educacao-cultura'
  if (/meio ambiente|arvore|vegetacao|ambiental/.test(e)) return 'meio-ambiente'
  return 'outros'
}

// Determina o grupo temático de cada norma
export function classificar(fm) {
  const tipo = fold(String(fm.tipo ?? ''))
  const ementa = fold(String(fm.ementa ?? ''))
  const status = fold(String(fm.status ?? ''))

  // Lei Orgânica e Estatuto: "constituições" locais, sempre primeiro.
  // O documento da LO já traz as emendas consolidadas no texto — não há
  // emendas como arquivos separados no Cespro. Citar "a Lei Orgânica" na
  // ementa NÃO classifica aqui (dezenas de normas só a citam de passagem).
  if (tipo.startsWith('lei_org') || tipo === 'emenda') return 'lei-organica'
  if (tipo === 'lei_complementar' && /estatuto|servidores/.test(ementa)) return 'estatuto'
  if (/estatuto dos servidores/.test(ementa)) return 'estatuto'

  // Fora de vigor: separado para não poluir busca de normas vigentes.
  // Fusões: anulada+inconstitucional+suspensa são 23 normas → junto das expiradas;
  // LCs revogadas são 5 → junto das leis revogadas.
  if (['revogada', 'expirada', 'anulada', 'inconstitucional', 'suspensa'].includes(status)) {
    if (status === 'revogada') return tipo === 'lei_complementar' ? 'revogada-lei' : `revogada-${tipo}`
    return 'fora-vigor-expirada'
  }

  if (tipo === 'portaria') {
    const sub = SUBTIPO_PORTARIA(fm.ementa)
    // nomeação e exoneração têm a mesma natureza (ato de pessoal) → juntas
    if (sub === 'nomeacao' || sub === 'exoneracao') return 'portaria-nomeacao-exoneracao'
    // subtipos raros (<50 normas) → portaria-outros
    if (['aposentadoria', 'obras', 'educacao-cultura', 'seguranca', 'meio-ambiente'].includes(sub)) return 'portaria-outros'
    return `portaria-${sub}`
  }

  if (tipo === 'portaria_conjunta' || tipo === 'resolucao') return 'resolucoes-atos-especiais'

  if (tipo === 'lei_complementar') return `lei_complementar`

  if (tipo === 'lei') return `lei`

  if (tipo === 'decreto') {
    // 1.845 decretos de exoneração estavam nos decretos gerais; nomeação e
    // exoneração são a mesma natureza (ato de pessoal), como nas portarias.
    if (/nomeia|nomeacao|nomeado|exonera|exoneracao/.test(ementa)) return 'decreto-nomeacao'
    return 'decreto'
  }

  // tipo fora do esquema (ex.: registro histórico de 1805) → atos especiais
  return 'resolucoes-atos-especiais'
}
