# Legislação Municipal de Ilhabela/SP — em Markdown

**18.045 normas do município de Ilhabela/SP** — leis, decretos, portarias,
resoluções, e também os atos de pessoal (nomeações, exonerações, aposentadorias,
pensões) — convertidas para arquivos Markdown organizados e prontos para:

- 🔎 **pesquisar** — busca por texto em qualquer editor ou ferramenta, sem portal lento no caminho
- 🤖 **usar com IA** — pacote pronto para o Google NotebookLM em **duas categorias** (com ou sem atos de pessoal), cada uma com arquivo de instruções/persona
- 📚 **estudar e reaproveitar** — domínio público, use à vontade, sem pedir permissão

Cada norma traz metadados (ano, tipo, status, ementa) e o link da fonte original.

**Fonte dos dados:** portal público da legislação de Ilhabela/SP no
[Cespro](https://www.cespro.com.br/visualizarLegislacao.php?cdMunicipio=8969).
Os textos legais são domínio público (Lei nº 9.610/1998, art. 8º, I) e a
organização é oferecida sob [CC0 1.0](LICENSE).

> Projeto comunitário, **não oficial** e sem vínculo com a Prefeitura de
> Ilhabela ou com o Cespro.

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| `leis/` | **18.045 arquivos** `.md` — uma norma por arquivo, com metadados no cabeçalho (tudo: leis, decretos, portarias e atos de pessoal) |
| `notebooklm/` | Pacote para o Google NotebookLM em duas categorias — veja o [`notebooklm/LEIA-ME.md`](notebooklm/LEIA-ME.md) |

## As duas categorias do pacote NotebookLM

São dois recortes diferentes do mesmo acervo — **nenhum é "incompleto"**:

| Categoria | O que tem | Para quem |
|---|---|---|
| **todas-as-normas** (18.045) | Tudo, incluindo atos de pessoal | Provar nomeação/exoneração, histórico funcional, posse |
| **sem-atos-pessoal** (10.539) | As mesmas normas, menos os atos de pessoal individual | **Recomendada para pesquisa jurídica com IA**: menos ruído e sem diretório de nomes |

Cada categoria traz: arquivo **único** (uso local), **partes** prontas para
upload (arquivo único não sobe: passa do limite de 500 mil palavras por fonte)
e **instruções próprias** para a IA (`00-INSTRUCOES-…`). Os nomes das partes
levam a categoria no início — para ninguém misturar os conjuntos num mesmo
notebook sem perceber. Detalhes e passo a passo no
[`notebooklm/LEIA-ME.md`](notebooklm/LEIA-ME.md).

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
- `status`: `em_vigor` · `revogada` · `inconstitucional` · `suspensa`
- artigos estão marcados como `##### Art. Nº` — facilita localizar e citar
- arquivos com `_2` no nome = dois atos distintos com mesmo número e ano publicados
  pela fonte (datas diferentes)

## Como usar

### Busca local

Qualquer editor busca em 18 mil arquivos. Exemplos:

```bash
# quem fala de poda/corte de árvores?
grep -ril "supressão de árvores" leis/

# o que a Lei 466/2007 diz?
cat leis/LEI_MUNICIPAL_466_2007.md
```

### Google NotebookLM

1. Crie um notebook em [notebooklm.google.com](https://notebooklm.google.com)
2. Escolha UMA categoria (veja a tabela acima) — um notebook por categoria
3. Adicione o `00-INSTRUCOES-…` da categoria e as partes `…-01.md` a `…-NN.md`

Detalhes que valem saber:

- **Ordem de upload não importa:** o NotebookLM recupera trechos relevantes de
  todas as fontes a cada pergunta. O que faz o `00-INSTRUCOES` funcionar é o
  **conteúdo** (regras explícitas), não a posição na fila.
- **O nome do arquivo vira o nome da fonte** no notebook — por isso cada parte
  leva a categoria no nome.
- Se o seu notebook oferecer configuração nativa de instruções/respostas, cole
  lá também o conteúdo do `00-INSTRUCOES` — cinto e suspensório.

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
