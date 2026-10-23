// frontmatter.ts — parser e serializador do subconjunto YAML usado nas leis (v1.1).
// Suporta: escalares, arrays em bloco (- item) e arrays inline ([a, b]).
// Não é um parser YAML completo — é intencionalmente pequeno e previsível.

export type FmScalar = string | number | boolean
export type FmValue = FmScalar | string[]
export type Frontmatter = Record<string, FmValue>

/** Ordem canônica dos campos ao serializar. Campos desconhecidos vão ao fim. */
const ORDER = [
  "id", "ref", "tipo", "numero", "ano", "cidade", "estado", "esfera",
  "status", "data_vigencia", "revogada_em", "titulo", "ementa", "observacoes",
  "aliases", "palavras_chave", "tags", "palavras_chave_auto", "tags_auto", "url_fonte", "fonte_nome",
  "coletado_em", "validado_em", "sha256_raw", "referencias", "versao_formato",
]

export function parseFrontmatter(content: string): { data: Frontmatter; body: string } {
  const text = content.replace(/\r\n/g, "\n")
  if (!text.startsWith("---\n")) return { data: {}, body: text }
  const end = text.indexOf("\n---", 4)
  if (end === -1) return { data: {}, body: text }
  const fmRaw = text.slice(4, end)
  let bodyStart = end + 4
  if (text[bodyStart] === "\n") bodyStart++
  const body = text.slice(bodyStart).replace(/^\n+/, "")
  return { data: parseYamlSubset(fmRaw), body }
}

function parseYamlSubset(raw: string): Frontmatter {
  const data: Frontmatter = {}
  let pendingArrayKey: string | null = null
  for (const line of raw.split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue
    const isItem = /^\s+-\s?/.test(line)
    if (isItem && pendingArrayKey) {
      const item = line.replace(/^\s+-\s?/, "").trim()
      const arr = (data[pendingArrayKey] as string[]) ?? []
      arr.push(unquote(item))
      data[pendingArrayKey] = arr
      continue
    }
    const m = /^([\w.-]+):\s*(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]
    const rest = m[2].trim()
    if (rest === "") {
      pendingArrayKey = key
      data[key] = []
      continue
    }
    pendingArrayKey = null
    if (rest.startsWith("[")) {
      data[key] = parseInlineArray(rest)
    } else {
      data[key] = parseScalar(rest)
    }
  }
  // Chaves que ficaram como array vazio mas não receberam itens: tornam-se "".
  for (const k of Object.keys(data)) {
    if (Array.isArray(data[k]) && (data[k] as string[]).length === 0) data[k] = ""
  }
  return data
}

function parseInlineArray(rest: string): string[] {
  const inner = rest.replace(/^\[/, "").replace(/\].*$/, "")
  if (inner.trim() === "") return []
  return inner.split(",").map((s) => unquote(s.trim())).filter((s) => s !== "")
}

function parseScalar(v: string): FmScalar {
  const s = unquote(v)
  if (/^-?\d+$/.test(s)) return parseInt(s, 10)
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s)
  if (s === "true") return true
  if (s === "false") return false
  return s
}

function unquote(s: string): string {
  const t = s.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\")
  }
  return t
}

export function serializeFrontmatter(data: Frontmatter, body: string): string {
  const keys = [
    ...ORDER.filter((k) => data[k] !== undefined && data[k] !== null && data[k] !== ""),
    ...Object.keys(data).filter(
      (k) => !ORDER.includes(k) && data[k] !== undefined && data[k] !== null && data[k] !== "",
    ),
  ]
  const lines: string[] = ["---"]
  for (const k of keys) {
    const v = data[k]
    if (Array.isArray(v)) {
      lines.push(`${k}:`)
      for (const item of v) lines.push(`  - ${formatString(String(item))}`)
    } else {
      lines.push(`${k}: ${formatScalar(v)}`)
    }
  }
  lines.push("---", "")
  return lines.join("\n") + body.replace(/\s+$/, "") + "\n"
}

function formatScalar(v: FmScalar): string {
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return formatString(v)
}

function formatString(s: string): string {
  const needsQuote =
    s === "" ||
    s !== s.trim() ||
    /^[0-9]/.test(s) ||
    /[:#\[\]{}&*!|>'"%@`,]/.test(s) ||
    /^(true|false|null|~)$/i.test(s)
  if (!needsQuote) return s
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

/** Converte um valor de frontmatter (possivelmente escalar) em lista de strings. */
export function asArray(v: FmValue | undefined): string[] {
  if (v === undefined || v === null) return []
  if (Array.isArray(v)) return v.map(String).filter((s) => s !== "")
  if (v === "") return []
  return [String(v)]
}
