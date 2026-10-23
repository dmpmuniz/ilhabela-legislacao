// text.ts — normalização de texto, stopwords pt-BR e tokenização para BM25.

/** Remove acentos e coloca em minúsculas. Base de toda comparação lexical. */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/** Stopwords pt-BR já sem acentos (compatíveis com fold()). */
export const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "ao", "aos", "aquela", "aquelas", "aquele", "aqueles", "aquilo", "as", "ate",
  "com", "como", "da", "das", "de", "dela", "delas", "dele", "deles", "depois", "do",
  "dos", "e", "ela", "elas", "ele", "eles", "em", "entre", "era", "eram", "essa",
  "essas", "esse", "esses", "esta", "estas", "este", "estes", "eu", "foi", "foram",
  "ha", "isso", "isto", "ja", "lhe", "lhes", "mais", "mas", "me", "mesmo", "meu",
  "meus", "minha", "minhas", "muito", "muita", "muitas", "muitos", "na", "nas", "nao",
  "no", "nos", "nossa", "nossas", "nosso", "nossos", "num", "numa", "o", "os", "ou",
  "para", "pela", "pelas", "pelo", "pelos", "por", "qual", "quando", "que", "quem",
  "se", "sem", "seu", "seus", "so", "sob", "sobre", "sua", "suas", "tambem", "te",
  "tem", "tendo", "tenho", "ter", "teu", "teus", "tua", "tuas", "um", "uma", "umas",
  "uns", "voce", "voces", "ainda", "apos", "cada", "contra", "desde", "durante",
  "entao", "etc", "la", "nada", "nenhum", "nessa", "nessas", "nesse", "nesses",
  "nesta", "nestas", "neste", "nestes", "ninguem", "ora", "outra", "outras", "outro",
  "outros", "quais", "qualquer", "seja", "ser", "serem", "somente", "todas", "todavia",
  "todo", "todos", "tudo", "vez", "vos", "tais", "tal", "pois", "porque", "porem",
  "portanto", "assim", "embora", "conforme", "mediante", "atraves", "referente",
  "referentes", "termos", "forma", "disposicoes", "demais", "presentes", "seguintes",
  "deste", "desta", "destes", "destas", "desse", "dessa", "disso", "nisto", "art",
  "arts", "inciso", "incisos", "paragrafo", "paragrafos", "alinea", "alineas",
])

/**
 * Stemmer conservador para pt-BR. Depois de fold(), trata plural e alguns plurais
 * irregulares. Evita over-stemming: prefere não reduzir a reduzir demais.
 */
export function stem(w: string): string {
  let s = w
  if (s.length <= 3) return s
  if (s.endsWith("mente") && s.length > 7) return s.slice(0, -5)
  if (s.endsWith("coes") && s.length > 5) return s.slice(0, -4) + "cao"
  if (s.endsWith("oes") && s.length > 4) return s.slice(0, -3) + "ao"
  if (s.endsWith("aes") && s.length > 4) return s.slice(0, -3) + "ao"
  if (s.endsWith("ais") && s.length > 4) return s.slice(0, -3) + "al"
  if (s.endsWith("eis") && s.length > 4) return s.slice(0, -3) + "el"
  if (s.endsWith("ns") && s.length > 4) return s.slice(0, -2) + "m"
  if (s.endsWith("s") && s.length > 4 && !s.endsWith("ss") && !s.endsWith("us")) {
    return s.slice(0, -1)
  }
  return s
}

export function tokenize(text: string): string[] {
  const raw = fold(text).match(/[a-z0-9]+/g) ?? []
  const out: string[] = []
  for (const t of raw) {
    if (t.length < 2 || STOPWORDS.has(t)) continue
    const s = stem(t)
    if (s.length >= 2) out.push(s)
  }
  return out
}

/** Normaliza uma string para busca por substring (fold + espaços simples). */
export function matchKey(s: string): string {
  return fold(s).replace(/\s+/g, " ").trim()
}

/** Testa se `term` (já normalizado por matchKey) aparece como palavra/frase inteira. */
export function containsTerm(haystack: string, term: string): boolean {
  if (!term) return false
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`(?:^|[^a-z0-9])${esc}(?:[^a-z0-9]|$)`)
  return re.test(haystack)
}
