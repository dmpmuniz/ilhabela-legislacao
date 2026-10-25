# RAG no Gemini Notebook (ex-NotebookLM) — estudo de engenharia

> **Pergunta:** como garantir que o Gemini **sempre encontre** a informação nas
> 43 fontes do acervo (35.776 normas em 41 partes + 00 + 01), e sempre procure nelas?
> Este estudo aprofunda o `plano-curadoria.md` com documentação oficial,
> teardowns, papers 2025–2026 e prática da comunidade.
>
> **Data:** 23/10/2026 · **Nada aqui altera `leis/` nem roda gerador** — é a
> base teórica para as decisões do Lote 5 (upload + perguntas-caveira).

## 1. O produto em outubro/2026

O NotebookLM foi **renomeado para Gemini Notebook em 16/07/2026** — o endereço
agora é `notebook.google.com`. A timeline relevante para este acervo:

| Quando | O quê | Impacto no acervo |
|---|---|---|
| out/2025 | Janela de **1M tokens** no chat, em todos os planos; histórico salvo; **custom goals** para todos | o chat opera sobre os *chunks* recuperados, não sobre o corpus inteiro |
| nov/2025 | Deep Research / Fast Research (busca **web** dentro do notebook) | risco: fonte externa contaminando o grounding (ver §8) |
| dez/2025 | Motor Gemini 3; notebook anexável no app Gemini | — |
| mai/2026 | Docs/Sheets/Slides do Drive passam a **auto-sincronizar**; `.md` enviado continua **estático** (re-upload manual) | nosso ciclo de release: regenerar → re-enviar |
| jun/2026 | Motor Gemini 3.5 | melhora conexão entre documentos bagunçados |
| jul/2026 | Renome para **Gemini Notebook** | documentação e UI mudam de nome |
| ago/2026 | **Copiar notebook inteiro** (fontes + studio) | estratégia de release: notebook público espelhado |
| set/2026 | Cotas **por computação**, refresh a cada **5h** (semanal no teto) | planejar o dia das perguntas-caveira |

### 1.1 Limites oficiais (verificados em 23/10/2026)

| Limite | Free | Plus | Pro | Ultra |
|---|---|---|---|---|
| Fontes por notebook | **50** | 100 | 300 | 500–600 |
| Palavras por fonte | 500.000 (todos os planos) | idem | idem | idem |
| Tamanho por fonte | 200 MB (todos os planos) | idem | idem | idem |
| Notebooks por conta | 100 | 200 | 500 | 500 |
| Uso | padrão | 2× | 4× | 5–20× Pro |

**Fonte:** `support.google.com/gemininotebook/answer/16215270` (fontes e tipos)
e `/answer/17670842` (cotas). As **43 fontes cabem no plano gratuito** com
folga (7 slots). Markdown (`.md`) é tipo de fonte suportado oficialmente.

## 2. Como o Gemini Notebook acha a informação

### 2.1 O que é oficial × o que é inferência

O time do Google **nunca publicou** os detalhes internos (chunking, modelo de
embedding, reranker). Em 20+ aparições públicas eles falam em **"source
grounding"**, não "RAG" — Steven Johnson: *"we would call it RAG, now we call
it source grounding"*. Um único teardown da comunidade descreveu o pipeline;
trate os números internos como **estimativa**, não contrato.

### 2.2 Pipeline (o que a evidência sustenta)

| Etapa | Como funciona | Evidência |
|---|---|---|
| 1. Ingestão | fonte parseada em texto; **cortada em chunks ~1 parágrafo** (~512 tokens) | [teardown] Locul/NextLeap: "roughly paragraph-sized" |
| 2. Indexação | cada chunk → embedding vetorial | [teardown] |
| 3. Recuperação | pergunta → embedding → chunks mais próximos + casamento lexical (busca **híbrida** semântica + palavra-chave) | [teardown]; busca híbrida é o padrão da indústria (Anthropic, PROPOR 2026) |
| 4. Re-ranking | candidatos re-pontuados (ex.: BGE reranker) | [teardown] |
| 5. Exploração multi-ângulo | o chat "**explora as fontes de vários ângulos, além do prompt inicial**" e sintetiza | **[oficial]** blog.google, out/2025 |
| 6. Geração | só os chunks recuperados entram no contexto ativo (o corpus inteiro **não** vira atenção) | [oficial implícito] + fast.io: "does not place 25 million words into the active attention window" |
| 7. Citação | cada afirmação aponta o trecho e a fonte (nome do arquivo) | [oficial] |

