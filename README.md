# Legislação Municipal de Ilhabela/SP — em Markdown

**35.776 normas do município de Ilhabela/SP** — o **espelho integral** do portal
público da legislação: leis, decretos, portarias, resoluções, e também os atos
de pessoal (nomeações, exonerações, readaptações, aposentadorias, férias,
licenças) e as normas fora de vigor (revogadas, expiradas, anuladas). Cada norma
traz o seu `status`, e o histórico fica junto do vigente.

Pronto para:

- 🔎 **pesquisar** — busca por texto em qualquer editor ou ferramenta, sem portal lento no caminho
- 🤖 **usar com IA** — pacote pronto para o Google NotebookLM, com arquivo de instruções/persona que ensina a IA a respeitar o `status` de cada norma
- 📚 **estudar e reaproveitar** — domínio público, use à vontade, sem pedir permissão

**Fonte dos dados:** portal público da legislação de Ilhabela/SP no
[Cespro](https://www.cespro.com.br/visualizarLegislacao.php?cdMunicipio=8969).
Os textos legais são domínio público (Lei nº 9.610/1998, art. 8º, I) e a
organização é oferecida sob [CC0 1.0](LICENSE).

> Projeto comunitário, **não oficial** e sem vínculo com a Prefeitura de
> Ilhabela ou com o Cespro.

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| `leis/` | **35.776 arquivos** `.md` — uma norma por arquivo, com metadados no cabeçalho |
| `notebooklm/` | **23 partes** prontas para o Google NotebookLM + `00-INSTRUCOES.md` (persona e regras para a IA) |

## Composição do acervo (retrato de out/2026)

| Status | Quantidade | O que significa |
|---|---|---|
| `em_vigor` | 32.208 | Vale integralmente hoje |
| `revogada` | 2.030 | Foi revogada por outra norma |
| `expirada` | 1.515 | Vigência esgotada (termo final), sem revogação |
| `inconstitucional` | 14 | Declarada em ação direta (ADI/ADIN) |
| `suspensa` | 1 | Eficácia sustada por liminar |
| `anulada` | 8 | Ato anulado pela própria Administração |

E por tipo: **19.717 portarias** (incluindo atos de pessoal: nomeações,
readaptações, férias, licenças), **12.810 decretos**, **3.158 leis**, **77 leis
complementares**, 9 portarias conjuntas e 3 resoluções.

**Por que o histórico junto do vigente?** Fato antigo julga-se pela lei da época
(*tempus regit actum*), cadeias de revogação exigem o texto revogado, e direito
adquirido nasce sob norma que não vale mais. O `status` de cada norma resolve a
triagem — o campo existe para isso.

## Formato de cada norma

Cada arquivo tem um cabeçalho (frontmatter) com os metadados e o texto integral embaixo:

```markdown
---
id: 200100001
ref: ilh-2001-dec-001
tipo: decreto
numero: 1
ano: 2001
cidade: Ilhabela
estado: SP
esfera: municipal
status: em_vigor
titulo: "DECRETO MUNICIPAL Nº 001, DE 01/01/2001"
ementa: "DISPÕE SOBRE…"
aliases:
  - Decreto 1/2001
palavras_chave_auto:
  - defesa civil
url_fonte: "https://www.cespro.com.br/visualizarDiploma.php?cdMunicipio=8969&cdDiploma=200100001"
versao_formato: "1.1"
---
DECRETO MUNICIPAL Nº 001, DE 01/01/2001
##### Art. 1º
…
```

- `ref` é a referência legível: `{cidade}-{ano}-{tipo}-{número}` (ex.: `ilh-2001-dec-001`)
- `status`: `em_vigor` · `revogada` · `expirada` · `inconstitucional` · `suspensa` · `anulada`
- artigos estão marcados como `##### Art. Nº` — facilita localizar e citar
- arquivos com `_2` no nome = **dois atos distintos com mesmo número e ano**,
  publicados pela fonte em datas diferentes (defeito do dado-fonte, não da
  conversão). São atos diferentes: confira a data no título antes de citar.

## Como usar

### Busca local

Qualquer editor busca em 35 mil arquivos. Exemplos:

```bash
# quem fala de poda/corte de árvores?
grep -ril "supressão de árvores" leis/

# o que a Lei 466/2007 diz?
cat leis/LEI_MUNICIPAL_466_2007.md

# portarias de readaptação de servidores (todas)?
grep -ril "readapta" leis/ | grep PORTARIA
```

### Google NotebookLM

1. Crie um notebook em [notebooklm.google.com](https://notebooklm.google.com)
2. Adicione `00-INSTRUCOES.md` e as 23 partes como fontes

Detalhes que valem saber:

- **Por que 23 arquivos:** o NotebookLM limita cada fonte em **500.000 palavras
  ou 200 MB** (o que vier primeiro, em todos os planos). O acervo tem ~10
  milhões de palavras, dividido em partes de ≤450 mil — as 24 fontes (instruções
  + 23 partes) cabem num único notebook (o plano gratuito aceita 50).
- **Ordem de upload não importa:** o NotebookLM recupera trechos relevantes de
  todas as fontes a cada pergunta. O que faz o `00-INSTRUCOES.md` funcionar é o
  **conteúdo** (regras explícitas), não a posição na fila.
- **O nome do arquivo vira o nome da fonte** no notebook — na lista de fontes
  e nas citações.
- As instruções incluem: nunca inventar número de lei, citar sempre `ref` +
  `url_fonte`, **respeitar o `status`** (norma revogada/expirada só entra com
  aviso explícito), acervo municipal não responde federal de memória, atos de
  pessoal têm valor individual (não são fundamento jurídico de matérias gerais).
- Se o seu notebook oferecer configuração nativa de instruções/respostas, cole
  lá também o conteúdo do `00-INSTRUCOES.md` — cinto e suspensório.

### Antes de usar em algo sério, três cuidados

1. **Confira a data.** É um retrato de **outubro/2026** — leis novas e revogações
   posteriores não estão aqui, e não há compromisso de atualização.
2. **Confira a fonte.** A conversão foi automática e pode conter erros. Antes de
   citar, abra o link `url_fonte` da norma — a versão oficial é sempre a do
   Cespro ou do Diário Oficial do Município.
3. **Confira com um advogado.** Este material é apoio à pesquisa; não substitui
   aconselhamento jurídico para decisões.

A compilação é oferecida no estado em que se encontra, sem garantias de exatidão
ou completude — os termos formais estão na [licença CC0](LICENSE).

## Créditos

Os dados são públicos do município de Ilhabela/SP, espelhados pelo portal
[Cespro](https://www.cespro.com.br/visualizarLegislacao.php?cdMunicipio=8969).
Este repositório apenas organiza o que já é público e de domínio público.

## Licença

- **Textos legais:** domínio público (Lei nº 9.610/1998, art. 8º, I).
- **Compilação, organização e metadados:** [CC0 1.0 Universal](LICENSE) —
  use, copie, modifique e redistribua livremente, sem pedir permissão.
