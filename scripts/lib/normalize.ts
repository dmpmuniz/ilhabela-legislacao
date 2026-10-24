// normalize.ts — normalização de campos jurídicos (tipo, status, ref, aliases).
import { fold } from "./text.ts"
import type { FmValue } from "./frontmatter.ts"

export const TIPOS = [
  "lei", "lei_complementar", "lei_organica", "decreto", "decreto_legislativo",
  "portaria", "portaria_conjunta", "resolucao", "emenda",
] as const

export const STATUS = ["em_vigor", "revogada", "inconstitucional", "suspensa", "expirada", "anulada"] as const

const TIPO_MAP: Record<string, string> = {
  LEI: "lei",
  "LEI ORDINARIA": "lei",
  "LEI ORDINÁRIA": "lei",
  "LEI MUNICIPAL": "lei",
  "LEI_MUNICIPAL": "lei",
  "LEI COMPLEMENTAR": "lei_complementar",
  "LEI_COMPLEMENTAR": "lei_complementar",
  "LEI ORGANICA": "lei_organica",
  "LEI ORGÂNICA": "lei_organica",
  // typo do portal: "lei_orgâ" (truncado) virava ref de "lei" comum
  "LEI ORGA": "lei_organica",
  "LEI ORGANICA MUNICIPAL": "lei_organica",
  "LEI ORGÂNICA MUNICIPAL": "lei_organica",
  "LEI_ORGANICA_MUNICIPAL": "lei_organica",
  DECRETO: "decreto",
  "DECRETO MUNICIPAL": "decreto",
  "DECRETO LEGISLATIVO": "decreto_legislativo",
  PORTARIA: "portaria",
  RESOLUCAO: "resolucao",
  "RESOLUÇÃO": "resolucao",
  EMENDA: "emenda",
  "EMENDA CONSTITUCIONAL": "emenda",
  "CRIADO PELA PORTARIA": "portaria",
  "CRIADO PELA PORTARIA, DE": "portaria",
  "PORTARIA CONJUNTA": "portaria_conjunta",
  "PORTARIA_CONJUNTA": "portaria_conjunta",
  "PORTARIA SAJ": "portaria",
  "PESQUISA": "portaria",
}

const STATUS_MAP: Record<string, string> = {
  "EM VIGOR": "em_vigor",
  VIGENTE: "em_vigor",
  REVOGADA: "revogada",
  REVOGADO: "revogada",
  INCONSTITUCIONAL: "inconstitucional",
  SUSPENSA: "suspensa",
  SUSPENSO: "suspensa",
  // vigência finda SEM revogação (termo final / efeitos cessados)
  "VIGENCIA ESGOTADA": "expirada",
  "EFEITOS CESSADOS": "expirada",
  ANULADA: "anulada",
}

function upperKey(v: FmValue): string {
  return fold(String(v)).toUpperCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
}

export function normalizeTipo(v: FmValue | undefined): string {
  if (v === undefined || v === null || v === "") return ""
  const direct = String(v).trim().toLowerCase().replace(/[\s-]+/g, "_")
  if ((TIPOS as readonly string[]).includes(direct)) return direct
  const mapped = TIPO_MAP[upperKey(v)]
  if (mapped) return mapped
  return direct
}

/**
 * Recupera o tipo a partir do texto do título (`PORTARIA CONJUNTA Nº 001, DE …`).
 * Necessário porque `enrich` já havia gravado `tipo: portaria` nessas normas em
 * execuções antigas, e o campo não carrega mais a informação original.
 */
export function parseTipoTitulo(titulo: unknown): string | null {
  const s = String(titulo ?? "").trim()
  if (!s) return null
  const m = s.match(/^(.*?)\s*n[º°]\s*\d/i)
  const prefixo = (m ? m[1] : "").trim()
  if (!prefixo) return null
  const mapped = TIPO_MAP[upperKey(prefixo)]
  if (mapped) return mapped
  const norm = normalizeTipo(prefixo)
  return (TIPOS as readonly string[]).includes(norm) ? norm : null
}

/**
 * Tipo definitivo do documento. O `fallback` (campo já gravado) vale quando já
 * é um tipo padrão; caso contrário recupera-se do título — cobre normas cujo
 * tipo específico foi colapsado por execuções antigas do `enrich`.
 */
export function resolveTipo(opts: {
  titulo?: unknown
  arquivo?: unknown
  fallback?: FmValue
}): string {
  const bruto = normalizeTipo(opts.fallback)
  // O título é a fonte autoritativa da natureza do ato. O campo `tipo` já
  // havia sido colapsado ("Portaria Conjunta" → "portaria") por execuções
  // antigas do enrich, e isso fazia atos distintos dividirem a mesma ref.
  // Sobre o corpus inteiro, esta regra altera apenas 9 — todos
  // portarias conjuntas.
  return parseTipoTitulo(opts.titulo) ?? bruto
}

