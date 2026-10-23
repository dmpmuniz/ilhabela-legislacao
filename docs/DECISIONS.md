# Decisões — ADRs do projeto de leis

Registro das decisões do **acervo de Ilhabela + export NotebookLM**.

## ADR-01 — Um repositório, quatro pastas

**Decisão:** o repo é público e guarda tudo o que precisa para ser mantido:
`leis/` + `notebooklm/` (dados) e `docs/` + `scripts/` (documentação e
ferramentas, para agentes de LLM e pessoas trabalharem no próprio acervo).

**Por quê:** manter ferramenta longe do dado exigia um segundo repositório e
uma sincronização manual a cada mudança. Com a documentação e os
scripts no mesmo repo, qualquer agente/clonagem reproduz o pipeline na hora.
Derivados (`idx/`, `REVISAO-HUMANA.md`) ficam fora do git.

## ADR-02 — `leis/` é a pasta canônica

**Decisão:** o acervo vive em `leis/`, tanto no repo público quanto no clone de
trabalho. O pipeline usa `leis/` como padrão (`--laws leis`).

**Por quê:** o repo público já publica `leis/`; usar o mesmo nome no pipeline
elimina o mapeamento `corpus/` → `leis/` na hora de publicar.

## ADR-03 — Zero dependências de runtime

**Decisão:** Node.js ≥ 22.6 com `--experimental-strip-types`; nenhuma
dependência de runtime, nenhum build.

**Por quê:** instala em qualquer máquina, sem supply chain, sem `npm install`.

## ADR-04 — Busca BM25 lexical + sinônimos

**Decisão:** índice invertido BM25 com campos ponderados, stopwords e stemmer
pt-BR, alimentado por `aliases` e palavras-chave. Embeddings só se o recall
medido for insuficiente.

**Por quê:** BM25 é offline, determinístico, barato, explicável e rápido. Como
só casa vocabulário literal, o dicionário de sinônimos é essencial.

## ADR-05 — Enriquecimento determinístico + curadoria manual

**Decisão:** o `enrich` faz só a parte determinística (refs, aliases, datas,
keywords por dicionário). A geração semântica de palavras-chave é manual, com o
prompt de `docs/ENRIQUECIMENTO.md`.

**Por quê:** 35 mil chamadas de LLM são custo/risco pontual; o resultado fica
salvo no arquivo e não precisa ser refeito a cada execução.

## ADR-06 — Schema v1.1 pragmático

**Decisão:** superset retrocompatível do formato real do scraper, com poucos
campos de alto valor (`ref`, `aliases`, `palavras_chave`, `tags`, `status`,
`data_vigencia`).

**Por quê:** a spec v2.0 era sobre-engenharia que o corpus real nunca seguiu.

## ADR-07 — Separar campo gerado (`_auto`) de curadoria

**Decisão:** `palavras_chave_auto`/`tags_auto` são substituídos a cada
`enrich`; `palavras_chave`/`tags` são de curadoria e nunca são tocados. Índice e
manifest usam a união.

**Por quê:** idempotência sem apagar curadoria.

## ADR-08 — Referência única e Lei Orgânica canônica

**Decisão:** `ref` é sempre derivado do título oficial; colisões de número/ano
recebem sufixo `-2`/`-3`. A Lei Orgânica é `ilh-1990-lo-000` com tipo
`lei_organica`.

**Por quê:** citação inequívoca. O separador de milhar pt-BR já foi lido como
decimal e fez milhares de normas compartilharem a mesma ref.

## ADR-09 — "Efeitos a partir de", não "entrada em vigor"

**Decisão:** o campo `data_vigencia` é exibido como **"Efeitos a partir de"**.

**Por quê:** 87,5% das datas derivadas são retroatividade; "entrada em vigor"
induziria a erro.

## ADR-10 — 43 fontes no NotebookLM

**Decisão:** 41 partes temáticas + `00-INSTRUCOES.md` + `01-INDICE-GERAL.md`.

**Por quê:** partes menores e nomeadas melhoram a recuperação; o índice dá o
mapa tema → parte; as instruções ensinam a respeitar o `status` e a citar
`ref` + `url_fonte`.

**Revisão de 23/10/2026:** a varredura de volume separou quatro clusters que
estavam no catch-all — decretos de exoneração (1.845), portarias de
provimento/posse (223), portarias disciplinares (230) e adicionais (358) —
levando de 41 para 43 fontes, ainda abaixo do teto de 48.

## ADR-11 — Revisão humana obrigatória

**Decisão:** nenhuma geração é considerada pronta sem o checklist
`REVISAO-HUMANA.md` marcado por uma pessoa.

**Por quê:** curadoria jurídica não é só script; uma classificação errada pode
levar a uma citação errada.

## ADR-12 — Referências cruzadas na fase 2

**Decisão:** `revoga`/`altera`/`referencia` entre normas ficam para a fase 2.

**Por quê:** alto valor jurídico, mas alto custo e fragilidade de extração;
primeiro consolidar schema, manifest e busca.

## ADR-13 — Nada de dados pessoais no acervo

**Decisão:** o repo público não guarda chaves, conversas, configuração local ou
documentos pessoais. `config.json`, `Documentos/` e `idx/` ficam fora do git.

**Por quê:** o acervo é dado público; dados pessoais têm outro dono e outro
ciclo de vida.
