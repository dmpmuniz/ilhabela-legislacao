# Legislação Municipal de Ilhabela/SP — em Markdown

**35.776 normas do município de Ilhabela/SP** — o **espelho integral** do portal
público da legislação: leis, decretos, portarias, resoluções e atos de pessoal
(nomeações, exonerações, readaptações, aposentadorias, férias, licenças).
Inclui também as normas que não valem mais (revogadas, expiradas, anuladas,
inconstitucionais e suspensas), cada uma com o seu `status`.

Serve para **pesquisar**, **estudar** e **usar com IA** — inclusive no Google
NotebookLM (hoje **Gemini Notebook**), com um pacote pronto de 43 arquivos.

**Fonte dos dados:** portal público da legislação de Ilhabela/SP no
[Cespro](https://www.cespro.com.br/visualizarLegislacao.php?cdMunicipio=8969).
Os textos legais são domínio público (Lei nº 9.610/1998, art. 8º, I) e a
organização é oferecida sob [CC0 1.0](LICENSE).

> Projeto comunitário, **não oficial** e sem vínculo com a Prefeitura de
> Ilhabela ou com o Cespro.
>
> **Versão atual: v3.1.0 (out/2026).**

## Já usou uma versão anterior? Comece por aqui

Se você já montou um notebook com a versão de **~18 mil** ou de **35 mil
normas**, as fontes antigas **não servem** para a versão atual. O NotebookLM
não atualiza um arquivo já enviado: ele fica parado no tempo. Também não
adianta misturar fontes velhas com novas — isso gera normas duplicadas e
respostas com `status` errado.

Em resumo, faça assim:

1. **Apague todas as fontes antigas** do notebook. Não apague só as que você
   acha que mudaram: apague todas.
2. **Baixe o pacote novo** na página de
   [releases](https://github.com/dmpmuniz/ilhabela-legislacao/releases/latest)
   (`notebooklm-v3.1.0.zip`).
3. **Envie as 43 fontes** da pasta `notebooklm/`: `00-INSTRUCOES.md`,
   `01-INDICE-GERAL.md` e as 41 partes.
4. **Cole o texto de `00-INSTRUCOES.md`** no campo de instruções do notebook
   (o “custom goal”).
5. **Faça uma pergunta de teste** — por exemplo, “A Lei 156/2002 está em
   vigor?” — e confira se a resposta cita a norma e o link.

O passo a passo completo, com o que fazer se algo der errado, está em
**[docs/ATUALIZACAO.md](docs/ATUALIZACAO.md)**.

## O que você recebe

- **35.776 normas** em arquivos `.md`, uma norma por arquivo.
- **43 arquivos prontos** para o NotebookLM: as instruções, o índice e as 41
  partes temáticas.
- **O `status` de cada norma**: dá para separar o que vale hoje do que é
  histórico.
- **Texto integral** e links para a fonte oficial no Cespro.

### Quanto há de cada tipo

| Status | Quantidade | O que significa |
|---|---|---|
| `em_vigor` | 32.198 | Vale integralmente hoje |
| `revogada` | 2.039 | Foi revogada por outra norma |
| `expirada` | 1.516 | A vigência terminou, sem revogação |
| `inconstitucional` | 14 | Declarada inconstitucional em ação direta |
| `suspensa` | 1 | Eficácia suspensa por liminar |
| `anulada` | 8 | Ato anulado pela própria Administração |

Por tipo: **19.717 portarias** (incluindo atos de pessoal), **12.810
decretos**, **3.158 leis**, **77 leis complementares**, **9 portarias
conjuntas**, **3 resoluções**, **1 Lei Orgânica** e **1 registro histórico de
1805**.

**Por que guardar o histórico junto do que está valendo?** Porque um fato
antigo é julgado pela lei da época; cadeias de revogação precisam do texto
revogado; e direitos adquiridos nasceram sob normas que não valem mais. O
`status` resolve a triagem — o histórico não é lixo, é prova.

## Como usar no NotebookLM

Você **não precisa saber programar** para esta parte.

1. Crie um notebook em [notebook.google.com](https://notebook.google.com).
2. Baixe o pacote `notebooklm-v3.1.0.zip` na página de
   [releases](https://github.com/dmpmuniz/ilhabela-legislacao/releases/latest)
   e descompacte.
3. Envie as **43 fontes** da pasta `notebooklm/`:
   `00-INSTRUCOES.md`, `01-INDICE-GERAL.md` e as 41 partes.
4. Abra as configurações do notebook e procure o campo **Custom goal**,
   **Instruções do notebook** ou **Persona**. Cole ali o texto inteiro de
   `00-INSTRUCOES.md`.
5. Faça uma pergunta por vez. Para uma resposta mais confiável, peça: “cite a
   `ref` e o link `url_fonte` de cada norma usada”.

**Não suba a pasta `leis/` no NotebookLM.** Ela tem 35.776 arquivos
individuais e não cabe no limite de fontes. O pacote do NotebookLM é a pasta
`notebooklm/`, com 43 arquivos.

### Por que 43 arquivos?

O Gemini Notebook limita cada fonte a **500.000 palavras** (ou 200 MB). O
acervo tem **10.166.100 palavras**, então foi dividido em 41 partes temáticas
(a maior tem **394.497 palavras**). Com as instruções e o índice, dá **43
fontes** — cabe até no plano gratuito, que aceita 50.

A ordem de upload não importa. O nome do arquivo vira o nome da fonte e é o
que aparece nas citações.

## Como usar sem NotebookLM

Baixe o repositório e abra a pasta `leis/` em qualquer editor. A busca funciona
em todos os arquivos:

```bash
# quem fala de licitação?
grep -ril "licitação" leis/

# o que diz a Lei Orgânica?
cat leis/LEI_ORGANICA_MUNICIPAL_000_1990.md
```

## Antes de usar em algo sério

1. **Confira a data.** É um retrato de **outubro/2026** — leis novas e
   revogações posteriores não estão aqui.
2. **Confira a fonte.** A conversão foi automática e pode conter erros. Antes
   de citar, abra o link `url_fonte` da norma; a versão oficial é a do Cespro
   ou do Diário Oficial.
3. **Confira com um advogado.** Este material é apoio à pesquisa; não substitui
   aconselhamento jurídico.

A compilação é oferecida no estado em que se encontra, sem garantias de
exatidão ou completude — os termos formais estão na [licença CC0](LICENSE).

## Para quem quer clonar ou rodar os scripts (técnico)

Esta parte é para quem vai mexer no pipeline, regerar as fontes ou conferir a
conversão. Se você só quer usar o NotebookLM, pode parar aqui.

### Estrutura do repositório

| Pasta | Conteúdo |
|---|---|
| `leis/` | **35.776 arquivos** `.md` — a fonte de verdade, uma norma por arquivo |
| `notebooklm/` | **41 partes** + `00-INSTRUCOES.md` + `01-INDICE-GERAL.md` = 43 fontes |
| `docs/` | pipeline, schema, decisões (ADRs), plano de curadoria e validação |
| `scripts/` | pipeline, geradores do NotebookLM, schema e testes |
| `idx/` | manifesto e índice BM25 (gerados; não versionados) |

### Requisitos

- **Node.js 22.6 ou superior**
- **zero dependências** (`npm install` não é necessário)
- `npm test` para a suíte automatizada

### Comandos principais

| Comando | Uso |
|---|---|
| `npm test` | testes do pipeline, normalização, classificação e conferência Cespro |
| `npm run check:samples` | pipeline na amostra (deve dar 0 erros) |
| `npm run pipeline` | enrich → validate → manifest → index em `leis/` |
| `npm run atualizar` | importa pacote bruto + sincroniza novas do Cespro + pipeline |
| `npm run atualizar -- --refazer` | rebaixa o corpo de todas as normas do acervo |
| `npm run enrich:force` | reenriquece tudo |
| `npm run notebooklm` | gera as 43 fontes a partir de `leis/` |
| `npm run notebooklm:check` | verifica blocos, refs, fontes, período e teto |
| `npm run verificar:cespro` | compara 1 norma por parte com o portal; `-- --tudo` compara todas |

### Formato de cada norma

Cada arquivo tem um cabeçalho (frontmatter) e o texto integral embaixo:

```markdown
---
id: 200100001
ref: ilh-2001-dec-001
tipo: decreto
numero: 1
ano: 2001
cidade: Ilhabela
estado: SP
esfera: municipal
status: em_vigor
titulo: "DECRETO MUNICIPAL Nº 001, DE 01/01/2001"
ementa: "DISPÕE SOBRE…"
aliases:
  - Decreto 1/2001
palavras_chave_auto:
  - defesa civil
url_fonte: "https://www.cespro.com.br/visualizarDiploma.php?cdMunicipio=8969&cdDiploma=200100001"
versao_formato: "1.1"
---
DECRETO MUNICIPAL Nº 001, DE 01/01/2001
##### Art. 1º
…
```

- `ref` é a referência curta e única: `{sigla}-{ano}-{tipo}-{número}`
  (ex.: `ilh-2001-dec-001`).
- `status`: `em_vigor` · `revogada` · `expirada` · `inconstitucional` ·
  `suspensa` · `anulada`.
- artigos estão marcados como `##### Art. Nº`.
- arquivos com `_2`/`_3` no nome são **dois atos distintos com o mesmo número
  e ano**, publicados em datas diferentes pela fonte. Confira a data antes de
  citar.

### Validação desta versão

- `npm test`: **86/86**
- `npm run notebooklm:check`: **35.776 blocos/refs**, saída íntegra
- `npm run check:samples`: **exit 0**
- Conferência Cespro: **35.776/35.776** (24/10/2026; nenhuma norma mudou
  desde então)

## Créditos

Os dados são públicos do município de Ilhabela/SP, espelhados pelo portal
[Cespro](https://www.cespro.com.br/visualizarLegislacao.php?cdMunicipio=8969).
Este repositório apenas organiza o que já é público e de domínio público.

## Licença

- **Textos legais:** domínio público (Lei nº 9.610/1998, art. 8º, I).
- **Compilação, organização e metadados:** [CC0 1.0 Universal](LICENSE) —
  use, copie, modifique e redistribua livremente, sem pedir permissão.
