# AGENTS.md — guia para o agente de código

Este repositório é o **acervo público de legislação municipal de Ilhabela/SP**
em Markdown + o **export para o Google NotebookLM**. São 35.776 normas: leis,
decretos, portarias, resoluções e atos de pessoal (nomeações, exonerações,
readaptações, aposentadorias, férias, licenças), **incluindo as fora de vigor**
(revogadas, expiradas, anuladas, inconstitucionais) — o `status` de cada norma
resolve a triagem; o histórico fica junto do vigente.

## Estrutura (4 pastas)

| Pasta | O que é | Regenerável? |
|---|---|---|
| `leis/` | 35.776 normas `.md` — a fonte de verdade | via `npm run atualizar` |
| `notebooklm/` | fontes para o Google NotebookLM | via `npm run notebooklm` |
| `docs/` | documentação: pipeline, schema, enriquecimento, decisões (ADRs), plano de curadoria, estudo RAG, validação de partes | não |
| `scripts/` | pipeline, geradores do NotebookLM, schema, testes e amostra | não |

## Regras de ouro

1. **Zero `npm install`** — Node stdlib; Node ≥ 22.6.
2. **Nunca leia `leis/` inteiro** — são 35.776 arquivos. Use `rg`/`grep`
   direcionado, `scripts/samples/` ou o índice BM25.
3. **`leis/` é dado público** — uma norma por `.md`, com frontmatter. Não
   reescreva o corpo à mão; use o pipeline.
4. **Nunca versione dados pessoais** — `Documentos/`, `config.json`, chaves,
   conversas. Não existem neste repo; se aparecerem, ignore.
5. **pt-BR em tudo que o usuário vê**; comentários de código explicam o porquê.
6. **Verificação contra o Cespro** — `npm run verificar:cespro` baixa o
   diploma oficial e compara título, ementa, status e corpo com o export;
   o antigo checklist humano (`REVISAO-HUMANA.md`) foi removido.
7. **Todo bug corrigido ganha teste** com o caso real que o revelou.

## Comandos

| Comando | Uso |
|---|---|
| `npm test` | testes do pipeline (atualizar + normalização) |
| `npm run check:samples` | pipeline na amostra (deve dar 0 erros) |
| `npm run pipeline` | enrich → validate → manifest → index em `leis/` |
| `npm run atualizar` | importa pacote bruto + sincroniza novas do Cespro + pipeline |
| `npm run atualizar -- --refazer` | rebaixa o corpo de todas as normas do acervo (sync completo) |
| `npm run enrich:force` | reenriquece tudo (o npm engole `-- --force`) |
| `npm run notebooklm` | gera as 43 fontes a partir de `leis/` |
| `npm run notebooklm:check` | verifica blocos, refs, fontes, período e teto |
| `npm run verificar:cespro` | compara 1 norma por parte com o portal; `-- --tudo` compara todas |

## Onde mora o quê

| Caminho | Responsabilidade |
|---|---|
| `scripts/*.ts` + `scripts/lib/` | pipeline: ingest/atualizar/enrich/validate/manifest/index/search |
| `scripts/gerar-notebooklm-v2.mjs` | gerador das fontes do NotebookLM |
| `scripts/verificar-saida.mjs` | verificação independente da saída |
| `scripts/verificar-cespro.mjs` | compara a saída com o diploma oficial do Cespro |
| `scripts/schema/` | `law.schema.json` + `sinonimos.pt-BR.json` |
| `scripts/tests/` | testes do pipeline |
| `scripts/samples/` | amostra pequena para smoke test |
| `docs/` | PIPELINE, LAW-SCHEMA, ENRIQUECIMENTO, DECISIONS, plano de curadoria, estudo RAG, validação de partes e relatório de lotes |
| `idx/` | gerado (manifest + BM25); fora do git |

## Contratos que não podem quebrar

- **`ref` única**: `{sigla}-{ano}-{tipo}-{numero}`; colisões ganham `-2`/`-3`.
  A Lei Orgânica é `ilh-1990-lo-000` (tipo `lei_organica`).
- **`status` em toda norma**: `em_vigor`, `revogada`, `expirada`,
  `inconstitucional`, `suspensa`, `anulada`. Nunca cite norma fora de vigor
  como vigente.
- **Datas**: `data_vigencia` é exibido como **"Efeitos a partir de"** (87,5%
  são retroatividade), não "entrada em vigor".
- **Curadoria sagrada**: `palavras_chave`/`tags` nunca são tocados; `_auto` são
  regenerados a cada `enrich`.
- **43 fontes**: 41 partes + `00-INSTRUCOES.md` + `01-INDICE-GERAL.md`; o
  gerador falha se perder norma ou passar do teto de 500k palavras.

## Como mexer

- **Norma nova/atualizada**: `npm run atualizar` (ou coloque o `.md` em `leis/`
  e rode `npm run pipeline`).
- **Nova parte do NotebookLM**: ajuste a classificação/`NOMES` em
  `scripts/gerar-notebooklm-v2.mjs`; rode `npm run notebooklm` e
  `npm run notebooklm:check`; valide os lotes de amostragem do
  `docs/VALIDACAO-PARTES.md` antes de commitar.
- **Nova palavra-chave/sinônimo**: `scripts/schema/sinonimos.pt-BR.json`; o
  `enrich` aplica.
- **Mudança de schema**: `scripts/schema/law.schema.json` + `docs/LAW-SCHEMA.md`
  + `scripts/lib/normalize.ts`; rode `npm run validate`.
- **Documentação**: mantenha os caminhos `leis/` (não `corpus/`).

## Armadilhas já mapeadas

- `npm run pipeline -- --force` **não funciona** (o npm engole a flag); use
  `npm run enrich:force`.
- O gerador apaga só arquivos que ele reconhece; **não** use
  `rm notebooklm/*.md`.
- `notebooklm:check` compara as refs com `leis/`; se o corpus estiver
  desatualizado, o check passa mas o texto está errado.
- `idx/` e `scripts/samples/idx/` são derivados; não commite.
