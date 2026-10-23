// bm25.ts — índice invertido BM25 com campos ponderados. Sem dependências externas.
import { gzipSync, gunzipSync } from "node:zlib"
import { tokenize } from "./text.ts"

export type DocMeta = { id: string; ref: string; path: string; titulo: string }
export type Posting = [doc: number, tf: number]

export type Bm25Index = {
  version: string
  k1: number
  b: number
  N: number
  avgdl: number
  fieldWeights: Record<string, number>
  dl: number[]
  df: Record<string, number>
  terms: Record<string, Posting[]>
  docs: DocMeta[]
}

/**
 * Pesos por campo. Campos de metadados valem mais que o corpo, porque um termo
 * no título/ementa/palavra-chave é muito mais informativo que no texto corrido.
 */
export const FIELD_WEIGHTS: Record<string, number> = {
  ref: 2,
  titulo: 3,
  ementa: 3,
  aliases: 4,
  palavras_chave: 4,
  tags: 3,
  body: 1,
}

export type IndexRecord = { meta: DocMeta; fields: Record<string, string> }

export function buildIndex(
  records: IndexRecord[],
  opts?: { k1?: number; b?: number },
): Bm25Index {
  const k1 = opts?.k1 ?? 1.2
  const b = opts?.b ?? 0.75
  const docs: DocMeta[] = []
  const dl: number[] = []
  const tfPerDoc: Array<Map<string, number>> = []

  for (const rec of records) {
    const tf = new Map<string, number>()
    let len = 0
    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      const text = rec.fields[field]
      if (!text) continue
      for (const token of tokenize(text)) {
        tf.set(token, (tf.get(token) ?? 0) + weight)
        len += weight
      }
    }
    docs.push(rec.meta)
    tfPerDoc.push(tf)
    dl.push(len)
  }

  const N = docs.length
  const avgdl = N === 0 ? 0 : dl.reduce((a, x) => a + x, 0) / N
  const terms: Record<string, Posting[]> = {}
  const df: Record<string, number> = {}

  for (let d = 0; d < N; d++) {
    for (const [term, tf] of tfPerDoc[d]) {
      ;(terms[term] ??= []).push([d, tf])
      df[term] = (df[term] ?? 0) + 1
    }
  }

  return { version: "1.0", k1, b, N, avgdl, fieldWeights: FIELD_WEIGHTS, dl, df, terms, docs }
}

export function searchIndex(
  index: Bm25Index,
  query: string,
  k = 10,
): Array<{ doc: number; score: number }> {
  const { N, avgdl, k1, b, df, terms, dl } = index
  const queryTerms = [...new Set(tokenize(query))]
  const scores = new Map<number, number>()

  for (const term of queryTerms) {
    const postings = terms[term]
    if (!postings) continue
    const n = df[term]
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
    for (const [d, tf] of postings) {
      const norm = 1 - b + b * (dl[d] / (avgdl || 1))
      const s = idf * ((tf * (k1 + 1)) / (tf + k1 * norm))
      scores.set(d, (scores.get(d) ?? 0) + s)
    }
  }

  return [...scores.entries()]
    .map(([doc, score]) => ({ doc, score }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

export function serializeIndex(index: Bm25Index): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(index), "utf8"), { level: 9 })
}

export function deserializeIndex(buf: Buffer): Bm25Index {
  return JSON.parse(gunzipSync(buf).toString("utf8")) as Bm25Index
}
