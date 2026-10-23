// enrich.ts — enriquecimento DETERMINÍSTICO do corpus (sem LLM).
// Adiciona/normaliza: tipo, status, numero, cidade/estado/esfera, ref, aliases,
// data_vigencia e palavras-chave/tags derivadas do dicionário.
// É idempotente e cacheado por hash: reexecutar não altera arquivos já tratados.
import { basename, join, resolve } from "node:path"
import {
  readText, writeText, walkMarkdown, readJson, writeJson, parseArgs, sha256, repoRoot,
} from "./lib/io.ts"
import { parseFrontmatter, serializeFrontmatter, asArray } from "./lib/frontmatter.ts"
import type { Frontmatter } from "./lib/frontmatter.ts"
import {
  normalizeTipo, normalizeStatus, resolveTipo, resolveNumero, makeRef, makeAliases,
  deriveDataVigencia, uniquePreserve, refUnica,
} from "./lib/normalize.ts"
import { matchKey, containsTerm } from "./lib/text.ts"

type Regra = { match: string[]; tags?: string[]; palavras_chave?: string[] }
type Dicionario = { regras: Regra[] }

const args = parseArgs(process.argv.slice(2))
const lawsDir = resolve(args.laws ?? "leis")
const idxDir = resolve(args.idx ?? "idx")
const cidade = args.cidade ?? "Ilhabela"
const estado = args.estado ?? "SP"
const esfera = args.esfera ?? "municipal"
const force = args.force === "true"

const dict = await readJson<Dicionario>(join(repoRoot, "scripts", "schema", "sinonimos.pt-BR.json"), { regras: [] })
const files = await walkMarkdown(lawsDir)
const cachePath = join(idxDir, "enrich-cache.json")
const cache = await readJson<Record<string, string>>(cachePath, {})

let changed = 0, unchanged = 0, skipped = 0, errors = 0
const nextCache: Record<string, string> = {}
// refs de todos os arquivos (inclusive os pulados pelo cache) para desempatar
// diplomas de mesmo número/ano: o segundo vira `ref-2` (citação sem ambiguidade).
const refsUsadas = new Set<string>()

for (const file of files) {
  try {
    const content = await readText(file)
    if (!force && cache[file] === sha256(content)) {
      // mesmo pulado, a ref existente precisa participar do desempate
      const { data } = parseFrontmatter(content)
      if (data.ref) refsUsadas.add(String(data.ref))
      nextCache[file] = cache[file]
      skipped++
      continue
    }

    const { data, body } = parseFrontmatter(content)
    const fm: Frontmatter = { ...data }

    // `tipo` e `numero` já haviam sido colapsados por execuções antigas do
    // enrich ("Portaria Conjunta" → "portaria"; "Nº 10.000" → 10), o que
    // fazia atos distintos dividirem a mesma ref e os mesmos aliases. Ambos
    // são resolvidos a partir do título oficial, nunca do valor já corrompido.
    const tipoAntigo = normalizeTipo(fm.tipo)
    const numeroAntigo = fm.numero
    fm.tipo = resolveTipo({ titulo: fm.titulo, arquivo: file, fallback: fm.tipo })
    fm.status = normalizeStatus(fm.status)
    fm.numero = resolveNumero({ titulo: fm.titulo, arquivo: file, fallback: fm.numero })

    if (typeof fm.ano === "string") fm.ano = parseInt(fm.ano, 10) || fm.ano
    fm.cidade = (fm.cidade as string) || cidade
    fm.estado = (fm.estado as string) || estado
    fm.esfera = (fm.esfera as string) || esfera
    if (!fm.id) fm.id = basename(file).replace(/\.md$/i, "")

    const tipo = String(fm.tipo)

    // `ref` é 100% derivado (cidade + ano + tipo + número) e a totalidade dos
    // refs do corpus segue esse padrão — logo, sempre regenerar é seguro e é
    // o que corrige as colisões antigas.
    fm.ref = makeRef({ cidade: String(fm.cidade), ano: fm.ano, tipo, numero: fm.numero })
    fm.ref = refUnica(fm.ref, refsUsadas)

    // Aliases: descarta apenas as formas geradas com o tipo/número antigos (as
    // escritas à mão ou vindas da fonte são preservadas) e regenera as corretas.
    const obsoletos = new Set([
      ...makeAliases({ tipo, numero: numeroAntigo, ano: fm.ano }),
      ...makeAliases({ tipo: tipoAntigo, numero: numeroAntigo, ano: fm.ano }),
    ])
    const preservados = asArray(fm.aliases).filter((a) => !obsoletos.has(String(a)))
    fm.aliases = uniquePreserve([
      ...preservados,
      ...makeAliases({ tipo, numero: fm.numero, ano: fm.ano }),
    ])

    // O dicionário casa com o ASSUNTO DECLARADO (título + ementa + aliases),
    // com fronteira de palavra — não com o corpo inteiro, para não taguear demais.
    const hay = matchKey(
      [fm.titulo, fm.ementa, fm.aliases]
        .flat()
        .filter((x) => x !== undefined && x !== null)
        .map(String)
        .join(" "),
    )
    const kws: string[] = []
    const tags: string[] = []
    for (const regra of dict.regras) {
      if (regra.match.some((m) => containsTerm(hay, matchKey(m)))) {
        kws.push(...(regra.palavras_chave ?? []))
        tags.push(...(regra.tags ?? []))
      }
    }
    // `palavras_chave_auto`/`tags_auto` são gerados e SUBSTITUÍDOS a cada execução
    // (idempotente). `palavras_chave`/`tags` são de curadoria (você/LLM) e nunca são tocados.
    const autoKw = uniquePreserve(kws)
    const autoTags = uniquePreserve(tags)
    if (autoKw.length) fm.palavras_chave_auto = autoKw
    else delete fm.palavras_chave_auto
    if (autoTags.length) fm.tags_auto = autoTags
    else delete fm.tags_auto

    if (!fm.data_vigencia) {
      const d = deriveDataVigencia(body)
      if (d) fm.data_vigencia = d
    }
    fm.versao_formato = "1.1"

    const out = serializeFrontmatter(fm, body)
    if (out !== content) {
      await writeText(file, out)
      changed++
    } else {
      unchanged++
    }
    nextCache[file] = sha256(out)
  } catch (err) {
    errors++
    console.error(`erro em ${file}: ${(err as Error).message}`)
  }
}

await writeJson(cachePath, nextCache)
console.log(
  `enrich: ${files.length} arquivos | alterados ${changed} | iguais ${unchanged} | ` +
    `pulados (cache) ${skipped} | erros ${errors}`,
)
