# Plano de Ação — State of the Art: NotebookLM para Legislação Municipal de Ilhabela/SP

> **Objetivo:** entregar confiabilidade e precisão máxima no Google NotebookLM
> (Gemini Notebook) para consulta jurídica das 35.776 normas municipais de
> Ilhabela/SP, com base em pesquisa acadêmica e boas práticas de RAG.
>
> **Estado (23/10/2026):** as **43 fontes estão geradas e validadas** neste repo
> (refs únicas 35.776/35.776, 0 erros, 30 normas amostradas em 3 lotes sem
> falha — protocolo em `VALIDACAO-PARTES.md`). Pendentes: Lote 5 (upload +
> 10 perguntas-caveira no Gemini Notebook, ex-NotebookLM) e Lote 6 (push).
> A conferência de fonte é automática: `npm run verificar:cespro`.
> **Aprofundamento teórico (out/2026):** [`RAG-NOTEBOOKLM.md`](RAG-NOTEBOOKLM.md) —
> como o Gemini Notebook recupera informação e as alavancas do acervo.

---

## 1. Diagnóstico

### 1.1 Estado inicial (antes desta execução)

- **35.776 normas** em `leis/` (espelho integral do portal Cespro)
- **23 partes genéricas** (~430k palavras cada, sem nome descritivo)
- **1 arquivo de instruções**, **nenhum índice geral**, **nenhum cabeçalho por parte**

| # | Problema | Evidência | Impacto |
|---|---|---|---|
| 1 | Partes genéricas sem tema | `parte-01.md` não diz nada ao retriever | busca híbrida não filtra por tema |
| 2 | Sem índice geral | não existe mapa "assunto → parte" | modelo não sabe onde procurar |
| 3 | Partes no limite do teto | arquivos de ~430k palavras | "lost in the middle" e citações erradas |
| 4 | Sem cabeçalho descritivo | cada parte não lista o que contém | retriever sem pistas de conteúdo |
| 5 | Refs duplicadas | 18 diplomas de mesmo número/ano | citação ambígua (dois atos, uma ref) |
| 6 | Alucinação de citação | ~13% (AI Tools Guidebook, 2026) | resposta jurídica insegura |

### 1.2 Estado atual (verificado)

- 35.776 normas · **0 erros** de validação · **refs únicas 35.776/35.776**
- **41 partes temáticas** + `00-INSTRUCOES.md` + `01-INDICE-GERAL.md` = **43 fontes**
- maior arquivo: **394.876 palavras** (teto de 500k do NotebookLM)
- 6.081 normas com palavras-chave automáticas (`palavras_chave_auto`; 0 curadas); 2.467 com data de efeitos; 18 refs desempatadas (`-2`/`-3`)
- índice com 906 palavras; instruções com 509 palavras
- `npm test`: **70/70** · `scripts/verificar-saida.mjs`: saída íntegra (título e ementa conferidos)

---

## 2. Fundamentação (pesquisa)

### 2.1 Como o NotebookLM funciona

Pipeline de 5 etapas: **chunking** (≈1 parágrafo) → **embedding** → **busca híbrida**
(semântica + palavra-chave) → **re-ranking** (BGE reranker) → **geração** (Gemini,
contexto de 1M tokens).

**Implicação:** o modelo **não lê o arquivo inteiro** — lê os *chunks* recuperados.
Nome do arquivo, cabeçalho e metadados determinam o que ele consegue achar.

### 2.2 O que a pesquisa recomenda

