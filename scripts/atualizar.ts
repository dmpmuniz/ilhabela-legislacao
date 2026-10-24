// atualizar.ts — sincronização INCREMENTAL do corpus com o portal Cespro.
//
// Substitui, em Node zero-dep, o fluxo Python que originou o acervo
// (scraper + cleaner + ingestão). Num único passo:
//
//   1. varre a listagem do portal (sempre FRESCA — o fluxo antigo cacheara o
//      listing.json e nunca mais via lei nova sem apagar o cache à mão);
//   2. compara com o acervo local (idx/manifest.jsonl) e BAIXA SÓ O QUE É NOVO
//      — a listagem vem ordenada do mais novo para o mais velho, então a
//      varredura rápida para na primeira página inteira de ids conhecidos
//      (o modo --completo segue até o fim e também captura revogações de
//      leis antigas);
//   3. converte cada diploma direto para o formato do corpus (.md schema
//      v1.1, mesma limpeza de HTML e mesma hierarquia ##### Art. do acervo);
//   4. marca como `revogada` as leis que já tínhamos e que o portal passou a
//      listar FORA DE VIGOR — citar lei caída como vigente é pior que não ter;
//   5. reexecuta o pipeline (enrich → validate → manifest → index), que é
//      incremental por cache SHA256 — só o que mudou é reprocessado.
//
// Polidez de rede igual à do scraper antigo: sleep aleatório entre pedidos,
// retries com backoff exponencial, downloads paralelos limitados.

import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join, resolve, basename } from "node:path"
import { pathToFileURL } from "node:url"
import { spawnSync } from "node:child_process"
import { parseArgs, readText, writeText, sha256, repoRoot } from "./lib/io.ts"
import { parseFrontmatter, serializeFrontmatter, type Frontmatter } from "./lib/frontmatter.ts"
import { completarFrontmatter } from "./lib/norma-doc.ts"
import { ingerirPacote } from "./ingest.ts"
import {
  SITE_CESPRO,
  urlPesquisa, corpoPesquisa, urlDiploma, corpoDiploma, urlPublicaDiploma,
  parsePaginacao, mapearStatus, slugNorma, extrairDiploma,
  type ItemListagem,
} from "./lib/cespro.ts"

// ---------------------------------------------------------------------------
// Parâmetros e polidez de rede
// ---------------------------------------------------------------------------

/** Páginas consecutivas de ids 100% conhecidos que encerram a varredura rápida. */
const PAGINAS_CONHECIDAS_PARAR = 1
const MAX_RETRIES = 5
/**
 * Teto por pedido. A API responde em <1s; 30s já é generoso — um worker não
 * pode ficar pendurado por um minuto num provedor que aceitou a conexão e
 * morreu (60s × 16 workers atrasava a rodada inteira à toa).
 */
const TETO_PEDIDO_MS = 30_000

/**
 * Downloads em paralelo. O fluxo antigo usava 10 com sleep 0,2–0,5s e nunca
 * levou 429; 16 workers com sleep 0,1–0,3s dobra o throughput mantendo o
 * mesmo espaçamento médio por pedido — agressivo o bastante para a primeira
 * sincronização (~18k diplomas), polido o bastante para o portal pequeno.
 */
const WORKERS_PADRAO = 16

/** Status que tiram a norma de vigor; a listagem manda e o corpus acompanha. */
const FORA_DE_VIGOR = new Set(["revogada", "expirada", "anulada", "inconstitucional", "suspensa"])

const SLEEP_MIN = () => Number(process.env.SCRAPER_SLEEP_MIN ?? 0.1)
const SLEEP_MAX = () => Number(process.env.SCRAPER_SLEEP_MAX ?? 0.3)

function sleepJitter(): Promise<void> {
  const min = SLEEP_MIN() * 1000
  const max = Math.max(SLEEP_MAX() * 1000, min)
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
}

function cabecalhos(cdMunicipio: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "Origin": SITE_CESPRO,
    "Referer": `${SITE_CESPRO}/visualizarLegislacao.php?cdMunicipio=${cdMunicipio}`,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  }
}