export function normalizeStatus(v: FmValue | undefined): string {
  if (v === undefined || v === null || v === "") return "em_vigor"
  const direct = String(v).trim().toLowerCase().replace(/[\s-]+/g, "_")
  if ((STATUS as readonly string[]).includes(direct)) return direct
  return STATUS_MAP[upperKey(v)] ?? direct
}

/**
 * Normaliza o número da norma para inteiro.
 *
 * CORREÇÃO DE DADOS: grande parte do corpus trazia `numero` como float porque o
 * separador de milhar pt-BR foi lido como decimal ("Nº 10.000" virou 10.001,
 * "Nº 1.784" virou 1.784). Isso colidia `ref` (dezenas de decretos com a mesma
 * referência) e gerava aliases errados ("Decreto 10/2023" para o 10.001).
 *
 * Um float com 3 casas decimais é recuperável ("10.001" → 10001). O caso
 * "10.000" → 10 é irreversível num número: por isso `resolveNumero` consulta
 * título e nome do arquivo antes de chegar aqui.
 */
function deFloatPtBR(v: number): number {
  if (Number.isInteger(v)) return v
  const s = String(v)
  const dot = s.indexOf(".")
  if (dot < 0) return Math.round(v)
  const frac = s.slice(dot + 1)
  if (frac.length === 3) return parseInt(s.replace(".", ""), 10)
  return Math.round(v)
}

/** Converte qualquer forma de `numero` (int, float pt-BR, string) em inteiro. */
export function numeroParaInteiro(v: FmValue | undefined): number | string {
  if (v === undefined || v === null || v === "") return ""
  if (typeof v === "number") return deFloatPtBR(v)
  const s = String(v).trim()
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  // milhar pt-BR em texto: 10.000 / 1.784 / 1.234.567
  if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) return parseInt(s.replace(/\./g, ""), 10)
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : s
}

/**
 * Segmento numérico do `ref`: `1.784` → `1784`, `2000/A` → `2000a`.
 * O sufixo alfabético entra no ref porque dois atos podem dividir o mesmo
 * número (`Nº 2.000` e `Nº 2.000/A`, ambos de 22/10/2009).
 */
export function numeroRefSegmento(v: FmValue | undefined): string {
  if (v === undefined || v === null || v === "") return "0"
  const m = String(v).trim().match(/^(\d[\d.]*)\s*[-/]?\s*([a-z]{1,3})$/i)
  if (m) {
    const digits = m[1].replace(/\./g, "")
    if (/^\d+$/.test(digits)) {
      const n = parseInt(digits, 10)
      if (n > 0) return `${n}${m[2].toLowerCase()}`
    }
  }
  const parsed = numeroParaInteiro(v)
  const n = typeof parsed === "number" ? parsed : parseInt(String(parsed), 10)
  return Number.isFinite(n) && n > 0 ? String(n) : "0"
}

/**
 * Extrai o número real do texto oficial: `DECRETO MUNICIPAL Nº 10.000, DE 01/09/2023`.
 * Devolve `null` quando não há número reconhecível (não deve ser adivinhado).
 */
export function parseNumeroTitulo(titulo: unknown): number | string | null {
  const m = String(titulo ?? "").match(/n[º°]\s*(\d[\d.,]*)(?:\s*[-/]\s*([a-z]{1,3}))?/i)
  if (!m) return null
  const raw = m[1].replace(/[.,/]+$/, "")
  // `Nº 2.000/A` é outro ato que o `Nº 2.000`: o sufixo precisa sobreviver.
  const sufixo = m[2] ? `/${m[2].toUpperCase()}` : ""
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10)
    return sufixo ? `${n}${sufixo}` : n
  }
  if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) {
    const n = parseInt(raw.replace(/\./g, ""), 10)
    return sufixo ? `${n}${sufixo}` : n
  }
  return null
}

/**
 * Extrai o número do nome do arquivo: `DECRETO_MUNICIPAL_10000_2023.md`.
 * `000` é marcador de "desconhecido" e não vale como número.
 */