| Paper | Conclusão | Aplicação |
|---|---|---|
| Adaptive Chunking (LREC 2026) | chunks com coesão, integridade e tamanho | normas agrupadas por tema e época |
| Grounded in Law (PROPOR 2026, pt-BR) | retrieval híbrido + auditoria de referências; 81,7% de resolução | `ref` + `url_fonte` em toda norma |
| Metadata-Driven Multi-Hop RAG (COMPSAC 2026) | metadados + taxonomia → 90,4% context recall | nome descritivo + cabeçalho + `status` |
| Graph RAG for Legal Norms (2025) | hierarquia do documento como espinha dorsal | artigos preservados (`##### Art.`) |
| Topic-Aligned Chunking (2026) | 0,93 faithfulness em textos legais | partes por tipo + época |
| HiChunk (ACL 2026) | chunking hierárquico + auto-merge | cabeçalho hierárquico por parte |
| NotebookLM Guide (2025) | "15–20 fontes relevantes > 50 soltas" | mitigado por nomes/cabeçalhos (ver §3) |
| Fast.io (2026) | precisão cai perto do limite de fontes | 43 fontes, cada uma ≤500k palavras |
| Villum Foundation (2025) | bom para resumir, não para extrair detalhe | verificação das citações contra o Cespro |
| Stäbler et al. (IEEE 2025) | janela 512 tokens + overlap preserva estrutura | artigos inteiros, sem corte |

### 2.3 Limites do NotebookLM (confirmados)

| Limite | Valor |
|---|---|
| Contexto do modelo | 1M tokens (~750k palavras) |
| Fontes por notebook (grátis) | 50 |
| Palavras por fonte | 500.000 |
| Navegação web no chat | não |
| API / MCP | não existe |
| Custom Goals | até 5.000 caracteres |

---

## 3. Estrutura final — 43 documentos (decisão do usuário)

A recomendação de 15–20 fontes foi **substituída pela decisão do usuário**
(~40 documentos de leis + 1 de instruções). O risco de diluição é mitigado por:
nome de arquivo descritivo, cabeçalho com amostra + temas, `status` por norma e
índice-geral navegável. Cada fonte fica **abaixo de 500k palavras**.

| Grupo | Partes | Normas |
|---|---|---|
| Lei Orgânica e Emendas | `lei-organica-e-emendas-1990.md` | 1 |
| Estatuto dos Servidores e Alterações | `estatuto-dos-servidores-e-alteracoes-2003-2026.md` | 18 |
| Leis Municipais | `leis-1956-2003.md`, `leis-2003-2015.md`, `leis-2015-2026.md`, `leis-2026.md` | 1.871 |
| Leis Complementares | `leis-complementares-2001-2026.md` | 60 |
| Decretos Municipais | `decretos-1975-2013.md` … `decretos-2025-2026.md` (5) | 3.715 |
| Decretos de Nomeação e Exoneração | `decretos-de-nomeacao-e-exoneracao-1995-2010.md` … `-2024-2026.md` (5) | 7.262 |
| Portarias de Readaptação | `portarias-de-readaptacao-2017-2026.md` | 191 |
| Portarias de Nomeação e Exoneração | `portarias-de-nomeacao-e-exoneracao-2016-2026.md` | 674 |
| Portarias de Provimento e Posse | `portarias-de-provimento-e-posse-2023-2026.md` | 223 |
| Portarias Disciplinares | `portarias-disciplinares-2018-2026.md` | 230 |
| Portarias de Férias e Licenças | `portarias-de-ferias-e-licencas-2015-2017.md` … `-2024-2026.md` (7) | 13.411 |
| Portarias de Designação e Comissões | `portarias-de-designacao-e-comissoes-2015-2025.md` | 959 |
| Portarias de Gratificação, Adicionais e Prêmios | `portarias-de-gratificacao-e-premios-2015-2026.md` | 794 |
| Portarias Diversas | `portarias-diversas-2015-2020.md`, `-2020-2026.md` | 2.786 |
| Resoluções e Atos Especiais | `resolucoes-e-atos-especiais-1805-2024.md` | 13 |
| Leis Revogadas | `leis-revogadas-1956-2003.md`, `-2003-2024.md` | 519 |
| Decretos Revogados | `decretos-revogados-1997-2022.md`, `-2022-2026.md` | 1.119 |
| Portarias Revogadas | `portarias-revogadas-2015-2026.md` | 392 |
| Normas Expiradas, Anuladas, Inconstitucionais e Suspensas | `normas-expiradas-e-cassadas-1956-2007.md` … (3) | 1.538 |
| **Total** | **41 partes** | **35.776** |

