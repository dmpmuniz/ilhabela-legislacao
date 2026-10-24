// cespro.ts — helpers puros do portal Cespro (sem rede, sem I/O).
//
// Porta, em Node zero-dep, o que o fluxo Python que originou o acervo fazia
// com requests + BeautifulSoup:
//   - as duas operações da API (_data/api.php): content-pesquisa (listagem
//     paginada, 50 itens/página, ordem DECRESCENTE por id) e content-diploma
//     (html do diploma em 3 blocos);
//   - a limpeza do HTML da plataforma (blocos/elementos de lixo fixos);
//   - a hierarquia jurídica em Markdown (# LIVRO … ##### Art. Nº) que o
//     corpus inteiro usa.
//
// Puro de propósito: tudo aqui é testável com assert simples e sem mock.

export const SITE_CESPRO = "https://www.cespro.com.br"

export type ItemListagem = {
  id: string
  ds_title: string
  ds_resumo?: string
  ds_status?: string
  ds_link?: string
}

/** POST content-pesquisa: uma página da listagem (50 itens, mais novos primeiro). */
export function urlPesquisa(cdMunicipio: string, pagina: number, palavra = ""): string {
  const q = new URLSearchParams({
    cdMunicipio,
    LocalPesquisa: "Ementa",
    cdTipo: "Todos",
    dsStatus: "Todos",
    Submit: "Pesquisar",
    Word: palavra,
    nPage: String(pagina),
    operacao: "content-pesquisa",
  })
  return `${SITE_CESPRO}/_data/api.php?${q.toString()}`
}

export function corpoPesquisa(cdMunicipio: string): Record<string, unknown> {
  return { ID: cdMunicipio, lmdp: 0 }
}

/** POST content-diploma: html integral de um diploma. */
export function urlDiploma(cdMunicipio: string, id: string): string {
  const q = new URLSearchParams({ cdMunicipio, cdDiploma: id, operacao: "content-diploma" })
  return `${SITE_CESPRO}/_data/api.php?${q.toString()}`
}

export function corpoDiploma(cdMunicipio: string): Record<string, unknown> {
  return { ID: cdMunicipio }
}

/** URL pública do diploma — vai para o frontmatter (url_fonte). */
export function urlPublicaDiploma(cdMunicipio: string, id: string): string {
  return `${SITE_CESPRO}/visualizarDiploma.php?cdMunicipio=${cdMunicipio}&cdDiploma=${id}`
}

/**
 * Extrai totais do HTML de paginação. Exemplo real:
 *   Encontrado(s)<b><font size=18> 35767</b></font> Diploma(s) Legais em
 *   <font size=18>716</font> página(s).
 * Os três padrões de páginas são os mesmos do scraper antigo (defensivos:
 * a plataforma muda o markup entre versões).
 */
export function parsePaginacao(html: string): { total: number; paginas: number } {
  const limpo = String(html ?? "")
  const mTotal = /([\d.]+)\s*<\/b>\s*<\/font>\s*Diploma/i.exec(limpo)
  const total = mTotal ? Number(mTotal[1].replace(/\./g, "")) : 0
  let paginas = 0
  for (const re of [
    /em\s*<font[^>]*>\s*(\d+)/i,
    /de\s+(\d+)\s+páginas?/i,
    /(\d+)\s+resultado/i,
  ]) {
    const m = re.exec(limpo)
    if (m) { paginas = Number(m[1]); break }
  }
  return { total, paginas }
}

/** Normaliza o ds_status do portal para o enum do schema v1.1. */
export function mapearStatus(ds: string | undefined | null): string | null {
  const s = String(ds ?? "").trim().toUpperCase()
  if (!s) return null
  if (s === "EM VIGOR" || s === "VIGENTE") return "em_vigor"
  if (s === "REVOGADA" || s === "REVOGADO" || s === "FORA DE VIGOR") return "revogada"
  // vigência finda SEM revogação: termo final ou efeitos cessados
  if (/VIG[ÊE]NCIA(\s+ESGOTADA)?$/.test(s) || /EFEITOS CESSADOS/.test(s)) return "expirada"
  if (s.includes("INCONSTITUCIONAL") || /^ADI[N]?\s/.test(s)) return "inconstitucional"
  if (/LIMINAR|SUSTANDO/.test(s)) return "suspensa"
  if (/^ANULAD/.test(s)) return "anulada"
  // O badge da listagem é um campo de TELA, não um enum: chega lixo de
  // raspagem ('SERVIDORA', 'FALTA', '<FONT>'… — ~275 no espelho integral).
  // Presume 'em_vigor': a página da norma é quem manda na dúvida.
  return "em_vigor"
}

