// verificar-saida.mjs — confere os arquivos GERADOS, independente do gerador.
//
// O gerador já garante contagem e teto na escrita, mas só uma leitura de fora
// pega erro de classificação (ex.: a Lei Orgânica foi parar na parte errada
// porque o tipo normalizado mudou). Roda rápido: sem rede, sem índice.
//
// Uso: node scripts/verificar-saida.mjs (da raiz do repo)

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseFrontmatter } from './lib/frontmatter.ts'

const PASTA = 'notebooklm'
const CORPUS = 'leis'
const TETO = 500_000 // limite do NotebookLM por fonte

const nPalavras = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)
const erros = []

// frontmatter das leis (fonte da verdade): ref → dados
const normas = new Map()
for (const f of await readdir(CORPUS)) {
  if (!f.endsWith('.md')) continue
  const { data } = parseFrontmatter(await readFile(join(CORPUS, f), 'utf8'))
  if (data.ref) normas.set(String(data.ref), data)
}
const refs = new Set(normas.keys())

const arquivos = (await readdir(PASTA)).filter(f => f.endsWith('.md')).sort()
const partes = []
for (const nome of arquivos) {
  const texto = await readFile(join(PASTA, nome), 'utf8')
  // assinatura do gerador: só as partes têm o H1 com o sufixo do acervo
  const primeiraLinha = texto.split('\n', 1)[0]
  if (primeiraLinha.startsWith('# ') && primeiraLinha.endsWith('— Legislação de Ilhabela/SP')) {
    partes.push({ nome, texto })
  }
}

const vistos = new Map()
let blocos = 0
let maior = { nome: '', palavras: 0 }
let palavrasTotal = 0

for (const { nome, texto } of partes) {
  const palavras = nPalavras(texto)
  palavrasTotal += palavras
  if (palavras > maior.palavras) maior = { nome, palavras }
  if (palavras > TETO) erros.push(`${nome}: ${palavras} palavras (teto ${TETO})`)

  // bloco de norma = título seguido da linha de metadados (e da ementa, se houver)
  const blocosArquivo = [...texto.matchAll(/^# (.+)\n\n> \*\*Ref:\*\* ([^ ]+) · \*\*Tipo:\*\* (.+?) · \*\*Ano:\*\* (\d+) · \*\*Status:\*\* (.+)\n(?:> \*\*Ementa:\*\* (.*)\n)?/gm)]
  for (const [, titulo, ref, tipo, ano, status, ementa] of blocosArquivo) {
    blocos++
    if (!refs.has(ref)) erros.push(`${nome}: ref inexistente nas leis: ${ref}`)
    if (vistos.has(ref)) erros.push(`ref em duas partes: ${ref} (${vistos.get(ref)} e ${nome})`)
    vistos.set(ref, nome)
    if (!tipo.trim()) erros.push(`${nome}: bloco sem tipo: ${titulo}`)
    if (!status.trim()) erros.push(`${nome}: bloco sem status: ${titulo}`)
    if (!(Number(ano) > 0)) erros.push(`${nome}: bloco sem ano: ${titulo}`)

    // título e ementa têm que ser idênticos ao frontmatter; comparação exata
    // pega escapes que sobraram (ex.: `\"CAPUT\"` em vez de `"CAPUT"`)
    const norma = normas.get(ref)
    if (!norma) continue
    if (titulo !== String(norma.titulo ?? '')) erros.push(`${nome}: título diverge do frontmatter: ${ref}`)
    const ementaEsperada = norma.ementa ? String(norma.ementa) : null
    if ((ementa ?? null) !== ementaEsperada) erros.push(`${nome}: ementa diverge do frontmatter: ${ref}`)
  }

  // todo bloco precisa de fonte oficial (citável)
  const semFonte = (texto.match(/^> \*\*Ref:\*\*/gm) ?? []).length -
    (texto.match(/^> \*\*Fonte:\*\* https?:/gm) ?? []).length
  if (semFonte > 0) erros.push(`${nome}: ${semFonte} bloco(s) sem fonte`)

  // datas de efeitos, quando presentes, em ISO
  for (const m of texto.matchAll(/^> \*\*Efeitos a partir de:\*\* (.+)$/gm)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m[1])) erros.push(`${nome}: data fora do padrão ISO: ${m[1]}`)
  }

  // período do cabeçalho tem que bater com os anos dos blocos
  const h = texto.match(/^# .*?\((\d{4})(?: a (\d{4}))?\)/)
  const anos = blocosArquivo.map(m => Number(m[4])).filter(a => a > 0)
  if (h && anos.length) {
    const min = Math.min(...anos)
    const max = Math.max(...anos)
    const esperado = min === max ? `${min}` : `${min} a ${max}`
    const escrito = h[2] ? `${h[1]} a ${h[2]}` : `${h[1]}`
    if (escrito !== esperado) erros.push(`${nome}: cabeçalho "${escrito}" != anos ${esperado}`)
  }
}

if (blocos !== refs.size) erros.push(`blocos ${blocos} != refs das leis ${refs.size}`)

// índice e instruções precisam refletir a geração atual
const indice = await readFile(join(PASTA, '01-INDICE-GERAL.md'), 'utf8')
for (const { nome } of partes) if (!indice.includes(nome)) erros.push(`índice não lista ${nome}`)
const instr = await readFile(join(PASTA, '00-INSTRUCOES.md'), 'utf8')
if (!instr.includes(`em ${partes.length} partes`)) erros.push(`instruções não citam ${partes.length} partes`)

console.log(`partes: ${partes.length} | blocos: ${blocos.toLocaleString('pt-BR')} | refs nas leis: ${refs.size.toLocaleString('pt-BR')}`)
console.log(`palavras totais: ${palavrasTotal.toLocaleString('pt-BR')} | maior parte: ${maior.nome} (${maior.palavras.toLocaleString('pt-BR')})`)

if (erros.length) {
  console.error(`\n${erros.length} problema(s):`)
  for (const e of erros) console.error(`  ✗ ${e}`)
  process.exit(1)
}
console.log('\n✓ saída íntegra: todos os blocos citáveis e todas as normas das leis presentes')