### 3.1 Padrão de cada parte

1. **Nome**: tipo no plural + período (`leis-2003-2015`), sem ordinal quando o período já distingue.
2. **Cabeçalho**: título humano acentuado, amostra de 40 normas distribuída pelo período,
   temas frequentes (palavras-chave + ementa, sem boilerplate/nomes), período, contagem.
3. **Bloco de norma**: título oficial + `ref` única + tipo + ano + status + ementa +
   `Efeitos a partir de` (quando derivável) + `url_fonte` + palavras-chave.
4. **Corpo**: texto integral, com a hierarquia de artigos preservada.

> **Lei Orgânica:** as emendas estão consolidadas dentro do documento da LO
> ("Inserido pela Emenda … nº 01/2011") — não existem arquivos separados no Cespro.

---

## 4. Lotes — execução

| Lote | O quê | Estado | Evidência |
|---|---|---|---|
| 1 | Partes temáticas | **executado** | 41 partes, 35.776 normas, máx. 395k palavras |
| 2 | Índice geral | **executado** | inventário completo + mapa assunto → tipo |
| 3 | Metadados por norma | **executado** | 6.081 com palavras-chave automáticas; 2.467 com data de efeitos; refs `-2`/`-3` |
| 4 | Instruções v2 | **executado** | 13 regras, 509 palavras |
| 5 | Validação empírica | **pendente** | 10 perguntas-caveira no NotebookLM; fonte conferida por `verificar:cespro` |
| 6 | Publicação | **pendente** | push exige token do GitHub |

### Lote 5 — metodologia (quando houver upload)

1. Enviar as 43 fontes ao NotebookLM.
2. Fazer as 10 perguntas-caveira (poda, ZU2, alvará, readaptação,
   LC 789/2010, Lei 745/2009, meio ambiente, IPTU, árvores nativas, código de obras).
3. Comparar com o gabarito do BM25 local (`npm run search -- --q "…" --k 3`).
4. Critérios: ≥80% de acerto, ≥90% de citações corretas, ≤1 falso negativo,
   **zero** ref inexistente.

### Lote 6 — publicação

1. Gerar as partes (`npm run notebooklm`) e conferir (`npm run notebooklm:check`).
2. Commitar as 43 fontes, scripts e docs (as partes são regeneráveis, mas versionadas para o release).
3. Push para o GitHub (`dmpmuniz/ilhabela-legislacao`).

---

## 5. Verificação contra o Cespro (automática)

**Nenhum lote é "pronto" sem conferir a fonte oficial.** O
`npm run verificar:cespro` baixa o diploma do Cespro e compara, bloco a bloco,
título, ementa, status e corpo com o export. Sem `--tudo`, cobre 1 norma por
parte (41); com `--tudo`, as 35.776.

> Antes da conferência de fonte, o agente valida classificação e integridade
> por lotes de amostragem: [`VALIDACAO-PARTES.md`](VALIDACAO-PARTES.md).

- **Lote 1:** 1 norma por parte (41) — título, ementa, status, integridade do texto
- **Lote 2:** índice inteiro — inventário, mapa de assuntos, totais
- **Lote 3:** 20 palavras-chave — descrevem o assunto?
- **Lote 4:** instruções inteiras — regra contraditória ou ambígua?
- **Lote 5:** todas as 10 respostas do NotebookLM — citação bate com a norma real?

A conferência de fonte é automática; a interpretação jurídica final é do usuário.

---

## 6. Métricas

