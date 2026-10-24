# VALIDACAO-PARTES.md — protocolo de validação pós-geração das partes

> **Quem executa:** o agente de código, **após cada `npm run notebooklm`** e
> antes de commitar/upload. Complementa o que já existe:
> `verificar-saida.mjs` (barreira **estrutural**: refs, blocos, fontes,
> períodos, teto) e `verificar-cespro.mjs` (conferência de **fonte**,
> automática). Este protocolo cobre o que só julgamento pega por amostragem:
> **classificação temática** e **integridade do texto da norma**.
>
> Princípio: a parte é 100% derivada de `leis/` — **erro nunca se corrige na
> parte na mão**; corrige-se no gerador (ou no corpus) e regenera.

## Etapa 0 — barreira automática (tudo verde antes de amostrar)

```bash
npm run validate          # corpus em 0 erros (refs únicas) — NÃO gerar com corpus sujo
npm run notebooklm        # gera as partes
npm run notebooklm:check  # estrutura: cada ref existe, está em 1 parte, fonte em todo bloco, teto 500k
```

E mais:

1. `ls notebooklm/*.md | wc -l` == nº de partes + `00-INSTRUCOES.md` +
   `01-INDICE-GERAL.md` (política de slots: ver `RAG-NOTEBOOKLM.md` §6.1).
2. Nenhum resto de geração antiga (ex.: `parte-XX.md` do v1) na pasta.
3. `git status` mostra só o esperado: partes, índice e instruções.

Qualquer vermelho aqui **para tudo** — amostragem só tem sentido com a
estrutura íntegra.

## Etapa 1 — lotes de 10 normas (amostragem aleatória)

**Lote = 10 normas**: 6 sorteadas do acervo inteiro + 4 sorteadas de **uma
parte** (rodiziando as partes a cada lote — o sorteio puro nunca pescaria as
pequenas, como Lei Orgânica e resoluções). **Não confundir:** "lote" aqui é a
rodada de amostragem; os Lotes 1–6 do `plano-curadoria.md` são fases do projeto:

```bash
ls leis | shuf -n 6                                                        # 6 do acervo
grep '^> \*\*Ref:\*\*' notebooklm/<parte-da-vez>.md \
  | sed 's/.*Ref:\*\* \([^ ]*\).*/\1/' | shuf -n 4                          # 4 da parte
```

**Registre sempre os 10 nomes/refs sorteados** (o lote tem que ser
re-conferível depois de qualquer correção). Para cada norma, os três checks:

### A. Classificação — a norma está na parte CERTA?

```bash
REF="ilh-..."   # trocar
grep -l "\*\*Ref:\*\* $REF" notebooklm/*.md   # → em qual parte caiu?
head -15 leis/<arquivo-da-norma>.md            # → tipo, ementa, status
```

Julgue contra o **gabarito do gerador** (§ abaixo). Erro de classificação = a
parte não bate com o que o gabarito manda para aquele tipo/ementa/status.

### B. Bloco de metadados — confere com o frontmatter?

No bloco da parte (`grep -A6 "\*\*Ref:\*\* $REF" notebooklm/<parte>.md`),
conferir contra o frontmatter em `leis/`:

- `Ref`, `Tipo`, `Ano`, `Status` — idênticos ao frontmatter; status escrito
  **sem underscore** ("em vigor")
- `Ementa` — idêntica à do frontmatter (quando existe)
- `Efeitos a partir de` — presente **só** quando há `data_vigencia`, em ISO
- `Fonte` — a `url_fonte` do frontmatter
- `Palavras-chave` — união dedup de `palavras_chave` + `palavras_chave_auto`
  (o gerador faz a união; conferir em 1–2 normas se nenhum termo se perdeu)

### C. Integridade do corpo — o texto na parte é o texto da lei?

Receita testada (compara corpo em `leis/` × corpo no bloco, byte a byte):