export function parseNumeroArquivo(caminho: unknown): number | null {
  const base = String(caminho ?? "").split(/[\\/]/).pop()?.replace(/\.md$/i, "") ?? ""
  const m = base.match(/_(\d{1,6})_(\d{4})$/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Resolve o número da norma com as fontes mais confiáveis primeiro:
 *   1. texto do título (fonte oficial);
 *   2. nome do arquivo;
 *   3. valor já presente no frontmatter (último recurso).
 *
 * No corpus real, título e nome do arquivo concordam em 99,9% dos arquivos.
 */
export function resolveNumero(opts: {
  titulo?: unknown
  arquivo?: unknown
  fallback?: FmValue
}): number | string {
  const doTitulo = parseNumeroTitulo(opts.titulo)
  if (doTitulo !== null) return doTitulo
  const doArquivo = parseNumeroArquivo(opts.arquivo)
  if (doArquivo !== null) return doArquivo
  return numeroParaInteiro(opts.fallback)
}

const TIPO_CODE: Record<string, string> = {
  lei: "lei",
  lei_complementar: "lc",
  lei_organica: "lo",
  decreto: "dec",
  decreto_legislativo: "dl",
  portaria: "port",
  // código próprio: "Portaria Conjunta nº 1/2020" não é a "Portaria nº 1/2020",
  // e o corpus as traz como atos distintos.
  portaria_conjunta: "portc",
  resolucao: "res",
  emenda: "em",
}

const TIPO_LABEL: Record<string, string> = {
  lei: "Lei",
  lei_complementar: "Lei Complementar",
  lei_organica: "Lei Orgânica",
  decreto: "Decreto",
  decreto_legislativo: "Decreto Legislativo",
  portaria: "Portaria",
  portaria_conjunta: "Portaria Conjunta",
  resolucao: "Resolução",
  emenda: "Emenda",
}

export function siglaCidade(cidade: string | undefined): string {
  const c = fold(cidade ?? "").replace(/[^a-z]/g, "")
  return c.slice(0, 3) || "leg"
}

export function makeRef(opts: {
  cidade?: string
  ano?: FmValue
  tipo: string
  numero: FmValue | undefined
}): string {
  const sig = siglaCidade(opts.cidade)
  const code = TIPO_CODE[opts.tipo] ?? (opts.tipo || "norma").slice(0, 3)
  const ano = String(opts.ano ?? "0000").replace(/\D/g, "").slice(0, 4) || "0000"
  const seg = numeroRefSegmento(opts.numero ?? "0")
  // só o trecho puramente numérico recebe zeros à esquerda ("2000a" fica como está)
  const padded = /^\d+$/.test(seg) ? seg.padStart(3, "0") : seg
  return `${sig}-${ano}-${code}-${padded}`
}

/**
 * Garante ref única quando dois diplomas compartilham número/ano (republicação
 * ou ato distinto): o segundo vira `ref-2`, o terceiro `ref-3`. Determinístico
 * porque o corpus é processado em ordem de arquivo (walkMarkdown ordena).
 */
export function refUnica(base: string, usadas: Set<string>): string {
  let ref = base
  for (let n = 2; usadas.has(ref); n++) ref = `${base}-${n}`
  usadas.add(ref)
  return ref
}

export function makeAliases(opts: {
  tipo: string
  numero: FmValue | undefined
  ano?: FmValue
}): string[] {
  const label = TIPO_LABEL[opts.tipo] ?? "Norma"
  const parsed = numeroParaInteiro(opts.numero)
  const num = typeof parsed === "number" ? parsed : NaN
  const ano = String(opts.ano ?? "").replace(/\D/g, "").slice(0, 4)
  if (!Number.isFinite(num) || num <= 0 || !ano) return []
  const padded = String(num).padStart(3, "0")
  const forms = new Set<string>([
    `${label} ${num}/${ano}`,
    `${label} nº ${num}/${ano}`,
    `${label} nº ${padded}/${ano}`,
    `${label} ${num}`,
    `${label} ${padded}`,
    // formas sem o ano: é assim que as normas são citadas e buscadas
    `${label} nº ${num}`,
    `${label} nº ${padded}`,
  ])
  if (opts.tipo === "decreto") {
    forms.add(`Decreto Municipal nº ${padded}`)
    forms.add(`Decreto Municipal ${num}`)
  }
  if (opts.tipo === "lei_complementar") {
    forms.add(`LC ${padded}/${ano}`)
    forms.add(`LC ${num}/${ano}`)
  }
  // Sufixo de emenda/alteração ("Nº 2.000/A"): sem ele, dois atos diferentes
  // geram exatamente os mesmos aliases e a busca não distingue um do outro.
  const suf = String(opts.numero ?? "").trim().match(/^[\d.]+\s*[-/]\s*([a-z]{1,3})$/i)
  if (suf) {
    const s = suf[1].toUpperCase()
    forms.add(`${label} ${num}/${s}/${ano}`)
    forms.add(`${label} ${num}/${s}`)
    forms.add(`${label} nº ${num}/${s}`)
  }
  return [...forms]
}

const MONTHS: Record<string, string> = {
  janeiro: "01", fevereiro: "02", marco: "03", abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
}

/** Extrai data de vigência de frases como "entra em vigor em 1º de janeiro de 2001". */
export function deriveDataVigencia(body: string): string | null {
  const b = fold(body)
  const m = b.match(/vigor[^.]{0,100}?(\d{1,2})\s*(?:º|o|de)?\s*([a-z]+)\s*(?:de\s*)?(\d{4})/)
  if (!m) return null
  const mm = MONTHS[m[2]]
  if (!mm) return null
  const dd = String(parseInt(m[1], 10)).padStart(2, "0")
  return `${m[3]}-${mm}-${dd}`
}

export function uniquePreserve(xs: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of xs) {
    const k = x.trim()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(k)
  }
  return out
}