| Métrica | Meta | Situação |
|---|---|---|
| Fontes no notebook | 43 (decisão do usuário) | **43** |
| Partes temáticas | 41 | **41** |
| Maior fonte | ≤500k palavras | **394.876** |
| Normas no acervo | 35.776 | **35.776/35.776** |
| Refs únicas | 100% | **35.776/35.776** |
| Índice geral | ≤5k palavras | **906** |
| Instruções | ≤3k palavras | **509** |
| Palavras-chave | normas-chave cobertas | **6.081** (191/191 readaptações) |
| Acerto nas perguntas-caveira | ≥80% | pendente (Lote 5) |
| Citações corretas | ≥90% | pendente (Lote 5) |
| Falso negativo | ≤1 em 10 | pendente (Lote 5) |
| Ref inexistente | 0 | pendente (Lote 5) |

---

## 7. Auditoria de 22/10/2026 — o que foi corrigido

1. **Refs duplicadas** (18 diplomas de mesmo número/ano): desempate determinístico
   `-2`/`-3` no `enrich`. Validação caiu de **35 erros para 0**. Caso real:
   três atos distintos numerados "Portaria 001/2020" (COVID) — antes dividiam a
   mesma ref; agora `ilh-2020-port-001`, `-2` e `-3`.
2. **Lei Orgânica fora da própria parte**: o tipo `lei_orgâ` (typo do portal) virou
   `lei_organica`; a ref passou de `ilh-1990-lei-000` para `ilh-1990-lo-000`.
3. **Falso positivo de classificação**: a regra `/lei orgânica/` na ementa colocava
   18 leis/decretos que apenas *citam* a LO dentro da parte "Lei Orgânica". Agora a
   parte contém só a LO (com as emendas consolidadas).
4. **Cabeçalhos**: nomes humanos acentuados, amostra de 40 normas distribuída pelo
   período, temas por frequência com stopwords (meses, nomes próprios, boilerplate).
5. **Metadados**: rótulo correto `Efeitos a partir de` (87,5% das datas são
   retroatividade, não entrada em vigor); merge de `palavras_chave` manuais.
6. **Formatação**: linha em branco indevida antes de `Palavras-chave` corrigida.
7. **Verificação independente**: `scripts/verificar-saida.mjs` confere blocos,
   refs, fontes, período do cabeçalho e teto de palavras — de fora do gerador.
8. **App**: manifest e índice BM25 reconstruídos com as refs novas.

---

### 7.1 Achados da revisão de 23/10/2026 (classificação)

A amostragem de 30 normas passou, mas a varredura do corpus inteiro revelou
clusters grandes fora do grupo de pessoal. **Aplicado em 23/10/2026**: a
contagem foi de 41 para **43 fontes** e a amostragem foi refeita
([`RELATORIO-VALIDACAO.md`](RELATORIO-VALIDACAO.md)).

| Cluster | Normas | Antes | Aplicado |
|---|---|---|---|
| Decretos de exoneração | 1.845 (de 2.119; 274 já em nomeação) | `decretos-*` gerais | fundidos em `decretos-de-nomeacao-e-exoneracao-*` (5 partes) |
| Portarias de provimento/posse/demissão | 223 | `portarias-diversas-*` (rótulo `concurso`) | parte própria `portarias-de-provimento-e-posse` |
| PAD e sindicância | 230 (185 PAD + 45 sindicância, com sobreposição) | `portarias-diversas-*` | parte própria `portarias-disciplinares` |
| Adicionais | 358 (356 por tempo de serviço + 2 insalubridade) | `portarias-diversas-*` | movidos para `portarias-de-gratificacao-e-premios` ("Gratificações, Adicionais e Prêmios") |

Efeito real: **41 → 43 fontes** (2 partes novas; os decretos gerais passaram de
6 para 5 partes e os de nomeação de 4 para 5, anulando-se), dentro do teto de
48. O título de `normas-expiradas-e-cassadas` agora inclui "Inconstitucionais".

---

## 8. Fontes consultadas

