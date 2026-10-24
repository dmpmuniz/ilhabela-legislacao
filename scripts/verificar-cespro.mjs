// verificar-cespro.mjs — compara o export do NotebookLM com o portal Cespro.
//
// O export é derivado de `leis/`, que veio do Cespro. Esta é a conferência de
// fonte: baixa o diploma oficial e compara título, ementa, status e corpo de
// cada bloco. Substitui o antigo checklist humano (`REVISAO-HUMANA.md`).
//
// Uso:
//   npm run verificar:cespro                    # 1 norma por parte (41)
//   npm run verificar:cespro -- --tudo          # todas as 35.776
//   npm run verificar:cespro -- --parte leis-2015-2026 --amostra 3
//   npm run verificar:cespro -- --limite 10     # smoke test
//
// A API é a mesma de `scripts/atualizar.ts` (content-diploma): POST em
// `/_data/api.php?cdMunicipio=…&cdDiploma=…&operacao=content-diploma`.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { urlDiploma, corpoDiploma, extrairDiploma, compararDiploma } from './lib/cespro.ts'
import { chamarApi } from './atualizar.ts'

const PASTA = 'notebooklm'
const args = parseArgs({
  options: {
    tudo: { type: 'boolean', default: false },
    amostra: { type: 'string' },
    parte: { type: 'string' },
    workers: { type: 'string' },
    limite: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
}).values

if (args.help) {
  console.log(`Uso: npm run verificar:cespro [-- --tudo | --amostra N] [--parte trecho] [--workers N] [--limite N]

  --tudo        compara todos os blocos (35.776); sem ele, 1 por parte
  --amostra N   blocos por parte (default 1; ignorado com --tudo)
  --parte txt   só partes cujo nome contém txt
  --workers N   pedidos em paralelo (default 16)
  --limite N    para depois de N blocos (smoke test)`)
  process.exit(0)
}

const amostra = Math.max(1, Number(args.amostra ?? 1))
const workers = Math.max(1, Number(args.workers ?? 16))
const limite = args.limite ? Math.max(1, Number(args.limite)) : Infinity

const arquivos = (await readdir(PASTA))
  .filter(f => f.endsWith('.md') && !['00-INSTRUCOES.md', '01-INDICE-GERAL.md'].includes(f))
  .filter(f => !args.parte || f.includes(args.parte))
  .sort()

if (!arquivos.length) throw new Error('nenhuma parte encontrada — rode `npm run notebooklm` primeiro')

const RE_BLOCO = /^# (.+)\n\n> \*\*Ref:\*\* ([^ ]+) · \*\*Tipo:\*\* (.+?) · \*\*Ano:\*\* (\d+) · \*\*Status:\*\* (.+)\n((?:> .*\n|\n)*)/gm

function parseBlocos(texto) {
  const blocos = []
  for (const m of texto.matchAll(RE_BLOCO)) {
    const meta = m[6]
    const campo = (rotulo) => {
      const l = meta.match(new RegExp(`^> \\*\\*${rotulo}:\\*\\* (.*)$`, 'm'))
      return l ? l[1] : null
    }
    const inicio = m.index + m[0].length
    const resto = texto.slice(inicio)
    const fim = resto.search(/\n# .+\n\n> \*\*Ref:\*\*/)
    const corpo = (fim < 0 ? resto : resto.slice(0, fim)).replace(/\n---\s*$/, '').trim()
    blocos.push({
      titulo: m[1],
      ref: m[2],
      status: m[5],
      ementa: campo('Ementa'),
      fonte: campo('Fonte'),
      corpo,
    })
  }
  return blocos
}

/** n blocos igualmente espaçados; com n=1, o do meio (determinístico). */
function amostrar(blocos, n) {
  if (n >= blocos.length) return blocos
  const passo = blocos.length / n
  return Array.from({ length: n }, (_, i) => blocos[Math.floor((i + 0.5) * passo)])
}

const jobs = []
for (const nome of arquivos) {
  const texto = await readFile(join(PASTA, nome), 'utf8')
  const blocos = parseBlocos(texto)
  const escolhidos = args.tudo ? blocos : amostrar(blocos, amostra)
  for (const b of escolhidos) jobs.push({ parte: nome, ...b })
}
const selecionados = jobs.slice(0, limite)

const sleepJitter = () => {
  const min = Number(process.env.SCRAPER_SLEEP_MIN ?? 0.1) * 1000
  const max = Math.max(Number(process.env.SCRAPER_SLEEP_MAX ?? 0.3) * 1000, min)
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)))
}