```bash
REF="ilh-..."   # trocar
ARQ=$(grep -rl "^ref: $REF$" leis/ | head -1)
PARTE=$(grep -l "\*\*Ref:\*\* $REF" notebooklm/*.md | head -1)
A=$(awk 'BEGIN{c=0} /^---$/{c++; next} c>=2{print}' "$ARQ" \
     | sed -e :a -e '/^[[:space:]]*$/{$d;N;ba' -e '}')
B=$(awk -v r="$REF" '
  /^# / { next }
  index($0, "**Ref:** " r) != 0 { f=1; m=0; next }
  f && /^> / { next }
  f && $0 == "" { if (!m) { m=1; next } }
  f && /^---$/ { exit }
  f { print }
' "$PARTE" | sed -e :a -e '/^[[:space:]]*$/{$d;N;ba' -e '}')
[ "$A" = "$B" ] && echo "✓ íntegra em $PARTE" || { echo "✗ divergente"; diff <(echo "$A") <(echo "$B") | head; }
```

Isso pega truncamento, texto colado de outra norma e artigos perdidos.
Falso positivo conhecido: corpo com linha `---` **interna** corta a leitura
no awk (raro) — se a diferença for só "cauda faltando", confira esse caso.

Complemento rápido (contagem de artigos):

```bash
grep -c '^##### ' leis/<arquivo>.md   # nº de artigos no corpus
# tem que casar com os ##### do bloco na parte
```

## Etapa 2 — varredura por parte (as 41, uma vez por geração)

Para **cada** arquivo de parte (exceto `00-INSTRUCOES.md` e `01-INDICE-GERAL.md`):

```bash
P=notebooklm/<parte>.md
grep -c '^> \*\*Ref:\*\*' $P                 # nº de blocos
grep -o '· \*\*Tipo:\*\* [^·]*' $P | sort | uniq -c | sort -rn   # distribuição de tipos
grep -o '· \*\*Ano:\*\* [0-9]*' $P | head -1  # primeiro ano (ordenado por ano)
grep -o '· \*\*Ano:\*\* [0-9]*' $P | tail -1  # último ano
```

- [ ] contagem de blocos == contagem declarada no cabeçalho da parte
- [ ] período no nome do arquivo == primeiro/último ano (blocos ordenados)
- [ ] distribuição de tipos **homogênea** (exceções legítimas: as partes de
  `revogadas`/`expiradas` e `resolucoes-atos-especiais` são multi-tipo por
  desenho; `Leis Revogadas` inclui as LCs revogadas)
- [ ] nome do arquivo continua descrevendo o conteúdo (tema + período)
- [ ] amostra do cabeçalho: 3 refs sorteados existem na própria parte
- [ ] temas listados no cabeçalho batem com as ementas dos blocos (olhada)

## Regras de parada, correção e registro

| Situação | O que fazer |
|---|---|
| Erro de classificação | corrigir `classificar()`/`subtipoPortaria()` em `scripts/lib/notebooklm-classificar.mjs` → **regra de ouro 7: o caso real que revelou vira teste** (`scripts/tests/notebooklm-classificar.test.ts`) → regenerar → Etapa 0 de novo → **recomeçar a amostragem** |
| Erro de integridade | NUNCA editar a parte na mão; o bug é do gerador ou do corpus — corrigir na fonte, regenerar, validar |
| Surpresa aceitável (ex.: portarias de aposentadoria em "diversas") | registrar no relatório como observação — é insumo para criar grupo novo, com evidência |
| **Parada** | **2 lotes limpos consecutivos** (20 normas sem erro) → protocolo fechado |

**Registro:** lote (10 refs) + veredito por norma vai na **mensagem do
commit** da geração — o commit é o relatório durável; partes são regeneráveis,
o que fica é a evidência de que passaram. A execução de 23/10/2026 (30 refs)
está em [`RELATORIO-VALIDACAO.md`](RELATORIO-VALIDACAO.md).

## Casos-armadilha — semear o PRIMEIRO lote com estes

Os erros que já aconteceram neste projeto (auditoria de 22/10/2026) — caçar
de propósito antes de confiar no aleatório:

1. **Colisões `-2`/`-3`**: `ls leis | grep -E '_2\.md$|_3\.md$' | shuf -n 2`
   — dois atos distintos com mesmo número/ano: cada um em **sua** parte,
   sem mistura de texto.
2. **Menção × classificação**: norma que só **cita** "Lei Orgânica" (ou
   "estatuto") na ementa tem que continuar no próprio tipo — o falso positivo
   histórico. Buscar: `grep -l "estatuto dos servidores" leis/LEI_* | head -3`.
