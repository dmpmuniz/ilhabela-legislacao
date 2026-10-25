# Atualização de versões anteriores (18 mil / 35 mil normas)

**Para quem é:** quem já montou um notebook com a versão de ~18 mil normas
(v1), com a de 35.776 normas anterior às correções de outubro/2026 (v2) ou
com a v3.0 e quer passar para a versão atual (**v3.1.0**, 35.776 normas, 43
fontes). Vale também para quem está na v3.0: as 43 fontes mudaram, então elas
precisam ser substituídas.

**Por que refazer as fontes:** o acervo cresceu, normas tiveram `status` e
`ref` corrigidos, as partes passaram de 23 para 41 e as instruções da IA
mudaram. O NotebookLM **não atualiza** um `.md` já enviado: ele é estático.
Misturar fontes antigas com novas produz duplicatas, status desatualizado e
citações que não batem com o texto atual. A troca é manual e leva cerca de
10 minutos.

## O que você vai precisar

- a release atual: [github.com/dmpmuniz/ilhabela-legislacao/releases/latest](https://github.com/dmpmuniz/ilhabela-legislacao/releases/latest)
- os **43 arquivos** da pasta `notebooklm/`
- um notebook novo **ou** um notebook antigo que você aceite limpar
- o texto de `notebooklm/00-INSTRUCOES.md` para o custom goal

## Passo 1 — Baixe a versão atual

Baixe o `.zip` da release ou clone o repositório:

```bash
git clone https://github.com/dmpmuniz/ilhabela-legislacao.git
cd ilhabela-legislacao
```

Confira que a pasta `notebooklm/` tem exatamente **43 arquivos**:

```bash
ls notebooklm | wc -l    # 43
```

No Windows, abra a pasta e confira a contagem pelo Explorer. O conteúdo é:

- `00-INSTRUCOES.md` — persona e regras da IA;
- `01-INDICE-GERAL.md` — mapa do acervo;
- **41 partes temáticas** — as normas em si.

## Passo 2 — Não misture versões

O caminho mais seguro é **criar um notebook novo** com um nome claro, por
exemplo `Legislação Ilhabela v3.1`.

Se quiser reaproveitar o notebook antigo, **apague todas as fontes** — não só
as que você acha que mudaram. Também limpe o custom goal/instruções antigas.
Uma fonte antiga esquecida continua sendo recuperada e pode contaminar a
resposta.

> **Não suba a pasta `leis/` no NotebookLM.** Ela tem 35.776 arquivos
> individuais e não cabe no limite de fontes. O pacote do NotebookLM é a pasta
> `notebooklm/` com 43 arquivos.

## Passo 3 — Suba as 43 fontes

1. No notebook, escolha **Adicionar fontes**.
2. Envie `00-INSTRUCOES.md`, `01-INDICE-GERAL.md` e as 41 partes.
3. **Não envie** `README.md`, `docs/`, `leis/`, arquivos de teste ou partes da
   versão antiga.
4. Espere o processamento terminar e confira: **43 fontes**, sem duplicatas.

A ordem de upload não importa. O nome do arquivo vira o nome da fonte e é o
que aparece nas citações.

## Passo 4 — Configure o custom goal

Abra as configurações do notebook e procure o campo **Custom goal**,
**Instruções do notebook** ou **Persona** (o nome varia conforme a versão).

Cole o **texto inteiro** de `notebooklm/00-INSTRUCOES.md` — as 13 regras, sem
resumir. Elas são literais: copiar `Ref`, `Fonte` e `Status` do cabeçalho de
cada norma, não inventar artigo/lei, não usar norma fora de vigor como se
estivesse vigente.

Se o seu plano não tiver esse campo, mantenha `00-INSTRUCOES.md` como fonte e
comece cada conversa com: *“Siga as regras de 00-INSTRUCOES.md.”* O custom goal
é o recomendado, mas o arquivo de instruções já é uma fonte.

## Passo 5 — Confira antes de confiar

- [ ] o notebook tem **exatamente 43 fontes**;
- [ ] os nomes são `00`, `01` e as 41 partes, sem arquivos antigos;
- [ ] não há fontes duplicadas nem versões antigas misturadas;
- [ ] o custom goal tem o texto **atual** de `00-INSTRUCOES.md`;
- [ ] a busca na web está desligada, se você quer respostas só do acervo.

## Passo 6 — Teste rápido

Faça **uma pergunta por vez**, sem dar a resposta na pergunta. Estes quatro
testes pegam os erros mais comuns de uma migração incompleta:

| Pergunta | O que uma resposta saudável deve mostrar |
|---|---|
| **A Lei 156/2002 está em vigor?** | **Sim** — é o Código Tributário Municipal em vigor. Se disser “revogada”, há fonte antiga no notebook. |
| **Quais normas tratam da estratégia de mobilidade urbana?** | A **Lei 421/2006** (Plano Diretor, arts. 63–67). Se citar a Lei 285/2004 como mobilidade, a fonte/dicionário é antiga. |
| **Quais leis concedem isenção de IPTU? Separe vigentes, revogadas e expiradas.** | Deve citar, entre outras, **900/2000, 760/1998, 458/1992 e 1.592/2023**; marcar **008/1972 como revogada**; não tratar **156/2002** como revogada. |
| **Quais são as regras de readaptação funcional? Cite a ref exata.** | **LC 1.326/2018** (não “Lei 1.326/2018”) e, se citar a **649/1997**, marcá-la como **revogada**. |

Em cada resposta, confira também:

- a **`ref`** existe no acervo (ex.: `ilh-2018-lc-1326`);
- o **link `url_fonte`** foi copiado do cabeçalho da norma;
- o **status** está junto da norma, inclusive em listas.

Se a resposta não trouxer `ref`/link, o custom goal provavelmente não está
ativo ou o notebook ainda tem instruções antigas.

## Passo 7 — Se algo falhar

| Sintoma | Causa provável | Correção |
|---|---|---|
| Cita lei ou `ref` que não existe | fonte antiga misturada | apague **todas** as fontes e suba as 43 de novo |
| Não mostra `url_fonte` | custom goal inativo ou instruções antigas | cole o `00-INSTRUCOES.md` atual no custom goal |
| Diz que a Lei 156/2002 foi revogada | fonte/instrução antiga | limpe o notebook e reenvie a versão atual |
| Cita a Lei 285/2004 como mobilidade | versão anterior à correção do dicionário | use a release atual e reenvie as fontes |
| Aparecem normas duplicadas | fontes velhas + novas no mesmo notebook | separe em notebook novo ou apague todas e recomece |
| “Limite de fontes” | você subiu `leis/` ou arquivos soltos | use só os 43 arquivos de `notebooklm/` |

## O que mudou em relação às versões anteriores

| Item | ~18 mil (v1) | 35 mil (v2) | Atual (v3.1) |
|---|---|---|---|
| Normas | ~18.000 | 35.776 | **35.776** |
| Fontes para o NotebookLM | divisão antiga | 23 partes | **41 partes + 00 + 01 = 43** |
| `status` e `ref` | parciais | mapeados | **corrigidos e conferidos** |
| Instruções da IA | versão antiga | versão antiga | **630 palavras, 13 regras** |
| Conferência Cespro | não | parcial | **35.776/35.776** |
| Testes automatizados | não | não | **86/86** |

As correções de outubro/2026 incluíram a remoção de “trânsito” da regra de
sinônimos de mobilidade — por isso a Lei 285/2004 deixou de ser sugerida como
“mobilidade urbana” — e o endurecimento das regras para copiar `Ref`, `Fonte`
e `Status` do cabeçalho, em vez de deduzir.

## Perguntas frequentes

**Posso manter o notebook antigo?**
Sim, como arquivo. Só não o use para consultas atuais e não misture as fontes
dele com as novas. Se quiser aproveitar o mesmo notebook, apague todas as
fontes e o custom goal antes de subir as 43 novas.

**Preciso reenviar as 43 ou só as que mudaram?**
As 43. As instruções, o índice e as partes mudaram; uma parte antiga pode
continuar sendo recuperada e contaminar a resposta.

**Perco as anotações do notebook antigo?**
As anotações ficam no notebook antigo. Se for apagá-lo, exporte o que importa
antes. O notebook novo começa limpo.

**Uso só busca local (`grep`), sem NotebookLM.**
Baixe a release atual e substitua a pasta `leis/` inteira. Não há migração
incremental: os arquivos são a fonte de verdade.

**Por que 43 fontes e não 41?**
São 41 partes temáticas + `00-INSTRUCOES.md` + `01-INDICE-GERAL.md`. O plano
gratuito do Gemini Notebook aceita 50 fontes; 43 cabem com folga.

**O que é `ref`?**
É a referência curta e única da norma, no formato
`{sigla}-{ano}-{tipo}-{número}` — por exemplo, `ilh-2018-lc-1326`. Use a `ref`
do cabeçalho do bloco; não monte a sua.

## Suporte

Se algo não bater, abra uma issue em
[github.com/dmpmuniz/ilhabela-legislacao/issues](https://github.com/dmpmuniz/ilhabela-legislacao/issues)
com: a pergunta feita, a resposta recebida, a lista de fontes do notebook e a
versão usada. **Não inclua dados pessoais** (nomes, documentos, endereços).