/**
 * Tipo e número extraídos do TÍTULO oficial (fonte autoritativa — o mesmo
 * princípio do enrich). Corrige de quebra o `tipo` truncado que a API às
 * vezes devolve ("LEI ORGÂ" em vez de "LEI ORGÂNICA MUNICIPAL"), que foi
 * exatamente a origem do único tipo não padronizado do corpus atual.
 */
export function tipoENumeroDoTitulo(titulo: string): { tipo: string; numero: string } {
  const t = String(titulo ?? "").trim()
  const base = t.replace(/\s*,\s*DE\s+\d{2}\/\d{2}\/\d{4}\s*$/i, "").trim()
  const m = /^\s*(.+?)\s+N[º°o]?\s*([\d.,]+)/i.exec(base)
  if (m) {
    return { tipo: m[1].trim(), numero: m[2].replace(/[.,]+$/, "").replace(/[.,](?=\d{3}\b)/g, "").replace(/\D/g, "") }
  }
  // sem "Nº": o tipo é tudo que sobrou (Lei Orgânica, ato sem número)
  const m2 = /^\s*(.+?)\s+N[º°o]?\s*[,.\s]*$/i.exec(base)
  return { tipo: (m2 ? m2[1] : base).trim(), numero: "" }
}

/** Nome de arquivo da norma: DECRETO_MUNICIPAL_001_2001 (convenção do corpus). */
export function slugNorma(titulo: string, ano: unknown): string {
  const { tipo: tipoBruto, numero } = tipoENumeroDoTitulo(titulo)
  let anoSeg = String(ano ?? "").replace(/\D/g, "").slice(0, 4)
  if (!anoSeg) {
    const m = /DE\s+\d{2}\/\d{2}\/(\d{4})/i.exec(String(titulo ?? ""))
    anoSeg = m ? m[1] : ""
  }
  // fold manual (sem depender do text.ts, que lowercases): ascii + maiúsculas
  const tipo = tipoBruto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
  return `${tipo || "INDEFINIDO"}_${numero || "000"}_${anoSeg || "0000"}`
}

// ---------------------------------------------------------------------------
// Limpeza do HTML da Cespro — porta fiel do cleaner.py (clean_html).
// ---------------------------------------------------------------------------