3. **Decreto que menciona "nomeia"** sem ser de nomeação (mesma classe de
   falso positivo, ainda regex): `grep -l "nomeia" leis/DECRETO_* | shuf -n 3`
   — julgar se a ementa é de fato ato de nomeação. **E o inverso (corrigido em
   23/10/2026):** os decretos de exoneração agora vão para
   `decretos-de-nomeacao-e-exoneracao-*`; conferir que nenhum ficou em
   `decretos-*` (ver `plano-curadoria.md` §7.1).
4. **Aposentadoria/pensão em portaria** → 0 casos hoje; o volume real está em
   decretos (394 casam, com falsos positivos como "Fundo de Aposentadorias").
   **Grupos novos (23/10/2026):** conferir `portarias-de-provimento-e-posse`
   (posse/provimento), `portarias-disciplinares` (PAD/sindicância) e os
   adicionais em `portarias-de-gratificacao-e-premios`; o catch-all restante
   está em `plano-curadoria.md` §7.1.
5. **Registro de 1805** (`CRIADO_PELA_PORTARIA`) → `resolucoes-atos-especiais`,
   bloco íntegro.
6. **Normas com ementa ausente/curta** (6 conhecidas: Decreto 1217/2006, Leis
   254/258/263/2004, Portarias 2177/2017 e 3022/2019) → o bloco reflete o
   frontmatter, inclusive `Ementa: 1`, `Ementa: 29` ou `Ementa: CERTIDÃO.`;
   não é omissão do gerador. Confira Ref/Tipo/Ano/Status/Fonte.

## Gabarito de classificação (o que o gerador manda hoje)

| Norma | Grupo → arquivo da parte |
|---|---|
| `lei_org*` ou `emenda` | Lei Orgânica e Emendas |
| LC com "estatuto/servidores" na ementa, ou ementa "estatuto dos servidores" | Estatuto dos Servidores |
| status `revogada` + lei (ou LC) | Leis Revogadas |
| status `revogada` + decreto | Decretos Revogados |
| status `revogada` + portaria | Portarias Revogadas |
| status `expirada`/`anulada`/`inconstitucional`/`suspensa` | Normas Expiradas, Anuladas, Inconstitucionais e Suspensas |
| portaria c/ "readapta" | Portarias de Readaptação |
| portaria c/ "PAD" ou "sindicância" | Portarias Disciplinares |
| portaria c/ "nomeia/nomeação" ou "exonera/exoneração/dispensa" | Portarias de Nomeação e Exoneração |
| portaria c/ "férias/licença/afastamento/abono/faltas" | Portarias de Férias e Licenças |
| portaria c/ "designa/substitui/comissão" | Portarias de Designação e Comissões |
| portaria c/ "gratifica/prêmio/retribui/adicional" | Portarias de Gratificação, Adicionais e Prêmios |
| portaria c/ "provimento/posse/demissão/seleção" | Portarias de Provimento e Posse |
| portaria c/ "aposentadoria/obras/educação-cultura/segurança/meio-ambiente" **e** as que não casam nada | **Portarias Diversas** |
| `portaria_conjunta` ou `resolucao` (e tipo fora do esquema) | Resoluções e Atos Especiais |
| `lei_complementar` (viva) | Leis Complementares |
| `lei` (viva) | Leis Municipais |
| `decreto` c/ "nomeia/nomeação/nomeado/exonera/exoneração" na ementa | Decretos de Nomeação e Exoneração |
| `decreto` (demais) | Decretos Municipais |

A ordem dos testes importa (revogada vem antes do tipo; LO antes de tudo).
Se achar norma fora desta tabela, é bug — não "exceção aceitável".

## O que este protocolo NÃO cobre

- A interpretação **jurídica** do conteúdo (a fonte é conferida pelo
  `verificar:cespro`; o uso do acervo é do usuário).
- As respostas do NotebookLM (Lote 5 — protocolo em `RAG-NOTEBOOKLM.md` §9).
- Se as `url_fonte` abrem no navegador (presença e formato são checados; o
  link vivo é conferido pelo `verificar:cespro`).
