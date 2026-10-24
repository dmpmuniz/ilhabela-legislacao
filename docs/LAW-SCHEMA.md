# Schema da norma — v1.1

Superset **retrocompatível** do formato real do scraper (id numérico +
frontmatter simples). O `enrich` completa os campos que faltam; o scraper não
precisa mudar.

## Campos

| Campo | Obrigatório | Gerado por | Descrição |
|---|---|---|---|
| `id` | sim | scraper | Identificador estável (pode ser numérico). Nunca reescrito. |
| `ref` | sim | enrich | Referência legível `{sigla}-{ano}-{tipo}-{numero}` (ex.: `ilh-2001-dec-001`). |
| `tipo` | sim | enrich normaliza | `lei`, `lei_complementar`, `lei_organica`, `decreto`, `decreto_legislativo`, `portaria`, `portaria_conjunta`, `resolucao`, `emenda`. |
| `numero` | sim¹ | enrich normaliza | Inteiro ou string com sufixo de emenda (`"2000/A"`); zeros à esquerda são removidos. |
| `ano` | sim | scraper | 1800–2100 (o registro histórico de 1805 é a exceção). |
| `cidade` / `estado` | sim | enrich (default) | Ex.: `Ilhabela` / `SP`. |
| `esfera` | — | enrich (default) | `municipal` \| `estadual` \| `federal`. |
| `status` | sim | enrich normaliza | `em_vigor` \| `revogada` \| `expirada` \| `inconstitucional` \| `suspensa` \| `anulada`. |
| `data_vigencia` | — | enrich (heurística) | `YYYY-MM-DD`; exibido como **"Efeitos a partir de"**. |
| `titulo` / `ementa` | sim | scraper | Conteúdo declarado da norma. |
| `aliases` | — | enrich | Formas de citação ("Decreto 001/2001", "LC 032/01"). |
| `palavras_chave` | — | **curadoria/LLM** | Nunca tocado por script. |
| `tags` | — | **curadoria/LLM** | Nunca tocado por script. |
| `palavras_chave_auto` | — | enrich | Gerado pelo dicionário; **substituído a cada execução**. |
| `tags_auto` | — | enrich | Idem. |
| `url_fonte`, `fonte_nome`, `coletado_em`, `sha256_raw` | — | scraper | Procedência/auditoria. |
| `referencias` | — | fase 2 | Relações entre normas (revoga/altera/referencia). |
| `versao_formato` | — | enrich | `"1.1"`. |

¹ Ausente apenas nos atos sem número: a Lei Orgânica e o registro histórico de
1805 (ambos usam `000` no segmento numérico da `ref`). Este último também
mantém o tipo bruto do portal (`criado_pela_portaria,_de_03/09/1805`) e o ano
1805 — é um registro de histórico, não uma norma no sentido do schema.

## Referência única (`ref`)

Formato: `{sigla}-{ano}-{tipo}-{numero}`, com tipo curto:

- `lei` → `lei`
- `lei_complementar` → `lc`
- `lei_organica` → `lo`
- `decreto` → `dec`
- `decreto_legislativo` → `dl`
- `portaria` → `port`
- `portaria_conjunta` → `portc`
- `resolucao` → `res`
- `emenda` → `em`

A Lei Orgânica de Ilhabela é **`ilh-1990-lo-000`** (tipo `lei_organica`), não
`ilh-1990-lei-000`.

Quando dois atos distintos têm o mesmo número e ano, o `ref` recebe sufixo
`-2`, `-3` etc. A busca deve mostrar as alternativas em vez de escolher um ato
às cegas. O sufixo alfabético do próprio número (`Nº 2000/A`) também entra na
`ref` (`ilh-2009-dec-2000a`).

## Status

| Status | Significado |
|---|---|
| `em_vigor` | vale integralmente hoje |
| `revogada` | foi revogada por outra norma |
| `expirada` | vigência esgotada (termo final), sem revogação |
| `inconstitucional` | declarada em ação direta (ADI/ADIN) |
| `suspensa` | eficácia sustada por liminar |
| `anulada` | ato anulado pela própria Administração |

Nunca cite norma fora de vigor como vigente. O status acompanha cada bloco no
export do NotebookLM.

## Por que separar `palavras_chave` de `palavras_chave_auto`

Para que rodar `enrich` de novo seja **idempotente** e **nunca apague** o que
você (ou o LLM) adicionou à mão. O índice e o manifest usam a **união** dos dois.

## Corpo

Mantido como está: artigos com `##### Art. Nº`, incisos e parágrafos em linhas
próprias. O motor não reescreve o corpo.
