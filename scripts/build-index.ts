// build-index.ts — constrói o índice BM25 (comprimido) a partir das leis.
import { join, relative, resolve } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { readText, walkMarkdown, parseArgs } from "./lib/io.ts"
import { parseFrontmatter, asArray } from "./lib/frontmatter.ts"
import { buildIndex, serializeIndex } from "./lib/bm25.ts"
import type { IndexRecord } from "./lib/bm25.ts"

const args = parseArgs(process.argv.slice(2))
const lawsDir = resolve(args.laws ?? "leis")
const idxDir = resolve(args.idx ?? "idx")
const outPath = join(idxDir, "bm25.index.json.gz")

const files = await walkMarkdown(lawsDir)
const records: IndexRecord[] = []

for (const file of files) {
  const content = await readText(file)
  const { data, body } = parseFrontmatter(content)
  records.push({
    meta: {
      id: String(data.id ?? ""),
      ref: String(data.ref ?? ""),
      path: relative(lawsDir, file),
      titulo: String(data.titulo ?? ""),
    },
    fields: {
      ref: String(data.ref ?? ""),
      titulo: String(data.titulo ?? ""),
      ementa: String(data.ementa ?? ""),
      aliases: asArray(data.aliases).join(" "),
      palavras_chave: [...asArray(data.palavras_chave), ...asArray(data.palavras_chave_auto)].join(" "),
      tags: [...asArray(data.tags), ...asArray(data.tags_auto)].join(" "),
      body,
    },
  })
}

const index = buildIndex(records)
const buf = serializeIndex(index)
await mkdir(idxDir, { recursive: true })
await writeFile(outPath, buf)

console.log(
  `index: ${index.N} docs | ${Object.keys(index.terms).length} termos | ` +
    `avgdl ${index.avgdl.toFixed(1)} | ${(buf.length / 1024).toFixed(0)} KB → ${outPath}`,
)