### 2.3 A implicação central

> **O modelo não lê a fonte inteira — lê os chunks que a recuperação acha.**
> Logo, o recall depende do que está *escrito*: nome da fonte, cabeçalho,
> estrutura do texto e âncoras literais dentro de cada chunk. Nada além
> disso está sob nosso controle — e isso é o suficiente.

## 3. O que controlamos × o que não

| Alavanca | Controlável? | No acervo |
|---|---|---|
| Nome da fonte | ✅ | `leis-2003-2015.md`, `portarias-de-ferias-e-licencas-2015-2017.md`… |
| Cabeçalho da fonte | ✅ | título + temas + amostra + período |
| Estrutura interna dos chunks | ✅ | H1 por norma + bloco de metadados + `##### Art.` |
| Âncoras literais (refs, números) | ✅ | `ref`, título oficial, ementa, palavras-chave |
| Alinhamento por tema | ✅ | 41 partes temáticas |
| Instruções/persona | ✅ | `00-INSTRUCOES.md` + custom goal |
| Tamanho do chunk / embedding / reranker | ❌ | fixo do Google |
| Ordem de upload | ❌ (e irrelevante) | — |

## 4. As sete alavancas de engenharia

### 4.1 Nome de fonte descritivo (tema + período)

**Evidência [oficial]:** "mencionar nomes de fontes na pergunta ajuda o Gemini
a estreitar a busca" (página de fontes). O nome do arquivo vira o nome da
fonte na UI **e nas citações**. Com 5+ fontes o produto cria **labels
automáticos por assunto** — nomes temáticos alimentam essa organização.

**Aplicação:** já feita no v2 (`leis-1956-2003`, `decretos-2025-2026`).
O nome funciona como filtro *e* como pistas para o retriever. No dia do
teste, algumas perguntas-caveira devem ser feitas **com** e **sem** o nome da
fonte (ver §9) para medir o quanto a recuperação depende dele.

### 4.2 Bloco de contexto por norma (contextual retrieval estático)

**Evidência [paper/prática]:** o problema clássico do chunking é o chunk perder
o contexto de onde veio — "receita cresceu 3%" sem dizer de qual empresa/trimestre
(Anthropic, *Contextual Retrieval*). Prefixar cada chunk com seu contexto:
**−49% de falhas de recuperação; com reranking, −67%**. Jina (*Late Chunking*)
chega ao mesmo ponto: chunk cortado do documento perde referências anafóricas
("sua", "o município") e o embedding degrada.

**Aplicação:** cada norma do export abre com **H1 = título oficial** seguido de
bloco de metadados em linguagem natural:

```markdown
# DECRETO MUNICIPAL Nº 040, DE 10/01/2001

> **Ref:** ilh-2001-dec-040 · **Tipo:** decreto · **Ano:** 2001 · **Status:** revogada
> **Ementa:** DISPÕE SOBRE A NOMEAÇÃO DOS MEMBROS DA JUNTA ADMINISTRATIVA DE RECURSOS DE INFRAÇÕES "JARI".
> **Fonte:** https://www.cespro.com.br/…cdDiploma=200100040

##### Art. 1º
…
```

Isso é *contextual retrieval feito em tempo de geração*: todo chunk que cair
no meio da norma nasce perto do seu contexto (ref, tipo, ano, status, ementa).
Quem responde "qual decreto nomeia a JARI?" recupera o chunk com a ementa
colada; quem pergunta "o que diz o Decreto 040/2001?" acerta pelo número no
título (casamento lexical).

