// search.ts — consulta o índice BM25 e mostra os trechos mais relevantes.
// Uso: node --experimental-strip-types scripts/search.ts --q "deslizamento" --k 10
import { join, resolve } from "node:path"
import { readFile } from "node:fs/promises"
import { readText, parseArgs } from "./lib/io.ts"
import { deserializeIndex, searchIndex } from "./lib/bm25.ts"
import { fold } from "./lib/text.ts"

const args = parseArgs(process.argv.slice(2))
const query = args.q ?? args.query ?? ""
const k = parseInt(args.k ?? "10", 10)
const idxDir = resolve(args.idx ?? "idx")
const lawsDir = resolve(args.laws ?? "leis")
const asJson = args.json === "true"

if (!query) {
  console.error('uso: search.ts --q "sua consulta" [--k 10] [--laws leis] [--idx idx] [--json]')
  process.exit(1)
}

const buf = await readFile(join(idxDir, "bm25.index.json.gz"))
const index = deserializeIndex(buf)
const results = searchIndex(index, query, k)

async function snippet(relPath: string, terms: string[]): Promise<string> {
  let text = ""
  try {
    text = await readText(join(lawsDir, relPath))
  } catch {
    return ""
  }
  // Pula o bloco de frontmatter para não retornar metadados como "trecho".
  let lines = text.split("\n")
  if (lines[0] === "---") {
    const close = lines.indexOf("---", 1)
    if (close !== -1) lines = lines.slice(close + 1)
  }
  let best = ""
  let bestScore = 0
  for (const line of lines) {
    const l = fold(line)
    const score = terms.reduce((acc, t) => acc + (l.includes(t) ? 1 : 0), 0)
    if (score > bestScore && line.trim().length > 10) {
      bestScore = score
      best = line.trim()
    }
  }
  return best.length > 260 ? best.slice(0, 257) + "…" : best
}

const terms = [...new Set(fold(query).match(/[a-z0-9]+/g) ?? [])]
type Resultado = {
  pos: number
  score: number
  id: string
  ref: string
  titulo: string
  path: string
  trecho: string
}
const out: Resultado[] = []
for (let i = 0; i < results.length; i++) {
  const { doc, score } = results[i]
  const meta = index.docs[doc]
  const snip = await snippet(meta.path, terms)
  out.push({ pos: i + 1, score: Number(score.toFixed(3)), id: meta.id, ref: meta.ref, titulo: meta.titulo, path: meta.path, trecho: snip })
}

if (asJson) {
  console.log(JSON.stringify(out, null, 2))
} else {
  console.log(`consulta: "${query}" — ${results.length} resultado(s)\n`)
  for (const r of out) {
    console.log(`${r.pos}. [${r.score}] ${r.ref || r.id}`)
    console.log(`   ${r.titulo}`)
    console.log(`   ${r.path}`)
    if (r.trecho) console.log(`   › ${r.trecho}`)
    console.log()
  }
}