/** POST na API com retry/backoff — a mesma política do scraper antigo. */
export async function chamarApi(
  url: string,
  corpo: unknown,
  cdMunicipio: string,
): Promise<Record<string, any>> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: cabecalhos(cdMunicipio),
        body: JSON.stringify(corpo),
        // provedores às vezes aceitam a conexão e não respondem — teto duro
        signal: AbortSignal.timeout(TETO_PEDIDO_MS),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // a API responde com BOM (utf-8-sig): sem removê-lo o JSON.parse falha
      const texto = (await res.text()).replace(/^\uFEFF/, "")
      const data = JSON.parse(texto) as Record<string, any>
      if (!data || typeof data !== "object") throw new Error("resposta vazia/inválida")
      return data
    } catch (e) {
      if (tentativa >= MAX_RETRIES) {
        throw new Error(`falha definitiva: ${(e as Error).message}`)
      }
      // Backoff curto: falha transitória (rede/pico) se resolve no 1º retry
      // de 1s — a espera de 5s do fluxo antigo punia todos por causa de um
      // soluço. Esperas: 1s, 2s, 4s, 8s.
      await new Promise((r) =>
        setTimeout(r, Math.min(15_000, 1_000 * 2 ** (tentativa - 1)) + Math.random() * 500),
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Varredura da listagem
// ---------------------------------------------------------------------------

/**
 * Varre a listagem (mais novo → mais velho).
 *
 * Modo incremental (default): para na primeira página inteira de ids já
 * conhecidos — leis novas entram no topo da ordenação, então nada relevante
 * fica para trás e a checagem custa 1–3 pedidos em vez de 716.
 * Modo --completo: varre todas as páginas, capturando também mudanças de
 * status (revogação) em leis antigas.
 */
export async function varrerListagem(
  cdMunicipio: string,
  idsConhecidos: Set<string>,
  completo = false,
): Promise<ItemListagem[]> {
  const itens: ItemListagem[] = []
  const vistos = new Set<string>()
  let totalPaginas = 0
  let paginasConhecidasSeguidas = 0
  let pagina = 1

  while (true) {
    const data = await chamarApi(urlPesquisa(cdMunicipio, pagina), corpoPesquisa(cdMunicipio), cdMunicipio)
    if (totalPaginas === 0) {
      const pag = parsePaginacao(String(data?.dados_paginacao_resultado_new ?? ""))
      totalPaginas = pag.paginas || 1
      console.log(`[listagem] ${pag.total} diplomas em ${totalPaginas} páginas`)
    }

    const brutos = (data?.dados_legislacao_resultado_pesquisa_json ?? {}) as Record<string, any>
    let nestaPagina = 0
    let conhecidas = 0
    for (const bruto of Object.values(brutos)) {
      const item: ItemListagem = {
        id: String(bruto?.id ?? ""),
        ds_title: String(bruto?.ds_title ?? ""),
        ds_resumo: bruto?.ds_resumo != null ? String(bruto.ds_resumo) : undefined,
        ds_status: bruto?.ds_status != null ? String(bruto.ds_status) : undefined,
        ds_link: bruto?.ds_link != null ? String(bruto.ds_link) : undefined,
      }
      if (!item.id || vistos.has(item.id)) continue
      vistos.add(item.id)
      itens.push(item)
      nestaPagina++
      if (idsConhecidos.has(item.id)) conhecidas++
    }

    // página sem nada novo (só itens repetidos da fronteira de paginação) OU
    // página inteira de ids conhecidos → adiante só existe o que já temos
    if (nestaPagina === 0 || conhecidas === nestaPagina) {
      paginasConhecidasSeguidas++
      if (!completo && paginasConhecidasSeguidas >= PAGINAS_CONHECIDAS_PARAR) break
    } else {
      paginasConhecidasSeguidas = 0
    }

    if (pagina >= totalPaginas) break
    pagina++
    await sleepJitter()
  }
  return itens
}

// ---------------------------------------------------------------------------
// Acervo local: manifesto (id → arquivo) e gravação idempotente
// ---------------------------------------------------------------------------

type NoAcervo = { path: string; status: string }

/** Lê idx/manifest.jsonl (JSONL — readJson não serve, é uma linha por lei). */
export async function carregarManifesto(idxDir: string): Promise<Map<string, NoAcervo>> {
  const mapa = new Map<string, NoAcervo>()
  let texto = ""
  try {
    texto = await readFile(join(idxDir, "manifest.jsonl"), "utf8")
  } catch {
    return mapa // sem manifesto = primeira sincronização (corpus vazio)
  }
  for (const linha of texto.split("\n")) {
    if (!linha.trim()) continue
    try {
      const m = JSON.parse(linha) as { id?: unknown; path?: unknown; status?: unknown }
      if (m.id != null && m.id !== "") {
        mapa.set(String(m.id), { path: String(m.path ?? ""), status: String(m.status ?? "") })
      }
    } catch {
      // linha corrompida do manifesto: segue — o pipeline a regenera
    }
  }
  return mapa
}

export type OpcoesSincronizar = {
  cdMunicipio?: string
  corpusDir?: string
  idxDir?: string
  /** downloads em paralelo (default 16) */
  workers?: number
  /** teto de downloads nesta execução (teste/secagem) */
  limite?: number
  /** varrer a listagem inteira (captura revogações de leis antigas) */
  completo?: boolean
  /** rebaixar o corpo de normas já existentes (ignora a parada incremental) */
  refazer?: boolean
  /** pacote bruto a importar ANTES de sincronizar (ex.: legislacao_ilhabela/) */
  pacoteDir?: string
  cidade?: string
  estado?: string
  esfera?: string
}

export type ResultadoSincronizar = {
  varridos: number
  importadas: number
  novos: number
  /** normas já no acervo cujo TEXTO mudou no portal (reescritas) */
  atualizadas: number
  /** normas já no acervo que o portal passou a listar fora de vigor */
  foraDeVigor: number
  iguais: number
  vazios: number
  erros: number
  detalhes: string[]
}

/**
 * Sincroniza o corpus com o portal. Sem efeito colateral além de leis/:
 * o pipeline (enrich/validate/manifest/index) é responsabilidade de quem
 * chama — main() o executa ao fim; os testes chamam sincronizar direto.
 */
export async function sincronizar(opcoes: OpcoesSincronizar = {}): Promise<ResultadoSincronizar> {
  const cdMunicipio = opcoes.cdMunicipio ?? "8969"
  const corpusDir = resolve(opcoes.corpusDir ?? "leis")
  const idxDir = resolve(opcoes.idxDir ?? "idx")
  const workers = opcoes.workers != null && Number.isFinite(opcoes.workers)
    ? Math.max(1, opcoes.workers)
    : WORKERS_PADRAO
  const limite = opcoes.limite != null && Number.isFinite(opcoes.limite)
    ? Math.max(0, opcoes.limite)
    : Infinity
  const cidade = opcoes.cidade ?? "Ilhabela"
  const estado = opcoes.estado ?? "SP"
  const esfera = opcoes.esfera ?? "municipal"
  const hoje = new Date().toISOString().slice(0, 10)

  const resultado: ResultadoSincronizar = { varridos: 0, importadas: 0, novos: 0, atualizadas: 0, foraDeVigor: 0, iguais: 0, vazios: 0, erros: 0, detalhes: [] }

  // PACOTE BRUTO primeiro (se existir): as leis dele entram como "já
  // conhecidas" na sincronização — sem isso, uma primeira instalação baixaria
  // do portal as 18k normas que o pacote acabou de entregar localmente.
  const idsImportados = new Set<string>()
  if (opcoes.pacoteDir && existsSync(opcoes.pacoteDir)) {
    console.log(`[pacote] importando ${opcoes.pacoteDir}`)
    const ingerido = await ingerirPacote(opcoes.pacoteDir, corpusDir, { cidade, estado, esfera })
    resultado.importadas = ingerido.convertidos + ingerido.mantidos
    resultado.erros += ingerido.erros
    for (const id of ingerido.ids) idsImportados.add(id)
    console.log(
      `[pacote] ${ingerido.convertidos} convertidos | ${ingerido.mantidos} já existentes | ` +
      `${ingerido.semUrl} sem url_fonte | ${ingerido.erros} erros`,
    )
    for (const p of ingerido.problemas.slice(0, 15)) console.log(`  erro: ${p}`)
  }

  const manifesto = await carregarManifesto(idxDir)
  console.log(`[acervo] ${manifesto.size} normas no manifesto local`)
  if (opcoes.refazer) console.log("[refazer] rebaixando o corpo de todas as normas do acervo")

  const itens = opcoes.refazer
    // re-sync: a fila vem do manifesto (id + caminho), sem varrer a listagem
    ? [...manifesto.keys()].map((id) => ({ id, ds_title: "" } as ItemListagem))
    : await varrerListagem(
        cdMunicipio,
        new Set([...manifesto.keys(), ...idsImportados]),
        opcoes.completo ?? false,
      )
  resultado.varridos = itens.length

  // COMPARAÇÃO — três destinos possíveis para cada item da listagem:
  const paraBaixar: Array<{ item: ItemListagem; caminho?: string }> = []
  const paraAtualizarStatus: Array<{ item: ItemListagem; caminho: string }> = []
  for (const item of itens) {
    // acabou de sair do pacote: já está no corpus — baixar de novo seria
    // desperdiçar a entrega local inteira (o pipeline a seguir o registra
    // no manifesto; da próxima vez o caminho normal cobre)
    if (idsImportados.has(item.id)) continue
    const existente = manifesto.get(item.id)
    if (existente) {
      // re-sync: rebaixa o diploma inteiro e reescreve só o que mudou
      if (opcoes.refazer) {
        paraBaixar.push({ item, caminho: join(corpusDir, existente.path) })
        continue
      }
      // a lei JÁ ESTÁ no acervo; o que pode ter mudado é o status —
      // saiu de vigor no portal (revogada, expirada, anulada, inconstitucional
      // ou suspensa), precisa refletir aqui
      const statusPortal = mapearStatus(item.ds_status)
      if (FORA_DE_VIGOR.has(statusPortal ?? "") && existente.status === "em_vigor") {
        paraAtualizarStatus.push({ item, caminho: join(corpusDir, existente.path) })
      }
      continue
    }
    // acabaram os filtros de status e de portarias de RH: o acervo agora é o
    // ESPELHO INTEGRAL do portal (decisão do mantenedor: completo > limpo).
    // A triagem fica na camada de USO — o campo `status` (com o mapa do
    // mapearStatus) e as instruções da IA fazem o serviço. As ~14 mil
    // portarias de férias/licença/nomeação entram como atos individuais.
    paraBaixar.push({ item })
  }

  const filaBaixar = paraBaixar.slice(0, limite === Infinity ? paraBaixar.length : limite)
  console.log(`[diff] baixar: ${filaBaixar.length}${paraBaixar.length !== filaBaixar.length ? ` (limitado de ${paraBaixar.length})` : ""} | a marcar fora de vigor: ${paraAtualizarStatus.length}`)

  // -----------------------------------------------------------------------
  // Download + conversão + gravação (pool de workers como no scraper antigo)
  // -----------------------------------------------------------------------
  let indice = 0
  let processados = 0
  const total = filaBaixar.length

  async function trabalhadora(): Promise<void> {
    while (indice < filaBaixar.length) {
      const { item, caminho } = filaBaixar[indice++]
      try {
        await sleepJitter()
        const api = await chamarApi(urlDiploma(cdMunicipio, item.id), corpoDiploma(cdMunicipio), cdMunicipio)
        // re-sync lê o arquivo antes: título/ementa antigos são o fallback se
        // o diploma vier sem esses campos (arquivo sumido = recria no lugar)
        let existentePre: { data: Frontmatter; body: string } | null = null
        if (caminho) {
          try {
            existentePre = parseFrontmatter(await readText(caminho))
          } catch {
            // manifesto aponta para arquivo ausente: grava de novo no caminho
          }
        }
        const norma = extrairDiploma(api, {
          ds_title: item.ds_title || String(existentePre?.data.titulo ?? ""),
          ds_resumo: item.ds_resumo ?? (existentePre?.data.ementa != null ? String(existentePre.data.ementa) : undefined),
          ds_status: item.ds_status,
        })

        // destino: re-sync usa o caminho do manifesto (a norma já existe);
        // norma nova procura o slug e desvia para _2/_3 em caso de colisão
        let destino = caminho ?? ""
        let existente = existentePre
        if (!caminho && norma) {
          const slugBase = slugNorma(norma.titulo, norma.ano)
          destino = join(corpusDir, `${slugBase}.md`)
          for (let sufixo = 2; ; sufixo++) {
            try {
              const parsed = parseFrontmatter(await readText(destino))
              if (String(parsed.data.id ?? "") === item.id) {
                existente = parsed
                break
              }
              destino = join(corpusDir, `${slugBase}_${sufixo}.md`)
            } catch {
              break // não existe: escrever aqui
            }
          }
        }

        // status: o portal manda quando a norma está em vigor; norma que já
        // saiu de vigor NUNCA volta a em_vigor sozinha. No re-sync
        // não há listagem — o status vem do próprio diploma.
        const statusPortal = mapearStatus(item.ds_status || api?.dados_diploma_original?.ds_situacao)
        const statusAtual = existente ? String(existente.data.status ?? "") : ""
        const status = statusAtual && statusAtual !== "em_vigor"
          ? statusAtual
          : (statusPortal ?? statusAtual)

        if (!norma || !status) {
          resultado.vazios++
        } else {
          const htmlCru =
            String(api?.htmlContentHeader ?? "") +
            String(api?.htmlContentMiddle ?? "") +
            String(api?.htmlContentFooter ?? "")
          const fmFonte: Frontmatter = {
            // id numérico quando o portal manda dígitos — convenção do corpus
            // (o serializer só não põe aspas em valor que não começa com dígito)
            id: /^\d+$/.test(item.id) ? Number(item.id) : item.id,
            titulo: norma.titulo,
            tipo: norma.tipo,
            numero: /^\d+$/.test(norma.numero) ? parseInt(norma.numero, 10) : norma.numero,
            ano: /^\d+$/.test(norma.ano) ? parseInt(norma.ano, 10) : norma.ano,
            status,
            ementa: norma.ementa,
          }
          // hash do corpo LIMPO e trimado — base de comparação estável entre
          // gravação e releitura (serializeFrontmatter normaliza o fim)
          const corpoHash = sha256(norma.corpo.trim())

          if (existente) {
            // re-download: só reescreve se o TEXTO mudou no portal (hash do
            // corpo limpo, não da fonte — a fonte muda de formato, o texto não)
            if (sha256(existente.body.trim()) === corpoHash && String(existente.data.status) === status) {
              resultado.iguais++
            } else {
              // fonte de verdade vence, curadoria (palavras_chave, tags,
              // observações, ref/aliases) é preservada — o enrich regenera
              // o que é derivado quando reprocessar o arquivo alterado
              const fm = completarFrontmatter(
                { ...existente.data, ...fmFonte },
                {
                  cidade, estado, esfera,
                  url: urlPublicaDiploma(cdMunicipio, item.id),
                  coletadoEm: hoje,
                  sha256: sha256(htmlCru),
                },
              )
              await writeText(destino, serializeFrontmatter(fm, norma.corpo))
              resultado.atualizadas++
              resultado.detalhes.push(`atualizada: ${basename(destino)} (id ${item.id})`)
            }
          } else {
            const fm = completarFrontmatter(fmFonte, {
              cidade, estado, esfera,
              url: urlPublicaDiploma(cdMunicipio, item.id),
              coletadoEm: hoje,
              sha256: sha256(htmlCru),
            })
            await writeText(destino, serializeFrontmatter(fm, norma.corpo))
            resultado.novos++
          }
        }
      } catch (e) {
        resultado.erros++
        resultado.detalhes.push(`erro em ${item.id} (${item.ds_title}): ${(e as Error).message}`)
      } finally {
        processados++
        if (processados % 25 === 0 || processados === total) {
          console.log(`[download] ${processados}/${total}`)
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(workers, filaBaixar.length) }, trabalhadora))

  // -----------------------------------------------------------------------
  // Saídas de vigor (revogada/expirada/anulada/inconstitucional/suspensa):
  // status in-place, resto intacto
  // -----------------------------------------------------------------------
  for (const { item, caminho } of paraAtualizarStatus) {
    try {
      const conteudo = await readText(caminho)
      const { data, body } = parseFrontmatter(conteudo)
      const novoStatus = mapearStatus(item.ds_status) ?? "revogada"
      if (String(data.status ?? "") === novoStatus) {
        resultado.iguais++
        continue
      }
      data.status = novoStatus
      await writeText(caminho, serializeFrontmatter(data, body))
      resultado.foraDeVigor++
      resultado.detalhes.push(`${novoStatus}: ${basename(caminho)}`)
    } catch (e) {
      resultado.erros++
      resultado.detalhes.push(`erro ao atualizar status (${caminho}): ${(e as Error).message}`)
    }
  }

  return resultado
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/** Roda o pipeline local com o MESMO node/flags deste processo (zero-dep). */
function rodarPipeline(): boolean {
  const etapas = ["scripts/enrich.ts", "scripts/validate.ts", "scripts/build-manifest.ts", "scripts/build-index.ts"]
  for (const etapa of etapas) {
    console.log(`== pipeline: ${basename(etapa)} ==`)
    const r = spawnSync(process.execPath, [...process.execArgv, join(repoRoot, etapa)], {
      stdio: "inherit",
      cwd: repoRoot,
    })
    if (r.status !== 0) {
      console.error(`pipeline interrompido em ${etapa}`)
      return false
    }
  }
  return true
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv)

  // --origem explícita precisa existir (erro de digitação não pode passar batido);
  // sem flag, o pacote padrão da raiz é importado quando presente.
  let pacoteDir: string | undefined
  if (args.origem) {
    pacoteDir = resolve(args.origem)
    if (!existsSync(pacoteDir)) {
      console.error(`[atualizar] pasta de origem não encontrada: ${pacoteDir}`)
      process.exitCode = 1
      return
    }
  } else {
    const padrao = join(repoRoot, "legislacao_ilhabela")
    if (existsSync(padrao)) pacoteDir = padrao
  }

  const r = await sincronizar({
    cdMunicipio: args["cd-municipio"],
    corpusDir: args.corpus,
    idxDir: args.idx,
    workers: args.workers ? parseInt(args.workers, 10) : undefined,
    limite: args.limite != null ? parseInt(args.limite, 10) : undefined,
    completo: args.completo === "true" || args.refazer === "true",
    refazer: args.refazer === "true",
    pacoteDir,
  })

  console.log(
    `\n[atualizar] varridos ${r.varridos}${r.importadas ? ` | importadas do pacote ${r.importadas}` : ''} | ` +
    `novos ${r.novos} | atualizadas ${r.atualizadas} | fora de vigor ${r.foraDeVigor} | ` +
    `iguais ${r.iguais} | sem conteúdo ${r.vazios} | erros ${r.erros}`,
  )
  for (const d of r.detalhes.slice(0, 20)) console.log(`  ${d}`)
  if (r.detalhes.length > 20) console.log(`  … +${r.detalhes.length - 20}`)

  const houveMudanca = r.importadas > 0 || r.novos > 0 || r.atualizadas > 0 || r.foraDeVigor > 0 || r.erros > 0
  if (!houveMudanca) {
    console.log("[atualizar] nada mudou — pipeline dispensado")
    return
  }
  if (args["sem-pipeline"] === "true") {
    console.log("[atualizar] --sem-pipeline: rode `npm run pipeline` para atualizar o índice")
    return
  }
  if (!rodarPipeline()) process.exitCode = 1
}

// Executa só quando chamado direto (`node … scripts/atualizar.ts`) —
// importado pelos testes, não deve disparar rede nem pipeline.
const invocadoDireto = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (invocadoDireto) await main()
