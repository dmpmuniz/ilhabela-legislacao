# Legislação Municipal de Ilhabela/SP — em Markdown

**10.539 normas materiais do município de Ilhabela/SP** — leis, decretos,
portarias, resoluções e afins — convertidas para arquivos Markdown organizados
e prontos para:

- 🔎 **pesquisar** — busca por texto em qualquer editor ou ferramenta, sem portal lento no caminho
- 🤖 **usar com IA** — os arquivos funcionam em qualquer assistente/RAG; inclui um pacote pronto para o Google NotebookLM, com arquivo de instruções/persona
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
| `leis/` | 10.539 arquivos `.md` — uma norma por arquivo, com metadados no cabeçalho |
| `notebooklm/` | **9 partes** prontas para o Google NotebookLM + `00-INSTRUCOES.md` (persona e regras para a IA) |

## O que NÃO está aqui (e por quê)

**Atos de pessoal individual** não entram neste acervo: nomeações, exonerações,
aposentadorias, pensões e afins (~7.5 mil atos no total). Motivos:

- **sem valor normativo** — um ato que nomeia ou exonera um servidor específico
  não fundamenta pesquisa jurídica; o que fundamenta são as normas que regem o
  instituto (o Estatuto dos Servidores está aqui, o decreto que nomeia fulano não)
- **respeito a pessoas** — evita transformar o acervo num diretório de nomes de
  servidores, mesmo sendo dados públicos

Na dúvida, o ato **fica** — o filtro é conservador. Se precisar de um ato de
pessoal, ele existe no [portal da fonte](https://www.cespro.com.br/visualizarLegislacao.php?cdMunicipio=8969).

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

Qualquer editor busca em 10 mil arquivos. Exemplos:

```bash
# quem fala de poda/corte de árvores?
grep -ril "supressão de árvores" leis/

# o que a Lei 466/2007 diz?
cat leis/LEI_MUNICIPAL_466_2007.md
```

### Google NotebookLM

1. Crie um notebook em [notebooklm.google.com](https://notebooklm.google.com)
2. Adicione `00-INSTRUCOES.md` e as 9 partes como fontes

Detalhes que valem saber:

- **Por que 9 arquivos:** o NotebookLM limita cada fonte em **500.000 palavras
  ou 200 MB** (o que vier primeiro, em todos os planos). A compilação tem ~3,7
  milhões de palavras, dividida em partes de ≤450 mil — todas cabem num único
  notebook (o plano gratuito aceita 50 fontes).
- **Ordem de upload não importa:** o NotebookLM recupera trechos relevantes de
  todas as fontes a cada pergunta. O que faz o `00-INSTRUCOES.md` funcionar é o
  **conteúdo** (regras explícitas cuja linguagem casa com as perguntas), não a
  posição na fila.
- **O nome do arquivo vira o nome da fonte** no notebook (na lista de fontes e
  nas citações) — por isso os nomes são explícitos. O que a IA lê é o conteúdo,
  com os títulos como cabeçalhos.
- Se o seu notebook oferecer configuração nativa de instruções/respostas, cole
  lá também o conteúdo do `00-INSTRUCOES.md` — cinto e suspensório.

As partes estão em ordem cronológica e cada norma mantém título como cabeçalho
e metadados — as citações do NotebookLM apontam a norma certa.

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