| # | Fonte | Ano | Achado principal |
|---|---|---|---|
| 1 | [Google Blog — NotebookLM](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-custom-personas-engine-upgrade/) | 2025 | contexto de 1M tokens; custom goals |
| 2 | [Fast.io — NotebookLM limits](https://fast.io/resources/notebooklm-context-window/) | 2026 | 50 fontes; 500k palavras/fonte; 200MB/fonte |
| 3 | [Locul.ai — How NotebookLM works](https://locul.ai/blog/how-does-notebooklm-work) | 2026 | pipeline chunking → embedding → híbrido → rerank → geração |
| 4 | [NotebookLM Teardown](https://assets.nextleap.app/submissions/NotebookLLMTeardown2-c41bf90d-2c8e-4618-b73e-fd4e124b9c4c.pdf) | 2025 | busca híbrida; BGE reranker; chunking com contexto |
| 5 | [NotebookLM Comprehensive Guide](https://zaidalhuda.github.io/notebooklm-guide/NotebookLM_Comprehensive_Guide.pdf) | 2025 | "15–20 fontes relevantes > 50 soltas" |
| 6 | [Villum Foundation — AI in Literature Review](https://villumfonden.dk/sites/default/files/inline-files/ai_literature_review_white_paper_2.pdf) | 2025 | não recomendado para extração detalhada; ~13% alucinação |
| 7 | [AI Tools Guidebook — Multi-Source Synthesis](https://aitoolsguidebook.com/en/articles/ai-multi-source-synthesis/) | 2026 | ~13% alucinação; conferir citações |
| 8 | [Fello.ai — NotebookLM Update](https://felloai.com/notebooklm-update-1m-token-chat-goals-saved-history/) | 2026 | custom goals 5.000 chars; histórico salvo |
| 9 | [App Lab — Best AI for Long Documents](https://app-lab.ai/blog/best-ai-for-long-documents/) | 2026 | citações por página; liderança em multi-fonte |
| 10 | [Stäbler et al. — Chunking Strategies (IEEE)](https://ieeexplore.ieee.org/document/11125724) | 2025 | 512 tokens + overlap = melhor IoU |
| 11 | [Adaptive Chunking (LREC 2026)](https://aclanthology.org/2026.lrec-1.903) | 2026 | 5 métricas de qualidade de chunk |
| 12 | [Grounded in Law (PROPOR 2026, pt-BR)](https://aclanthology.org/2026.propor-2.9) | 2026 | retrieval híbrido + auditoria; 81,7% de resolução |
| 13 | [Metadata-Driven Multi-Hop RAG (COMPSAC 2026)](https://www.computer.org/csdl/proceedings-article/compsac/2026/449700a164/2j6zbZaou08) | 2026 | metadados + taxonomia → 90,4% recall |
| 14 | [Graph RAG for Legal Norms (arXiv)](https://arxiv.org/pdf/2505.00039v5) | 2025 | hierarquia do documento como grafo temporal |
| 15 | [Cross-Document Topic-Aligned Chunking (arXiv)](https://arxiv.org/pdf/2601.05265v1) | 2026 | 0,93 faithfulness em textos legais |
| 16 | [HiChunk (ACL 2026)](https://aclanthology.org/2026.acl-long.1372.pdf) | 2026 | chunking hierárquico + auto-merge |
| 17 | [North Denver Tribune — Google e "RAG"](https://northdenvertribune.com/ai-analysis/google-engineers-deliberately-avoid-calling-notebooklm-rag/) | 2026 | "source-grounded" em vez de RAG |

---

## 9. O que não chequei

- O comportamento real do NotebookLM com as 43 fontes (só o upload e o Lote 5 respondem).
- A interpretação jurídica final — a conferência de fonte é automática; o uso do acervo é do usuário.
- O push para o GitHub — depende de token que não existe neste ambiente.

---

*Plano criado em 22/10/2026 e revisado na auditoria completa da mesma data.
Baseado em pesquisa acadêmica (IEEE, ACL, LREC, PROPOR, COMPSAC) e documentação
oficial do Google NotebookLM / Gemini Notebook.*
