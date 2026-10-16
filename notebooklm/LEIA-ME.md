# NotebookLM — Legislação de Ilhabela/SP

Compilações prontas para subir no Google NotebookLM (ou qualquer IA/RAG), em
**duas categorias** — são dois recortes diferentes do mesmo acervo, **nenhum é
"incompleto"**:

| Categoria | O que tem | Para quem |
|---|---|---|
| **todas-as-normas** (18.045 normas) | Tudo: leis, decretos, portarias **e atos de pessoal** (nomeações, exonerações, aposentadorias, pensões) | Quem precisa provar nomeação/exoneração de servidor, histórico funcional, posse |
| **sem-atos-pessoal** (10.539 normas) | As mesmas normas, **menos os atos de pessoal individual** | **Recomendada para pesquisa jurídica com IA**: menos ruído nas respostas e sem diretório de nomes de pessoas |

## Como usar (NÃO misture)

1. Escolha UMA categoria — um notebook por categoria.
2. Suba primeiro o `00-INSTRUCOES-…` da categoria (persona e regras da IA).
3. Suba as partes `…-01.md` a `…-NN.md` da MESMA categoria.

Cada arquivo de parte leva o nome da categoria no início — se na lista de
fontes do seu notebook aparecer "todas-as-normas-03" junto com
"sem-atos-pessoal-05", algo foi misturado: remova um dos conjuntos.

## Por que existem "partes"?

O NotebookLM limita cada fonte em **500 mil palavras ou 200 MB** (o que vier
primeiro, em qualquer plano). O acervo inteiro não cabe numa fonte só — por
isso cada categoria é dividida em partes de até 450 mil palavras. O plano
gratuito aceita 50 fontes por notebook: qualquer categoria cabe inteira.

Os **arquivos únicos** (`ilhabela-legislacao-…md`) passam do limite de
palavras — são para uso LOCAL (busca/leitura), não para subir.

- todas-as-normas: ~5.475.677 palavras
- sem-atos-pessoal: ~3.740.321 palavras

## Retrato de outubro de 2026

Ambas as categorias são retratos de outubro de 2026 da fonte pública
[Cespro](https://www.cespro.com.br/visualizarLegislacao.php?cdMunicipio=8969).
Normas publicadas depois não estão aqui — a fonte oficial prevalece sempre.