function primeiraDiferenca(a, b) {
  const x = a.trim()
  const y = b.trim()
  const n = Math.min(x.length, y.length)
  for (let i = 0; i < n; i++) {
    if (x[i] !== y[i]) {
      const ini = Math.max(0, i - 40)
      return `posição ${i}: ${JSON.stringify(x.slice(ini, i + 40))} != ${JSON.stringify(y.slice(ini, i + 40))}`
    }
  }
  return `tamanho ${x.length} != ${y.length}`
}

async function verificar(job) {
  let cdMunicipio, id
  try {
    const u = new URL(job.fonte)
    cdMunicipio = u.searchParams.get('cdMunicipio')
    id = u.searchParams.get('cdDiploma')
  } catch {
    // fonte ausente/malformada cai no erro abaixo
  }
  if (!cdMunicipio || !id) return { parte: job.parte, ref: job.ref, erros: ['fonte sem cdMunicipio/cdDiploma'] }

  try {
    const api = await chamarApi(urlDiploma(cdMunicipio, id), corpoDiploma(cdMunicipio), cdMunicipio)
    const remoto = extrairDiploma(api, {
      ds_title: api.ds_title_diploma,
      ds_resumo: api.dados_extra?.tx_ementa,
      ds_status: api.dados_diploma_original?.ds_situacao,
    })
    const erros = compararDiploma(
      { titulo: job.titulo, ementa: job.ementa, status: job.status, corpo: job.corpo },
      remoto,
    )
    if (remoto && erros.includes('corpo')) {
      erros[erros.indexOf('corpo')] = `corpo: ${primeiraDiferenca(job.corpo, remoto.corpo)}`
    }
    return {
      parte: job.parte,
      ref: job.ref,
      erros,
      semStatus: !api.dados_diploma_original?.ds_situacao,
    }
  } catch (e) {
    return { parte: job.parte, ref: job.ref, erros: [`rede: ${e.message}`] }
  }
}

console.log(
  `Conferindo ${selecionados.length.toLocaleString('pt-BR')} bloco(s) em ${arquivos.length} parte(s) ` +
  `contra o Cespro (${workers} workers)…`,
)

const fila = [...selecionados]
const resultados = []
let concluidos = 0
const inicio = Date.now()

async function trabalhador() {
  while (fila.length) {
    const job = fila.shift()
    resultados.push(await verificar(job))
    concluidos++
    if (concluidos % 500 === 0) {
      const seg = ((Date.now() - inicio) / 1000).toFixed(0)
      process.stderr.write(`\r${concluidos}/${selecionados.length} (${seg}s)`)
    }
    await sleepJitter()
  }
}

await Promise.all(Array.from({ length: Math.min(workers, selecionados.length) }, trabalhador))
if (concluidos >= 500) process.stderr.write('\n')

const falhas = resultados.filter(r => r.erros.length)
const semStatus = resultados.filter(r => r.semStatus).length
const seg = ((Date.now() - inicio) / 1000).toFixed(0)

// Relatório completo em idx/ (derivado, fora do git): o stdout corta em 100.
await mkdir('idx', { recursive: true })
await writeFile(
  'idx/verificacao-cespro.json',
  JSON.stringify({
    geradoEm: new Date().toISOString(),
    total: resultados.length,
    conformes: resultados.length - falhas.length,
    semStatus,
    falhas,
  }, null, 2),
)

console.log(
  `\n${(resultados.length - falhas.length).toLocaleString('pt-BR')}/${resultados.length.toLocaleString('pt-BR')} conformes ` +
  `(${seg}s${semStatus ? `, ${semStatus} sem status no portal` : ''})`,
)

if (falhas.length) {
  console.log(`\n${falhas.length.toLocaleString('pt-BR')} divergência(s):`)
  for (const f of falhas.slice(0, 100)) console.log(`  ✗ ${f.parte} :: ${f.ref} — ${f.erros.join('; ')}`)
  if (falhas.length > 100) console.log(`  … +${(falhas.length - 100).toLocaleString('pt-BR')}`)
  process.exitCode = 1
} else {
  console.log('✓ todos os blocos conferem com o Cespro')
}
