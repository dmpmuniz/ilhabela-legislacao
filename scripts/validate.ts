// validate.ts — relatório de saúde do corpus. Não altera arquivos.
import { join, relative, resolve } from "node:path"
import { readText, walkMarkdown, writeJson, parseArgs } from "./lib/io.ts"
import { parseFrontmatter, asArray } from "./lib/frontmatter.ts"
import { TIPOS, STATUS } from "./lib/normalize.ts"

type Level = "erro" | "aviso" | "qualidade"
type Issue = { file: string; field: string; msg: string; level: Level }

const args = parseArgs(process.argv.slice(2))
const lawsDir = resolve(args.laws ?? "leis")
const reportPath = args.report ? resolve(args.report) : resolve(args.idx ?? "idx", "validate-report.json")

const files = await walkMarkdown(lawsDir)
const issues: Issue[] = []
const ids = new Map<string, string[]>()
const refs = new Map<string, string[]>()
const byStatus: Record<string, number> = {}
const byTipo: Record<string, number> = {}
let semFrontmatter = 0

for (const file of files) {
  const relp = relative(lawsDir, file)
  const content = await readText(file)
  if (!content.startsWith("---")) {
    semFrontmatter++
    issues.push({ file: relp, field: "-", msg: "sem frontmatter", level: "erro" })
    continue
  }
  const { data } = parseFrontmatter(content)
  const id = String(data.id ?? "")
  const ref = String(data.ref ?? "")
  const tipo = String(data.tipo ?? "")
  const status = String(data.status ?? "")
  const ementa = String(data.ementa ?? "")
  const numero = data.numero
  const ano = Number(data.ano)
  const sha = String(data.sha256_raw ?? "")

  if (!id) issues.push({ file: relp, field: "id", msg: "campo ausente", level: "erro" })
  else (ids.get(id) ?? ids.set(id, []).get(id)!).push(relp)

  if (!ref) issues.push({ file: relp, field: "ref", msg: "campo ausente", level: "aviso" })
  else (refs.get(ref) ?? refs.set(ref, []).get(ref)!).push(relp)

  // Tipo: erro só se vazio; valores não padronizados são qualidade (dados de origem)
  if (!tipo) {
    issues.push({ file: relp, field: "tipo", msg: "campo ausente", level: "erro" })
  } else if (!(TIPOS as readonly string[]).includes(tipo)) {
    issues.push({ file: relp, field: "tipo", msg: `não padronizado: "${tipo}"`, level: "qualidade" })
  } else {
    byTipo[tipo] = (byTipo[tipo] ?? 0) + 1
  }

  if (!(STATUS as readonly string[]).includes(status)) {
    issues.push({ file: relp, field: "status", msg: `valor inválido: "${status}"`, level: "aviso" })
  } else {
    byStatus[status] = (byStatus[status] ?? 0) + 1
  }

  // `2000/A` é válido: o sufixo de emenda distingue dois atos de mesmo número.
  const numeroOk =
    (typeof numero === "number" && Number.isFinite(numero)) ||
    /^\d{1,6}(?:\/[A-Za-z]{1,3})?$/.test(String(numero))
  if (!numeroOk) {
    issues.push({ file: relp, field: "numero", msg: `não numérico: "${String(numero)}"`, level: "qualidade" })
  }
  if (!Number.isFinite(ano) || ano < 1900 || ano > 2100) {
    issues.push({ file: relp, field: "ano", msg: `fora de 1900-2100: "${String(data.ano)}"`, level: "qualidade" })
  }
  if (ementa.length < 10) {
    issues.push({ file: relp, field: "ementa", msg: "ausente ou curta", level: "aviso" })
  }
  if (!data.cidade) issues.push({ file: relp, field: "cidade", msg: "ausente", level: "aviso" })
  if (!data.estado) issues.push({ file: relp, field: "estado", msg: "ausente", level: "aviso" })
  if (sha && !/^[a-f0-9]{64}$/.test(sha)) {
    issues.push({ file: relp, field: "sha256_raw", msg: "não é hex de 64 chars", level: "aviso" })
  }
  if (!data.versao_formato) {
    issues.push({ file: relp, field: "versao_formato", msg: "ausente (rode enrich)", level: "aviso" })
  }
  if (asArray(data.aliases).length === 0) {
    issues.push({ file: relp, field: "aliases", msg: "vazio (rode enrich)", level: "aviso" })
  }
}

for (const [id, list] of ids) {
  if (list.length > 1) {
    for (const f of list) issues.push({ file: f, field: "id", msg: `duplicado: ${id}`, level: "erro" })
  }
}
for (const [ref, list] of refs) {
  if (list.length > 1) {
    for (const f of list) issues.push({ file: f, field: "ref", msg: `duplicado: ${ref}`, level: "erro" })
  }
}

const erros = issues.filter((i) => i.level === "erro").length
const avisos = issues.filter((i) => i.level === "aviso").length
const qualidade = issues.filter((i) => i.level === "qualidade").length

const report = {
  gerado_em: new Date().toISOString(),
  dir: lawsDir,
  total_arquivos: files.length,
  sem_frontmatter: semFrontmatter,
  ids_unicos: ids.size,
  refs_unicos: refs.size,
  por_status: byStatus,
  por_tipo: byTipo,
  total_erros: erros,
  total_avisos: avisos,
  total_qualidade: qualidade,
  amostra_problemas: issues.slice(0, 100),
}

await writeJson(reportPath, report)

console.log(`validate: ${files.length} arquivos | erros ${erros} | avisos ${avisos} | qualidade ${qualidade}`)
if (Object.keys(byStatus).length) console.log("  status:", byStatus)
if (Object.keys(byTipo).length) console.log("  tipo:  ", byTipo)
for (const i of issues.slice(0, 15)) {
  console.log(`  [${i.level}] ${i.file} :: ${i.field} — ${i.msg}`)
}
if (issues.length > 15) console.log(`  … +${issues.length - 15} (relatório completo em ${reportPath})`)
console.log(`relatório: ${reportPath}`)