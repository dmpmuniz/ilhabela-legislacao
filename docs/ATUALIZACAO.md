# Atualização para a versão atual (v3.1.0)

**Para quem é:** quem já montou um notebook com a versão de **~18 mil** ou de
**35 mil normas**, ou com a **v3.0**, e quer usar a versão atual — **35.776
normas, 43 fontes**.

**A ideia em uma frase:** o NotebookLM não atualiza um arquivo que já foi
enviado. Por isso, as fontes antigas precisam ser **apagadas** e as 43 novas
precisam ser **enviadas de novo**. Não misture as duas versões.

> Se você não é técnico, siga esta página do começo ao fim. A parte de
> programação fica no final, em “Para quem quer clonar”.

## Resumo em 5 passos

1. **Apague** todas as fontes antigas do notebook.
2. **Baixe** o pacote novo (`notebooklm-v3.1.0.zip`).
3. **Envie** as 43 fontes novas.
4. **Cole** as instruções no campo de instruções do notebook.
5. **Teste** com uma pergunta simples.

## Antes de começar

Você vai precisar de:

- o pacote novo, baixado na página de
  [releases](https://github.com/dmpmuniz/ilhabela-legislacao/releases/latest);
- um notebook novo **ou** um notebook antigo que você aceite limpar;
- cerca de 10 minutos.

Não é preciso instalar nada. O NotebookLM funciona no navegador.

## Passo 1 — Baixe o pacote novo

1. Abra a página de
   [releases](https://github.com/dmpmuniz/ilhabela-legislacao/releases/latest).
2. Baixe o arquivo **`notebooklm-v3.1.0.zip`**.
3. Descompacte o arquivo. Você verá uma pasta chamada `notebooklm` com **43
   arquivos**.

Se preferir, confira a integridade do download pelo arquivo
`notebooklm-v3.1.0.zip.sha256`, que está na mesma release.

## Passo 2 — Limpe o notebook antigo

O caminho mais seguro é **criar um notebook novo**, com um nome claro, como
`Legislação Ilhabela v3.1`. O notebook antigo pode ficar guardado como
arquivo.

Se quiser usar o mesmo notebook, faça assim:

1. Abra a lista de fontes.
2. Selecione **todas** as fontes.
3. Remova todas.
4. Apague também o texto antigo do campo de instruções (custom goal).

**Por que apagar todas, e não só as que mudaram?** Porque uma fonte antiga
esquecida continua sendo consultada pela IA. Ela pode trazer uma norma
duplicada, um `status` desatualizado ou uma citação que não existe mais.

> **Não envie a pasta `leis/` para o NotebookLM.** Ela tem 35.776 arquivos
> individuais e não cabe no limite de fontes. O pacote certo é a pasta
> `notebooklm/`, com 43 arquivos.

## Passo 3 — Envie as 43 fontes

1. No notebook, clique em **Adicionar fontes**.
2. Envie os 43 arquivos da pasta `notebooklm/`:
   - `00-INSTRUCOES.md` (as regras da IA);
   - `01-INDICE-GERAL.md` (o mapa do acervo);
   - as **41 partes temáticas** (as normas).
3. Espere o processamento terminar.
4. Confira se aparecem **43 fontes**, sem duplicatas.

A ordem não importa. O nome do arquivo vira o nome da fonte e é o que aparece
nas citações.

## Passo 4 — Configure as instruções da IA

O NotebookLM tem um campo de instruções gerais. O nome muda um pouco conforme
a versão:

- **Custom goal**
- **Instruções do notebook**
- **Persona**

Abra esse campo e cole o **texto inteiro** de `notebooklm/00-INSTRUCOES.md`.
Não resuma: as regras são para ser seguidas ao pé da letra.

As instruções atuais têm **630 palavras** e **13 regras**. As principais são:

- copiar a `ref`, o link `url_fonte` e o `status` do cabeçalho da norma;
- nunca inventar número de lei, artigo ou `ref`;
- não apresentar norma revogada ou expirada como se estivesse valendo.

Se o seu plano não tiver esse campo, mantenha `00-INSTRUCOES.md` como fonte e
comece cada conversa com: *“Siga as regras de 00-INSTRUCOES.md.”*

## Passo 5 — Confira antes de usar

- [ ] o notebook tem **exatamente 43 fontes**;
- [ ] os nomes são `00`, `01` e as 41 partes;
- [ ] não há fontes antigas nem duplicadas;
- [ ] o campo de instruções tem o texto **atual** de `00-INSTRUCOES.md`;
- [ ] a busca na web está desligada, se você quer respostas só do acervo.

## Passo 6 — Faça o teste rápido

Faça **uma pergunta por vez**, sem dar a resposta na pergunta. Estas quatro
perguntas pegam os erros mais comuns de uma atualização incompleta:

| Pergunta | O que uma resposta saudável deve mostrar |
|---|---|
| **A Lei 156/2002 está em vigor?** | **Sim** — é o Código Tributário Municipal em vigor. Se disser “revogada”, ainda há fonte antiga no notebook. |
| **Quais normas tratam da estratégia de mobilidade urbana?** | A **Lei 421/2006** (Plano Diretor, arts. 63–67). Se citar a Lei 285/2004 como mobilidade, a versão é antiga. |
| **Quais leis concedem isenção de IPTU? Separe vigentes, revogadas e expiradas.** | Deve citar, entre outras, **900/2000, 760/1998, 458/1992 e 1.592/2023**; marcar **008/1972 como revogada**; não tratar **156/2002** como revogada. |
| **Quais são as regras de readaptação funcional? Cite a ref exata.** | **LC 1.326/2018** (não “Lei 1.326/2018”) e, se citar a **649/1997**, marcá-la como **revogada**. |

Em cada resposta, confira também:

- a **`ref`** existe no acervo (ex.: `ilh-2018-lc-1326`);
- o **link `url_fonte`** foi copiado do cabeçalho da norma;
- o **status** aparece junto da norma, inclusive em listas.

Se a resposta não trouxer `ref` ou link, o campo de instruções provavelmente
não está configurado ou o notebook ainda tem instruções antigas.

## Passo 7 — Se algo der errado

| Sintoma | Causa provável | Correção |
|---|---|---|
| Cita lei ou `ref` que não existe | fonte antiga misturada | apague **todas** as fontes e envie as 43 de novo |
| Não mostra `url_fonte` | campo de instruções vazio ou antigo | cole o `00-INSTRUCOES.md` atual |
| Diz que a Lei 156/2002 foi revogada | fonte ou instrução antiga | limpe o notebook e reenvie a versão atual |
| Cita a Lei 285/2004 como mobilidade | versão anterior à correção | use a release atual e reenvie as fontes |
| Aparecem normas duplicadas | fontes velhas + novas | separe em notebook novo ou apague todas e recomece |
| “Limite de fontes” | você enviou `leis/` ou arquivos soltos | use só os 43 arquivos de `notebooklm/` |

## O que mudou

| Item | Versões antigas | Atual (v3.1.0) |
|---|---|---|
| Normas | ~18 mil ou 35.776 | **35.776** |
| Fontes para o NotebookLM | divisão antiga (23 partes na v2) | **41 partes + 00 + 01 = 43** |
| `status` e `ref` | parciais ou desatualizados | **corrigidos e conferidos** |
| Instruções da IA | versão antiga | **630 palavras, 13 regras** |
| Conferência Cespro | não ou parcial | **35.776/35.776** |

As correções de outubro/2026 incluíram a remoção de “trânsito” da regra de
sinônimos de mobilidade — por isso a Lei 285/2004 deixou de ser sugerida como
“mobilidade urbana” — e o reforço para copiar `ref`, link e `status` do
cabeçalho, em vez de deduzir.

## Perguntas frequentes

**Posso manter o notebook antigo?**
Sim, como arquivo. Só não o use para consultas atuais e não misture as fontes
dele com as novas. Se quiser aproveitar o mesmo notebook, apague todas as
fontes e as instruções antes de enviar as 43 novas.

**Preciso reenviar as 43 ou só as que mudaram?**
As 43. As instruções, o índice e as partes mudaram; uma parte antiga pode
continuar sendo consultada e contaminar a resposta.

**Perco as anotações do notebook antigo?**
As anotações ficam no notebook antigo. Se for apagá-lo, exporte o que importa
antes. O notebook novo começa limpo.

**Uso só busca no computador, sem NotebookLM.**
Baixe a release atual e substitua a pasta `leis/` inteira. Não há atualização
parcial: os arquivos são a fonte de verdade.

**Por que 43 fontes e não 41?**
São 41 partes temáticas + `00-INSTRUCOES.md` + `01-INDICE-GERAL.md`. O plano
gratuito do Gemini Notebook aceita 50 fontes; 43 cabem com folga.

**O que é `ref`?**
É o código curto e único da norma, no formato
`{sigla}-{ano}-{tipo}-{número}` — por exemplo, `ilh-2018-lc-1326`. Use o código
que está no cabeçalho do arquivo; não monte o seu.

## Para quem quer clonar (técnico)

Se você só vai usar o NotebookLM, não precisa desta parte.

```bash
git clone https://github.com/dmpmuniz/ilhabela-legislacao.git
cd ilhabela-legislacao
```

Confira as 43 fontes:

```bash
ls notebooklm | wc -l    # 43
```

Requisitos: **Node.js 22.6+** e **zero dependências** (não rode `npm install`).

Comandos úteis:

```bash
npm test                  # testes automatizados
npm run notebooklm        # regenera as 43 fontes
npm run notebooklm:check  # confere blocos, refs e teto de palavras
npm run verificar:cespro  # compara com o portal oficial
```

Detalhes de pipeline, schema e decisões estão no
[README](https://github.com/dmpmuniz/ilhabela-legislacao#readme) e no
[AGENTS.md](https://github.com/dmpmuniz/ilhabela-legislacao/blob/main/AGENTS.md).

## Suporte

Se algo não bater, abra uma issue em
[github.com/dmpmuniz/ilhabela-legislacao/issues](https://github.com/dmpmuniz/ilhabela-legislacao/issues)
com: a pergunta feita, a resposta recebida, a lista de fontes do notebook e a
versão usada. **Não inclua dados pessoais** (nomes, documentos, endereços).