### 4.3 Frontmatter em bloco Markdown, não YAML

**Evidência [inferência prudente]:** não há documentação oficial sobre como a
ingestão de `.md` trata frontmatter YAML (se descarta, se preserva como
texto). O bloco `> **Ref:** …` é **garantidamente texto**: entra nos chunks,
no embedding e no BM25 interno, custa ~20 palavras e é legível por humano.

**Aplicação:** o YAML de `leis/*.md` é metadado do **pipeline local**
(manifest, BM25, validação) — nunca vai ao notebook. O export converte
frontmatter → bloco. Manter assim.

### 4.4 Partes alinhadas por tema + tipo + período

**Evidência [paper]:** *Cross-Document Topic-Aligned Chunking* (arXiv
2601.05265): chunks sintetizados por tema através de documentos → **0.94
faithfulness e 0.93 de acerto de citação em textos legais**, contra 0.83 do
contextual retrieval. *Adaptive Chunking* (LREC 2026): escolher a estratégia
de chunking por documento levou a correção de 62–64% → **72%** e +30% de
perguntas respondidas. A granularidade temática **é** uma forma de
alinhamento de tópico — só que em nível de fonte, o que é o que o NotebookLM
permite.

**Aplicação:** as 41 partes temáticas (leis por período, decretos de nomeação e exoneração,
portarias de férias, revogadas etc.) seguem exatamente esse desenho. Alvo de
300k palavras por parte (60% do limite de 500k), com teto interno de 480k
(margem de 4%), deixa espaço para os metadados.

### 4.5 Hierarquia jurídica preservada

**Evidência [paper]:** *HiChunk* (ACL 2026) — chunking hierárquico +
auto-merge melhora a recuperação; *Graph RAG for Legal Norms* (JURIX 2025) —
texto plano é "cego à estrutura hierárquica, diacrônica e causal do direito".
Mesmo sem controlar o chunker do Google, dar a ele **marcos de estrutura**
(H1 por norma, `##### Art. Nº`) maximiza a chance de cada chunk ser coeso —
artigo inteiro, sem corte no meio.

**Aplicação:** já feita: artigos marcados como `##### Art.`, hierarquia
Livro/Título/Capítulo/Seção em níveis menores. O verificador
(`scripts/verificar-saida.mjs`) confere que a hierarquia sobreviveu ao export.

### 4.6 Triagem temporal escrita no texto (status + "Efeitos a partir de")

**Evidência [paper]:** o Graph RAG jurídico mostra que recuperação sem noção
temporal gera respostas **anacrônicas** — a solução cara é um grafo de
versões; a barata é o **status visível em todo chunk**. RAG jurídico pt-BR em
produção (PROPOR 2026) resolve 81,7% das citações de legislação e mostra que
normalizar menções a normas é o gargalo — nosso `ref` canônico + `url_fonte`
por norma é a versão local dessa normalização.

**Aplicação:** `Status:` em todo bloco + `Efeitos a partir de` + regra nº 3
das instruções ("norma fora de vigor só com aviso explícito"). Fato antigo →
pergunta busca a lei *da época* (tempus regit actum): as partes
`leis-revogadas-*` existem para isso.

### 4.7 Instruções + custom goal (persona)

**Evidência [oficial]:** custom goals disponíveis **para todos os planos**
(blog Google, out/2025): "Configure Chat" define papel/estilo/objetivo do
notebook. O conteúdo das instruções é o que faz as regras funcionarem — a
ordem de upload não importa (recuperação é por conteúdo).

**Aplicação:** `00-INSTRUCOES.md` como fonte **e** o texto dele colado no
custom goal do notebook — cinto e suspensório, como o README já manda. As 13
regras (nunca inventar número, citar `ref` + `url_fonte`, respeitar `status`,
acervo é municipal, atos de pessoal não são fundamento) seguem o checklist
anti-alucinação do *Grounded in Law*: geração com restrição de citação +
auditoria.

