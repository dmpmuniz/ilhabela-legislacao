// ingest.ts — ingestão do pacote bruto de legislação para o corpus.
//
// O pacote do fornecedor (ex.: legislacao_ilhabela/) traz fontes cruas, não os
// .md do schema v1.1:
//   <origem>/{decretos,leis,outros,portarias}/*.txt — texto integral + um
//     frontmatter mínimo (id, titulo, tipo, numero, ano, status, ementa);
//   <origem>/raw/<tipo>/<id>.json  — metadados da raspagem (url), só de parte;
//   <origem>/index/listing.json    — listagem completa do portal (cobre 100%).
//
// Este passo converte CADA .txt para .md em <destino>/ (leis/), completando o
// frontmatter com url_fonte (raw JSON → listing), cidade/estado/esfera,
// coletado_em e sha256_raw (hash do .txt original). A normalização fina de
// tipo/status/numero/ref/aliases fica com `enrich` — cada script uma coisa.
//
// É idempotente: .md já existente em <destino> com o mesmo id é mantido
// (reexecutar não duplica); id diferente no mesmo nome é erro explícito.
//
// Também é uma FUNÇÃO (`ingerirPacote`): `atualizar.ts` a chama automaticamente
// quando encontra um pacote solto na raiz — um único comando faz tudo, e o
// usuário não precisa lembrar da ordem dos passos.
import { join, resolve, basename } from "node:path"
import { readdir } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import {
  readText, writeText, readJson, parseArgs, sha256,
} from "./lib/io.ts"
import { parseFrontmatter, serializeFrontmatter } from "./lib/frontmatter.ts"
import { completarFrontmatter } from "./lib/norma-doc.ts"

/** Pastas do pacote que guardam os .txt por tipo de ato. */
const PASTAS_TXT = ["decretos", "leis", "outros", "portarias"]
const SITE = "https://www.cespro.com.br"

export type ResultadoIngerir = {
  convertidos: number
  mantidos: number
  semUrl: number
  erros: number
  problemas: string[]
  /** ids presentes no destino depois da ingestão (para o sync não baixá-los) */
  ids: string[]
}

export type OpcoesIngerir = {
  cidade?: string
  estado?: string
  esfera?: string
}

/** Converte o pacote bruto inteiro em .md do corpus. Idempotente. */
export async function ingerirPacote(
  origem: string,
  destino: string,
  opcoes: OpcoesIngerir = {},
): Promise<ResultadoIngerir> {
  const cidade = opcoes.cidade ?? "Ilhabela"
  const estado = opcoes.estado ?? "SP"
  const esfera = opcoes.esfera ?? "municipal"
  const hoje = new Date().toISOString().slice(0, 10)

  // url_fonte: raw JSON (quando existe) → listing (cobre a totalidade).
  // O listing traz link relativo ("/visualizarDiploma.php?...") — prefixa o domínio.
  const urls = new Map<string, string>()
  const listing = await readJson<Array<{ id?: string; ds_link?: string }>>(
    join(origem, "index", "listing.json"), [],
  )
  for (const item of listing) {
    const id = String(item.id ?? "")
    if (!id) continue
    let link = String(item.ds_link ?? "")
    if (!link) continue
    if (link.startsWith("/")) link = SITE + link
    urls.set(id, link)
  }
  for (const pasta of PASTAS_TXT) {
    const dir = join(origem, "raw", pasta)
    let entries: string[] = []
    try { entries = await readdir(dir) } catch { continue }
    for (const nome of entries) {
      if (!nome.endsWith(".json")) continue
      const meta = await readJson<{ id?: string | number; url?: string }>(join(dir, nome), {})
      const id = String(meta.id ?? "")
      if (id && meta.url) urls.set(id, meta.url) // raw JSON prevalece sobre o listing
    }
  }

  let convertidos = 0, mantidos = 0, semUrl = 0, erros = 0
  const problemas: string[] = []
  const ids: string[] = []

  for (const pasta of PASTAS_TXT) {
    const dir = join(origem, pasta)
    let entries: string[] = []
    try { entries = await readdir(dir) } catch { continue }

    for (const nome of entries.sort()) {
      if (!nome.toLowerCase().endsWith(".txt")) continue
      try {
        const origemArq = join(dir, nome)
        const cru = await readText(origemArq)
        const { data: fm, body } = parseFrontmatter(cru)

        const id = String(fm.id ?? "")
        if (!id) throw new Error("frontmatter sem id")
        if (!fm.titulo || !fm.ementa) throw new Error("frontmatter sem titulo/ementa")
        ids.push(id)

        const url = urls.get(id)
        if (!url) semUrl++

        const saida = join(destino, basename(nome).replace(/\.txt$/i, ".md"))

        // Idempotência: destino já existe — mesmo id é mantido (nada a fazer);
        // id divergente é colisão de nome de arquivo e precisa ser resolvida à mão.
        try {
          const existente = await readText(saida)
          const { data: fmExistente } = parseFrontmatter(existente)
          if (String(fmExistente.id ?? "") === id) { mantidos++; continue }
          throw new Error(`colisão: ${basename(saida)} já existe com id ${fmExistente.id} (novo id ${id})`)
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e
        }

        const md = serializeFrontmatter(completarFrontmatter(fm, {
          cidade, estado, esfera,
          url,
          coletadoEm: hoje,
          sha256: sha256(cru),
        }), body)
        await writeText(saida, md)
        convertidos++
      } catch (err) {
        erros++
        problemas.push(`${pasta}/${nome}: ${(err as Error).message}`)
      }
    }
  }

  return { convertidos, mantidos, semUrl, erros, problemas, ids }
}

// ---------------------------------------------------------------------------
// CLI (`npm run ingest`) — a mesma capacidade, para uso manual.
// ---------------------------------------------------------------------------

const invocadoDireto = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (invocadoDireto) {
  const args = parseArgs(process.argv.slice(2))
  const r = await ingerirPacote(
    resolve(args.origem ?? "legislacao_ilhabela"),
    resolve(args.destino ?? "leis"),
    {
      cidade: args.cidade,
      estado: args.estado,
      esfera: args.esfera,
    },
  )
  console.log(
    `ingest: ${r.convertidos} convertidos | ${r.mantidos} já existentes (mantidos) | ` +
    `${r.semUrl} sem url_fonte | ${r.erros} erros`,
  )
  for (const p of r.problemas.slice(0, 15)) console.log(`  erro: ${p}`)
  if (r.problemas.length > 15) console.log(`  … +${r.problemas.length - 15}`)
  if (r.semUrl) console.log(
    `  aviso: ${r.semUrl} normas sem url_fonte (id ausente do listing e de raw/) — ` +
    `validate.ts não exige o campo, mas a citação perde a origem`,
  )
  if (r.erros > 0) process.exitCode = 1
}