/** Blocos fixos da plataforma (rodapés/ferramentas), removidos do HTML cru. */
const BLOCOS_LIXO: Array<[RegExp, string]> = [
  [/<!--[\s\S]*?-->/g, " "], // comentários (VERSIONAMENTO etc.)
  [/<div[^>]*align\s*=\s*['"]?right['"]?[^>]*>[\s\S]*?(?:box_diploma_publicado_footer|Publicado no portal)[\s\S]*?<\/div>/gi, " "],
  [/<div[^>]*align\s*=\s*['"]?left['"]?[^>]*>[\s\S]*?(?:link_arquivo_fonte|ArquivoFonte\.png)[\s\S]*?<\/div>/gi, " "],
  [/<div[^>]*class\s*=\s*['"][^'"]*ferramenta[^'"]*['"][^>]*>[\s\S]*?<\/div>/gi, " "],
  // divs com id/classe de lixo conhecido (seletores do BeautifulSoup)
  [/<div[^>]*(?:id|class)\s*=\s*["']?[^"'>]*(?:box_diploma_publicado_footer|box_img_indice_sistematico|box_versionamento_diploma_novo_layout|div_versionamento_popup|link_arquivo_fonte|div_display_none|barra-ferramenta|back-to-top)[^"'>]*["']?[^>]*>[\s\S]*?<\/div>/gi, " "],
  [/<(?:script|style|noscript|iframe|form|button|nav|footer|header|input|select|textarea|canvas|svg)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|iframe|form|button|nav|footer|header|input|select|textarea|canvas|svg)>/gi, " "],
]

/** Frases fixas da plataforma que sobrevivem à remoção de blocos. */
const TEXTO_LIXO = [
  /Publicado no portal CESPRO\s*em\s*\d{2}\/\d{2}\/\d{4}\.?/gi,
  /Nota:\s*Este texto não substitui o original\.?/gi,
  /Publicado no portal\s*\.?/gi,
]

/** Linhas órfãs geradas pelo fatiamento do HTML ("em 02/04/2018", "…"). */
const LINHAS_ORFAS = [
  /^em\s*\d{2}\/\d{2}\/\d{4}\.?$/i,
  /^\.{2,}$/,
  /^\s*em\s*$/i,
]

const ENTIDADES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", aacute: "á",
  agrave: "à", acirc: "â", atilde: "ã", aring: "å", auml: "ä", ccedil: "ç",
  eacute: "é", ecirc: "ê", egrave: "è", euml: "ë", iacute: "í", îcirc: "î",
  igrave: "ì", iuml: "ï", ntilde: "ñ", oacute: "ó", ocirc: "ô", otilde: "õ",
  ograve: "ò", ouml: "ö", oslash: "ø", uacute: "ú", ucirc: "û", ugrave: "ù",
  uuml: "ü", yacute: "ý", deg: "°", ordm: "º", laquo: "«", raquo: "»",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", mdash: "—", ndash: "–",
  hellip: "…", bull: "•", middot: "·", sect: "§", para: "¶", copy: "©",
  reg: "®", trade: "™", euro: "€", pound: "£", cent: "¢", times: "×",
  divide: "÷", micro: "µ", plusmn: "±", frac12: "½", sup2: "²", sup3: "³",
}

/** Decodifica entidades HTML nomeadas e numéricas (", &#39;, &#x27;). */
export function decodificarEntidades(s: string): string {
  return String(s ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z][a-z0-9]*);/gi, (bruto, nome: string) => {
      const ent = ENTIDADES[nome.toLowerCase()]
      return ent !== undefined ? ent : bruto
    })
}

/**
 * Remove um <div id="..."> inteiro, respeitando aninhamento. A regex de bloco
 * sozinha para no primeiro `</div>` e deixa o resto do subtree no texto — foi
 * assim que a UI de versionamento (display:none) vazou para o corpo.
 */
export function removerDivPorId(html: string, id: string): string {
  const abertura = new RegExp(`<div\\b[^>]*\\bid\\s*=\\s*["']?${id}["']?[^>]*>`, "i")
  let s = String(html ?? "")
  for (let m = abertura.exec(s); m; m = abertura.exec(s)) {
    const tag = /<div\b[^>]*>|<\/div>/gi
    tag.lastIndex = m.index + m[0].length
    let profundidade = 1
    let t: RegExpExecArray | null
    while ((t = tag.exec(s))) {
      profundidade += t[0][1] === "/" ? -1 : 1
      if (profundidade === 0) break
    }
    s = s.slice(0, m.index) + s.slice(t ? tag.lastIndex : s.length)
  }
  return s
}

/**
 * HTML da Cespro → texto puro com UMA linha por trecho.
 *
 * Reproduz fielmente o BeautifulSoup do cleaner.py (get_text("\n")): TODA
 * fronteira de tag vira quebra de linha — inclusive de tags inline, porque o
 * get_text separa cada NavigableString. É isso que deixa `##### Art. 1º`
 * sozinho na linha, com o caput na seguinte — formato que o corpus inteiro
 * segue.
 */
export function htmlParaTexto(html: string): string {
  // o bloco de versionamento é um div aninhado com display:none no header
  let s = removerDivPorId(String(html ?? ""), "box_versionamento")
  for (const [re, rep] of BLOCOS_LIXO) s = s.replace(re, rep)
  // toda marca (inline ou bloco) é fronteira de NavigableString no BS4 → \n
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, "\n")
  s = decodificarEntidades(s)
  for (const re of TEXTO_LIXO) s = s.replace(re, "")
  const linhas: string[] = []
  for (const linhaBruta of s.split("\n")) {
    // o portal às vezes manda controle solto no texto (LEI 497/2007: "S\u0006ituação")
    const linha = linhaBruta
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/[ \t\u00a0]+/g, " ")
      .trim()
    if (!linha) continue
    if (LINHAS_ORFAS.some((re) => re.test(linha))) continue
    linhas.push(linha)
  }
  return linhas.join("\n") + "\n"
}

/** Hierarquia jurídica em Markdown — mesma marcação do corpus (#/##/###/#####). */
export function converterHierarquia(texto: string): string {
  return String(texto ?? "")
    .replace(/^(LIVRO\s+[IVXLCDM]+)/gim, "# $1")
    .replace(/^(TÍTULO\s+[IVXLCDM]+|TITULO\s+[IVXLCDM]+)/gim, "## $1")
    .replace(/^(CAPÍTULO\s+[IVXLCDM]+|CAPITULO\s+[IVXLCDM]+)/gim, "### $1")
    .replace(/^(SEÇÃO\s+[IVXLCDM]+|SECAO\s+[IVXLCDM]+)/gim, "#### $1")
    .replace(/^(Art\.\s*\d+[º°o]?|Artigo\s+\d+[º°o]?)/gim, "##### $1")
}

export type DiplomaExtraido = {
  titulo: string
  tipo: string
  numero: string
  ano: string
  ementa: string
  status: string
  corpo: string
}

/**
 * Resposta do content-diploma + item da listagem → norma pronta para o corpus.
 * Porta a extração de metadados do scraper.py + format_for_rag do cleaner.py.
 * Devolve null quando o portal não tem texto utilizável (diploma vazio).
 */
export function extrairDiploma(
  api: Record<string, any>,
  item: Pick<ItemListagem, "ds_title" | "ds_resumo" | "ds_status">,
): DiplomaExtraido | null {
  const header = String(api?.htmlContentHeader ?? "")
  const middle = String(api?.htmlContentMiddle ?? "")
  const footer = String(api?.htmlContentFooter ?? "")
  const temConteudo = Boolean(api?.content_cdDiploma) || Boolean(middle)
  if (!temConteudo) return null

  const corpo = converterHierarquia(htmlParaTexto(header + middle + footer))
  if (corpo.trim().length < 20) return null

  const titulo = String(api?.ds_title_diploma || item.ds_title || "").trim()

  // ementa: dado extra da API → resumo da listagem; sanitiza como o cleaner
  let ementa = decodificarEntidades(String(api?.dados_extra?.tx_ementa || item.ds_resumo || ""))
  ementa = ementa.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  if (!ementa || ["INEXISTENTE", "SEM EMENTA"].includes(ementa.toUpperCase())) {
    ementa = "(sem ementa)"
  }

  const { tipo, numero: numeroTitulo } = tipoENumeroDoTitulo(titulo)
  const numeroApi = String(api?.content_numeroDiploma ?? "").trim()
  const anoApi = String(api?.content_anoDiploma ?? "").trim()
  const status = mapearStatus(item.ds_status)

  return {
    titulo,
    tipo, // vem do título, completo — nunca o valor truncado da API
    numero: numeroApi || numeroTitulo,
    ano: anoApi,
    ementa,
    status: status ?? "",
    corpo,
  }
}

export type BlocoGerado = {
  titulo: string
  ementa: string | null
  status: string
  corpo: string
}

const ementaNormalizada = (s: string | null | undefined): string => {
  const t = !s || s === "(sem ementa)" ? "" : String(s).trim()
  // ementa numérica: o portal zero-preenche ("01") e o corpus guarda "1"
  return /^\d+$/.test(t) ? String(Number(t)) : t
}

/**
 * Nota expressa de saída de vigor que o próprio portal publica no corpo
 * ("(Revogado pelo ...)", "(Efeitos cessados ...)"). Só vale no início do
 * texto: no meio do articulado a mesma expressão costuma revogar OUTRA norma.
 */
export function statusDaNota(corpo: string): string | null {
  const inicio = String(corpo ?? "").slice(0, 1000)
  if (/\(\s*revogad[ao]\b/i.test(inicio)) return "revogada"
  if (/\(\s*(?:efeitos cessados|vig[êe]ncia esgotada)\b/i.test(inicio)) return "expirada"
  if (/\(\s*anulad[ao]\b/i.test(inicio)) return "anulada"
  if (/\(\s*inconstitucional\b/i.test(inicio)) return "inconstitucional"
  if (/\(\s*suspens[ao]\b/i.test(inicio)) return "suspensa"
  return null
}

/**
 * Compara um bloco do export com o diploma recém-baixado do Cespro.
 * Devolve a lista de campos divergentes (vazia = conforme).
 *
 * `status` vazio no remoto é ausência de dado, não divergência: o antigo
 * checklist humano também não tinha como comparar o que o portal não informa.
 *
 * `statusListagem` é o `ds_status` da listagem, usado só para desempatar o
 * caso em que a página do diploma diz "em vigor" mas a norma já saiu de vigor
 * (o portal tem os dois campos inconsistentes em ~11 normas).
 */
export function compararDiploma(
  local: BlocoGerado,
  remoto: DiplomaExtraido | null,
  statusListagem?: string | null,
): string[] {
  if (!remoto) return ["portal sem conteúdo utilizável"]
  const erros: string[] = []
  if (local.titulo !== remoto.titulo) {
    erros.push(`título: ${JSON.stringify(local.titulo)} != ${JSON.stringify(remoto.titulo)}`)
  }
  if (ementaNormalizada(local.ementa) !== ementaNormalizada(remoto.ementa)) {
    erros.push("ementa")
  }
  const statusLocal = String(local.status ?? "").replaceAll("_", " ")
  const statusRemoto = String(remoto.status ?? "").replaceAll("_", " ")
  if (statusRemoto && statusLocal !== statusRemoto) {
    // Assimetria proposital: local "em vigor" contra portal fora de vigor é
    // sempre erro (norma revogada não pode continuar sendo citada como
    // vigente). O contrário — local fora de vigor e diploma dizendo "em
    // vigor" — passa quando a listagem ou a nota do corpo confirmam a saída.
    const confirmada =
      statusLocal !== "em vigor" &&
      statusRemoto === "em vigor" &&
      (mapearStatus(statusListagem) === statusLocal || statusDaNota(remoto.corpo) === statusLocal)
    if (!confirmada) {
      erros.push(`status: ${JSON.stringify(statusLocal)} != ${JSON.stringify(statusRemoto)}`)
    }
  }
  if (local.corpo.trim() !== remoto.corpo.trim()) erros.push("corpo")
  return erros
}