## 5. O papel do índice geral

**Evidência [oficial]:** "se a fonte for curta demais, o Gemini referencia o
documento inteiro sem citar trechos individuais" — fontes curtas são citadas
inteiras. **[prática]:** o índice funciona como mapa "assunto → nome de
fonte" para o modelo rotear buscas multi-hop (e para o humano achar a parte).

**Aplicação:** `01-INDICE-GERAL.md` com 906 palavras — inventário por tipo,
período e o mapa assunto → nome de fonte. Curto de propósito: cabe inteiro
no contexto da citação.

## 6. O que o design atual já acerta (contra a literatura)

| Recomendação da literatura/prática | Estado no acervo |
|---|---|
| Chunk autocontido com contexto (Anthropic −49%) | ✅ bloco de metadados por norma |
| Alinhamento por tema (CDTA 0.93–0.94) | ✅ 41 partes temáticas |
| Estrutura hierárquica preservada (HiChunk) | ✅ `##### Art.`, Livro/Título/Capítulo |
| Noção temporal visível (Graph RAG) | ✅ `status` + "Efeitos a partir de" em todo bloco |
| Citação normalizada e auditável (PROPOR) | ✅ `ref` única + `url_fonte` por norma |
| Fonte ≤500k palavras (limite oficial) | ✅ teto interno 480k, maior parte ~394k |
| Nome descritivo da fonte (oficial) | ✅ tema + período no nome do arquivo |
| Instruções explícitas (oficial) | ✅ 00-INSTRUCOES + custom goal |
| Mapa de navegação | ✅ 01-INDICE-GERAL |
| 43 fontes vs. "15–20 ideais" (guia comunitário) | ⚠️ decisão registrada no plano; mitigada por nomes/cabeçalhos/índice; o blog oficial diz que a melhoria de out/2025 foi **justamente** para notebooks grandes ("50% de satisfação com respostas que usam mais fontes") |

## 6.1 Tamanho das partes: expandir não ajuda (decisão out/2026)

**Pergunta levantada:** "expandir as partes para ter mais espaço para chunks e
index por arquivo?"

**Resposta: não.** A recuperação é por *chunk* (~1 parágrafo), não por arquivo:
o tamanho da fonte não reserva espaço para chunk nem muda a granularidade do
corte. O teto de 500k é limite de **ingestão**, não capacidade de indexação.
Expandir piora: mais chunks concorrentes no rerank (lost in the middle),
diluição do tema no nome da fonte (que a documentação oficial diz entrar na
busca) e menos slots livres (43/50 usados no plano gratuito).

O "index por arquivo" já existe: cabeçalho da parte (amostra + temas +
período) + `01-INDICE-GERAL` (mapa tema → parte).

**Ajuste correto quando houver evidência:** **dividir** temas largos (ex.:
`portarias-diversas-*` é catch-all), nunca engordar partes. Só depois do
Lote 5 medir falha de roteamento pergunta→parte; sobram 7 slots no plano
gratuito para isso.

**Política de slots (decisão out/2026):** nunca fechar 50/50. O crescimento
consome slots sozinho — o gerador divide cada tema automaticamente a cada
~300k palavras novas, e o acervo cresce ~2 partes/ano. Teto prático: **48
fontes**, com ≥2 livres. Dividir temas hoje só para o catch-all evidente
(`portarias-diversas`); o resto espera evidência do Lote 5.

## 7. Lacunas e candidatos de melhoria (para depois do Lote 5 — não implementar agora)

