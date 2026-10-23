// gerar-revisao.mjs — checklist de revisão HUMANA dos arquivos gerados.
//
// Curadoria não é só script (regra do projeto): este documento pega uma norma
// por parte, 20 palavras-chave e 10 perguntas-caveira com gabarito do BM25
// local, para conferência no link oficial e, depois, no NotebookLM.
//
// Uso: node scripts/gerar-revisao.mjs (da raiz do repo)

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const PASTA = 'notebooklm'
const data = new Date().toLocaleDateString('pt-BR')

const arquivos = (await readdir(PASTA)).filter(f => f.endsWith('.md')).sort()
const partes = []
for (const nome of arquivos) {
  const texto = await readFile(join(PASTA, nome), 'utf8')
  const h1 = texto.split('\n', 1)[0]
  if (!h1.startsWith('# ') || !h1.endsWith('— Legislação de Ilhabela/SP')) continue

  // blocos de norma: título + linha de metadados (+ linhas > seguintes)
  const blocos = [...texto.matchAll(
    /^# (.+)\n\n> \*\*Ref:\*\* ([^ ]+) · \*\*Tipo:\*\* (.+?) · \*\*Ano:\*\* (\d+) · \*\*Status:\*\* (.+)\n((?:> .*\n|\n)*)/gm
  )].map(m => ({
    titulo: m[1],
    ref: m[2],
    tipo: m[3],
    ano: m[4],
    status: m[5],
    url: (m[6].match(/^> \*\*Fonte:\*\* (https?:\S+)/m) ?? [])[1] ?? '',
    palavras: (m[6].match(/^> \*\*Palavras-chave:\*\* (.+)$/m) ?? [])[1] ?? '',
  }))
  partes.push({ nome, titulo: h1.slice(2), blocos })
}

if (partes.length === 0) throw new Error('nenhuma parte gerada encontrada — rode o gerador primeiro')
const totalBlocos = partes.reduce((a, p) => a + p.blocos.length, 0)
if (totalBlocos === 0) throw new Error('partes sem blocos de norma — saída inválida')

// 1 norma por parte: a do meio (determinístico e representativo)
const amostraPartes = partes.map(p => ({ ...p, norma: p.blocos[Math.floor(p.blocos.length / 2)] }))

// 20 palavras-chave espalhadas por todas as partes
const comPalavras = partes.flatMap(p => p.blocos.filter(b => b.palavras).map(b => ({ ...b, arquivo: p.nome })))
const passo = Math.max(1, Math.floor(comPalavras.length / 20))
const amostraPalavras = comPalavras.filter((_, i) => i % passo === 0).slice(0, 20)

// perguntas-caveira: gabarito = top 3 do BM25 local
const perguntas = [
  'poda de jaqueira',
  'recuo frontal ZU2',
  'prazo para expedição de alvará',
  'readaptação funcional 2026',
  'Lei Complementar 789/2010 em vigor',
  'Lei 745/2009 dispõe sobre o quê',
  'normas ambientais municipais',
  'IPTU lançamento e cobrança',
  'proteção de árvores nativas',
  'alvará de construção código de obras',
]
const gabaritos = []
for (const q of perguntas) {
  const json = execFileSync(process.execPath, [
    '--experimental-strip-types', 'scripts/search.ts', '--q', q, '--k', '3', '--json', 'true',
  ], { encoding: 'utf8' })
  gabaritos.push({ q, hits: JSON.parse(json) })
}

const linhas = [
  `# Revisão humana — checklist da geração (${data})`,
  ``,
  `> **Regra do projeto:** curadoria não é só script. Este checklist é gerado`,
  `> automaticamente, mas **só vale marcado por uma pessoa**. Tempo estimado: 30–45 min.`,
  `> Marque \`[x]\` apenas depois de conferir no link oficial.`,
  ``,
  `## Lote 1 — Partes (1 norma por parte, ${partes.length} partes)`,
  `Para cada linha: abra o link e confira (a) título, (b) ementa/assunto,`,
  `(c) status, (d) se o texto do bloco no arquivo contém os artigos.`,
  ``,
]
for (const p of amostraPartes) {
  const n = p.norma
  linhas.push(`- [ ] \`${p.nome}\` — **${n.titulo}** (${n.ref}, ${n.status.replaceAll('_', ' ')})`)
  linhas.push(`  - <${n.url}>`)
}

linhas.push(
  ``,
  `## Lote 2 — Índice geral`,
  `Abra \`01-INDICE-GERAL.md\` e confira:`,
  ``,
  `- [ ] todas as ${partes.length} partes aparecem no inventário, com período e contagem`,
  `- [ ] a tabela "Onde procurar por assunto" faz sentido para o uso jurídico`,
  `- [ ] os totais por tipo/status batem com a realidade do portal`,
  ``,
  `## Lote 3 — Palavras-chave (amostra de ${amostraPalavras.length})`,
  `Confira se as palavras descrevem mesmo o assunto da norma (não precisam ser exaustivas).`,
  ``,
)
for (const b of amostraPalavras) {
  linhas.push(`- [ ] \`${b.arquivo}\` — **${b.titulo}** (${b.ref}): ${b.palavras}`)
}

linhas.push(
  ``,
  `## Lote 4 — Instruções`,
  `Leia \`00-INSTRUCOES.md\` e marque:`,
  ``,
  `- [ ] as 13 regras não se contradizem nem induzem a erro jurídico`,
  `- [ ] o aviso de IA e a data do retrato estão claros`,
  `- [ ] a regra de status (norma revogada/expirada) está inequívoca`,
  ``,
  `## Lote 5 — Perguntas-caveira (depois do upload no NotebookLM)`,
  `Gabarito = o que a busca local (BM25) encontra. Faça a mesma pergunta no NotebookLM`,
  `e marque se ele citou a norma certa. Divergência não é erro automático — investigue.`,
  ``,
  `| # | Pergunta | Gabarito local (top 3) | NotebookLM acertou? |`,
  `|---|---|---|---|`,
)
gabaritos.forEach(({ q, hits }, i) => {
  const g = hits.map(h => `${h.ref || h.id} — ${h.titulo}`).join('<br>')
  linhas.push(`| ${i + 1} | ${q} | ${g} | [ ] sim / [ ] não / [ ] parcial |`)
})

linhas.push(
  ``,
  `## Lote 6 — Publicação`,
  ``,
  `- [ ] 41 fontes enviadas ao NotebookLM (39 partes + instruções + índice)`,
  `- [ ] as perguntas-caveira foram testadas e as divergências, investigadas`,
  `- [ ] leis e índice regerados (\`npm run pipeline\`), não apenas as partes`,
  `- [ ] commit feito; push pendente de token do GitHub`,
  ``,
  `---`,
  `Gerado por \`scripts/gerar-revisao.mjs\` em ${data} — regenere após qualquer`,
  `mudança nas leis: \`npm run notebooklm:revisao\`.`,
  ``,
)

await writeFile(join(PASTA, 'REVISAO-HUMANA.md'), linhas.join('\n'), 'utf8')
console.log(`REVISAO-HUMANA.md: ${partes.length} partes, ${amostraPalavras.length} palavras-chave, ${perguntas.length} perguntas`)
