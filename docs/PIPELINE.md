# Pipeline — como rodar

Todos os scripts são agnósticos ao acervo e recebem opções por linha de
comando. Padrões: `--laws leis`, `--idx idx`.

## Opções comuns

| Opção | Padrão | Para quê |
|---|---|---|
| `--laws <dir>` | `leis` | pasta com os `.md` |
| `--idx <dir>` | `idx` | onde gravar manifest/índice/relatório/cache |
| `--cidade <nome>` | `Ilhabela` | default de `cidade` (enrich) |
| `--estado <UF>` | `SP` | default de `estado` (enrich) |
| `--esfera <e>` | `municipal` | default de `esfera` (enrich) |
| `--force` | — | ignora o cache do enrich e reprocessa tudo |

## Comandos

```bash
npm run enrich      # normaliza + gera ref/aliases/palavras_chave_auto (idempotente)
npm run validate    # relatório de saúde (não altera nada)
npm run manifest    # manifest.jsonl
npm run index       # índice BM25 comprimido (idx/bm25.index.json.gz)
npm run search -- --q "consulta" --k 10
npm run pipeline    # enrich → validate → manifest → index
```

Com argumentos diretos (sem npm):

```bash
node --experimental-strip-types scripts/search.ts --q "IPTU" --k 5 --json
```

## Atualização do acervo

```bash
npm run atualizar
```

O comando:

1. importa o pacote bruto `legislacao_ilhabela/` se ele existir na raiz;
2. varre a listagem do portal Cespro e baixa só o que é novo;
3. marca como `revogada` o que o portal passou a listar fora de vigor;
4. roda o pipeline no fim.

Opções:

| Opção | Uso |
|---|---|
| `--completo` | varre o portal inteiro (captura revogações antigas) |
| `--limite N` | baixa no máximo N normas (teste) |
| `--origem DIR` | importa um pacote bruto alternativo |
| `--corpus DIR` | pasta de destino (padrão `leis`) |
| `--idx DIR` | pasta do manifesto/índice (padrão `idx`) |
| `--sem-pipeline` | só baixa/importa, sem enrich/validate/manifest/index |

> `npm run pipeline -- --force` **não funciona**: o npm engole a flag. Use
> `npm run enrich:force`.

## Saídas em `idx/`

| Arquivo | Conteúdo |
|---|---|
| `manifest.jsonl` | 1 linha por norma (id, ref, tipo, ano, status, ementa, keywords, tags, path) |
| `bm25.index.json.gz` | índice invertido BM25 |
| `validate-report.json` | relatório de saúde |
| `enrich-cache.json` | hash por arquivo (para pular o que não mudou) |

## Como a busca pontua

BM25 com campos ponderados (`scripts/lib/bm25.ts`):

```
aliases 4 · palavras_chave 4 · titulo 3 · ementa 3 · tags 3 · ref 2 · corpo 1
```

Stopwords pt-BR + stemmer conservador (plural, `-mente`, `-ção/-ções`, etc.) em
`scripts/lib/text.ts`. Para melhorar recall sem mexer no código, amplie o
dicionário `scripts/schema/sinonimos.pt-BR.json` (o `enrich` cuida do resto).

## Escala (35.776 arquivos)

- `enrich` é cacheado: reexecuções só tocam o que mudou.
- O índice BM25 é gravado comprimido (gzip). Para 35.776, aguarde dezenas de MB.
- Recomendado: rodar primeiro em `scripts/samples/` e depois no acervo inteiro.

## NotebookLM

```bash
npm run notebooklm        # lê leis/ e escreve as 41 partes + 00 + 01
npm run notebooklm:check  # confere refs, blocos, fontes e teto de 500k palavras
npm run notebooklm:revisao # gera o checklist humano
```

O gerador **não** apaga arquivos de mão: ele remove apenas nomes que reconhece
(partes antigas e `00`/`01`). O plano de curadoria ficará em
`docs/plano-curadoria.md`, fora do alcance do gerador.