1. **Aliases no bloco do export.** O bloco hoje carrega ref/tipo/ano/status/
   ementa/fonte, mas não as **formas alternativas de citação** ("Decreto
   1.234/2020", "LC 32/01"). A busca híbrida casa lexicalmente; aliases dariam
   mais âncoras. Custo: ~2 linhas por norma (~35k×), ~8% mais texto.
   Decidir **depois** de medir o Lote 5 — se as perguntas por número/nome já
   acertam, não vale o custo.
2. **Script de auditoria de citações** estilo *Grounded in Law*: extrair toda
   `ilh-…-…` das respostas do NotebookLM → conferir existência no
   `idx/manifest.jsonl` → conferir fidelidade contra `leis/`. O repo já tem
   manifest + BM25; é um `scripts/` pequeno e transforma a conferência braçal
   em semi-automática. O paper corrigiu 6,5% das respostas antes de
   entregar com essa camada.
3. **Nunca usar Deep Research/Fast Research no notebook jurídico.** Fontes
   web misturadas quebram a garantia "acervo municipal só" — o grounding
   deixa de ser fechado. Documentar no README/instruções.
4. **Release como notebook público:** o produto permite **copiar** e
   **publicar** notebooks — dar ao público um notebook pronto (43 fontes já
   montadas + goal configurado) em vez de só os arquivos.
5. **Auto-sync via Drive:** só Docs/Sheets/Slides sincronizam; `.md` é
   estático. Converter 41 partes em Docs só pelo sync não compensa — manter
   o ciclo "regenerar → re-enviar as partes que mudaram".

## 8. Riscos conhecidos

- **Fonte estática:** `.md` enviado é snapshot; se o corpus mudar, o notebook
  cita a versão antiga até re-upload. Mitigação: retrato datado nas
  instruções ("retrato de outubro/2026") + release por cópia de notebook.
- **"Lost in the middle":** atenção degrada no meio de contextos enormes.
  Mitigado pela arquitetura (só chunks recuperados entram no contexto), mas
  é o motivo de manter partes <500k e não "encher" fontes.
- **Cota de uso:** limites por computação, refresh 5h — o dia das
  perguntas-caveira pode travar; espaçar as 10 perguntas.
- **Juridiquês:** variações de citação pt-BR são o gargalo apontado pelo
  PROPOR (81,7% legislação, 47,1% jurisprudência) — daí o candidato §7.1.
- **Números internos não oficiais:** chunk de ~512 tokens e reranker vêm de
  teardown, não do Google. O design não depende deles (aposta em texto
  estruturado vale para qualquer chunker).

## 9. Protocolo de teste de recall (Lote 5 aprofundado)

1. **Preparo:** notebook com as 43 fontes + `00-INSTRUCOES.md` + custom goal
   com o texto das instruções. Sem fontes web. **Não suba o roteiro de teste
   como fonte:** ele não é norma e contamina a recuperação (a A3 foi rodada
   com 44 fontes por esse motivo).
2. **10 perguntas-caveira** (licitação, servidores públicos, zoneamento, meio
   ambiente, tributos municipais, educação, saúde, mobilidade urbana, patrimônio
   histórico, saneamento básico) — cada uma em **duas formas**: sem nome de fonte
   e com nome ("…na parte de portarias de férias…") para medir a dependência do
   roteamento.
3. **Gabarito local:** as mesmas 10 perguntas no BM25 do repo
   (`npm run search -- --q "…" --k 10`) — o que o NotebookLM responder deve
   cobrir o que o BM25 acha.
4. **Auditoria de citações:** toda `ref` citada na resposta deve existir no
   `idx/manifest.jsonl` e o trecho deve ser fiel ao texto da norma em `leis/`
   (hoje manual; ver §7.2 para automatizar).
5. **Critérios** (do plano): ≥80% de acerto · ≥90% de citações corretas ·
   ≤1 falso negativo · **zero** ref inexistente. Falha em qualquer um
   → investigar qual alavanca do §4 falhou antes de mudar o gerador.
6. **Registrar** tudo em `docs/RELATORIO-VALIDACAO.md` e rodar
   `npm run verificar:cespro` para conferir a fonte.

## 10. Fontes consultadas

| # | Fonte | O que confirmou |
|---|---|---|
| 1 | [Google — Add or discover sources (Gemini Notebook Help)](https://support.google.com/gemininotebook/answer/16215270) | [oficial] 50 fontes free, 500k palavras/200MB por fonte, `.md` suportado, nome da fonte ajuda a busca, fonte curta citada inteira, labels automáticos |
| 2 | [Google — Usage limits](https://support.google.com/gemininotebook/answer/17670842) | [oficial] cotas por computação, refresh 5h, multiplicadores por plano |
| 3 | [Google Blog — Chat in NotebookLM (out/2025)](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-custom-personas-engine-upgrade/) | [oficial] 1M tokens no chat, exploração multi-ângulo, custom goals para todos |
| 4 | [Google Blog — The inside story of building NotebookLM](https://blog.google/innovation-and-ai/products/developing-notebooklm/) | [oficial] filosofia do produto, "source grounded" |
| 5 | [Locul — How NotebookLM Works (ago–out/2026)](https://locul.ai/blog/how-does-notebooklm-work) | [comunidade] pipeline chunk→embedding→retrieval→geração; renome 16/07/2026; tabelas de limite por plano; `.md` estático |
| 6 | [Fast.io — NotebookLM context window (set/2026)](https://fast.io/resources/notebooklm-context-window/) | [comunidade] tokens×palavras, só chunks recuperados entram na atenção, 50/100/300/500-600 fontes |
| 7 | [North Denver Tribune — Google avoids calling NotebookLM RAG (jan/2026)](https://northdenvertribune.com/ai-analysis/google-engineers-deliberately-avoid-calling-notebooklm-rag/) | [análise] "source grounding" × RAG; time nunca detalhou chunking/embedding/reranker |
| 8 | [Anthropic — Contextual Retrieval (set/2024)](https://www.anthropic.com/news/contextual-retrieval) | [prática] contexto no chunk: −49% falhas (−67% c/ rerank); BM25+embeddings; top-20 chunks |
| 9 | [Jina AI — Late Chunking (ago/2024)](https://jina.ai/news/late-chunking-in-long-context-embedding-models/) | [prática] "lost context problem": chunk sem contexto degrada embedding |
| 10 | [Figueiredo et al. — Grounded in Law (PROPOR 2026)](https://aclanthology.org/2026.propor-2.9/) | [paper] RAG jurídico pt-BR: híbrido+rerank, auditoria de referências, 81,7% resolução, 6,5% corrigidas |
| 11 | [Moura Júnior et al. — Adaptive Chunking (LREC 2026)](https://aclanthology.org/2026.lrec-1.903/) | [paper] chunking por documento: correção 62-64→72%, +30% respondidas |
| 12 | [Stankovic — Cross-Document Topic-Aligned Chunking (arXiv 2601.05265)](https://arxiv.org/abs/2601.05265) | [paper] alinhamento por tema: 0.93–0.94 faithfulness em textos legais |
| 13 | [Lu et al. — HiChunk (ACL 2026)](https://aclanthology.org/2026.acl-long.1372/) | [paper] chunking hierárquico + auto-merge melhora RAG |
| 14 | [de Martim — Graph RAG for Legal Norms (JURIX 2025 / arXiv 2505.00039)](https://arxiv.org/abs/2505.00039) | [paper] texto plano é cego à estrutura temporal do direito; point-in-time retrieval |
| 15 | [Fello AI — NotebookLM update 2026 (out/2026)](https://felloai.com/notebooklm-update-1m-token-chat-goals-saved-history/) | [comunidade] timeline completa out/2025–out/2026; planos e preços |

## 11. O que este estudo não sabe

- O comportamento real do Gemini Notebook com as 43 fontes — só o Lote 5
  (upload + perguntas-caveira) responde.
- Como a ingestão trata frontmatter YAML em `.md` — por isso o export usa
  bloco em texto (§4.3), que não depende da resposta.
- Se o reranker/chunk-size do teardown ainda valem no motor Gemini 3.5 — o
  design é deliberadamente agnóstico a isso.
