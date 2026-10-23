// build-manifest.ts — gera manifest.jsonl (1 linha por lei) para busca/filtragem rápida.
import { join, relative, resolve } from "node:path"
import { readText, walkMarkdown, writeText, parseArgs } from "./lib/io.ts"
import { parseFrontmatter, asArray } from "./lib/frontmatter.ts"

const args = parseArgs(process.argv.slice(2))
const lawsDir = resolve(args.laws ?? "leis")
const idxDir = resolve(args.idx ?? "idx")
const outPath = join(idxDir, "manifest.jsonl")

const files = await walkMarkdown(lawsDir)
const lines: string[] = []

for (const file of files) {
  const content = await readText(file)
  const { data } = parseFrontmatter(content)
  const rec = {
    id: data.id ?? "",
    ref: data.ref ?? "",
    tipo: data.tipo ?? "",
    numero: data.numero ?? null,
    ano: data.ano ?? null,
    cidade: data.cidade ?? "",
    estado: data.estado ?? "",
    status: data.status ?? "",
    data_vigencia: data.data_vigencia ?? null,
    titulo: data.titulo ?? "",
    ementa: data.ementa ?? "",
    aliases: asArray(data.aliases),
    palavras_chave: [...asArray(data.palavras_chave), ...asArray(data.palavras_chave_auto)],
    tags: [...asArray(data.tags), ...asArray(data.tags_auto)],
    url_fonte: data.url_fonte ?? "",
    path: relative(lawsDir, file),
  }
  lines.push(JSON.stringify(rec))
}

await writeText(outPath, lines.join("\n") + (lines.length ? "\n" : ""))
console.log(`manifest: ${lines.length} registros → ${outPath}`)
