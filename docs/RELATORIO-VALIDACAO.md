# RELATORIO-VALIDACAO.md — 3 lotes de 30 normas + 5 partes inteiras + conferência Cespro (23–24/10/2026)

> Execução do protocolo [`VALIDACAO-PARTES.md`](VALIDACAO-PARTES.md) sobre a
> geração pós-splits (**41 partes + `00-INSTRUCOES.md` + `01-INDICE-GERAL.md` =
> 43 fontes**). Os 30 refs abaixo são a evidência durável: qualquer linha pode
> ser reexecutada depois de uma correção. As 5 partes inteiras foram auditadas
> bloco a bloco contra o corpus e a documentação.

## Estado verificado nesta data

- `leis/`: **35.776 normas**; refs únicas **35.776/35.776**; **0 erros**,
  8 avisos (6 ementas curtas + 2 aliases vazios) e 4 problemas de qualidade
  (registro histórico de 1805 e Lei Orgânica).
- `notebooklm/`: **41 partes**, **35.776 blocos = 35.776 refs**, **10.166.100
  palavras**, maior parte **394.497 palavras** (teto 500k), `notebooklm:check`
  = saída íntegra — conferindo também **título e ementa** de cada bloco
  contra o frontmatter.
- `npm test`: **84/84** · `check:samples`: **0 erros** (exit 0).
- `npm run verificar:cespro` (1 norma por parte): **41/41 conformes**.
- `npm run verificar:cespro -- --tudo`: **35.776/35.776 conformes**;
  0 divergências (11 status confirmados pela listagem/nota do corpo).

## Método

- **3 lotes × 10 normas**: 6 sorteadas do acervo inteiro + 4 de uma parte
  afetada pelos splits (rodízio; o sorteio puro nunca pescaria as partes
  pequenas). Lote 1 usou `decretos-de-nomeacao-e-exoneracao-2015-2017`, o
  lote 2 `portarias-de-provimento-e-posse-2023-2026` e o lote 3
  `portarias-disciplinares-2018-2026`.
- **Integridade**: corpo do bloco na parte comparado **byte a byte** com
  `leis/`, com a ref ancorada em `^ref: $REF$` (para não casar a ref irmã `-2`).
- **Classificação**: julgada contra o gabarito do gerador (tabela da Etapa 1A),
  já com os grupos novos.

## Resultado dos 3 lotes

| Lote | Arquivo | Ref | Parte | Integridade | Classificação | Observação |
|---|---|---|---|---|---|---|
| 1 | `DECRETO_MUNICIPAL_375_2002.md` | `ilh-2002-dec-375` | `normas-expiradas-e-cassadas-1956-2007.md` | OK | OK | fora de vigor (título atualizado) |
| 1 | `DECRETO_MUNICIPAL_1372_1995.md` | `ilh-1995-dec-1372` | `decretos-1975-2013.md` | OK | OK | — |
| 1 | `DECRETO_MUNICIPAL_10921_2025.md` | `ilh-2025-dec-10921` | `decretos-2022-2025.md` | OK | OK | — |
| 1 | `PORTARIA_4649_2020.md` | `ilh-2020-port-4649` | `portarias-de-ferias-e-licencas-2020.md` | OK | OK | — |
| 1 | `PORTARIA_389_2017.md` | `ilh-2017-port-389` | `portarias-de-ferias-e-licencas-2017-2018.md` | OK | OK | — |
| 1 | `DECRETO_MUNICIPAL_1937_2000.md` | `ilh-2000-dec-1937` | `decretos-de-nomeacao-e-exoneracao-1995-2010.md` | OK | OK | split: decreto de exoneração |
| 1 | `DECRETO_MUNICIPAL_6556_2017.md` | `ilh-2017-dec-6556` | `decretos-de-nomeacao-e-exoneracao-2015-2017.md` | OK | OK | split: decreto de nomeação |
| 1 | `DECRETO_MUNICIPAL_5420_2016.md` | `ilh-2016-dec-5420` | `decretos-de-nomeacao-e-exoneracao-2015-2017.md` | OK | OK | split: decreto de nomeação |
| 1 | `DECRETO_MUNICIPAL_5628_2016.md` | `ilh-2016-dec-5628` | `decretos-de-nomeacao-e-exoneracao-2015-2017.md` | OK | OK | split: decreto de exoneração |
| 1 | `DECRETO_MUNICIPAL_4680_2015.md` | `ilh-2015-dec-4680` | `decretos-de-nomeacao-e-exoneracao-2015-2017.md` | OK | OK | split: decreto de nomeação |
| 2 | `PORTARIA_2512_2018.md` | `ilh-2018-port-2512` | `portarias-de-ferias-e-licencas-2018-2019.md` | OK | OK | — |
| 2 | `PORTARIA_1322_2017.md` | `ilh-2017-port-1322` | `portarias-de-designacao-e-comissoes-2015-2025.md` | OK | OK | — |
| 2 | `DECRETO_MUNICIPAL_4834_2015.md` | `ilh-2015-dec-4834` | `decretos-de-nomeacao-e-exoneracao-2015-2017.md` | OK | OK | split: decreto de nomeação |
| 2 | `DECRETO_MUNICIPAL_10149_2023.md` | `ilh-2023-dec-10149` | `decretos-2022-2025.md` | OK | OK | — |
| 2 | `DECRETO_MUNICIPAL_1598_2008.md` | `ilh-2008-dec-1598` | `decretos-de-nomeacao-e-exoneracao-1995-2010.md` | OK | OK | split: decreto de exoneração |
| 2 | `LEI_MUNICIPAL_255_1986.md` | `ilh-1986-lei-255` | `normas-expiradas-e-cassadas-1956-2007.md` | OK | OK | fora de vigor (título atualizado) |
| 2 | `PORTARIA_687_2023.md` | `ilh-2023-port-687` | `portarias-de-provimento-e-posse-2023-2026.md` | OK | OK | grupo novo: provimento/posse |
| 2 | `PORTARIA_158_2024.md` | `ilh-2024-port-158` | `portarias-de-provimento-e-posse-2023-2026.md` | OK | OK | grupo novo: provimento/posse |
| 2 | `PORTARIA_162_2026.md` | `ilh-2026-port-162` | `portarias-de-provimento-e-posse-2023-2026.md` | OK | OK | grupo novo: provimento/posse |
| 2 | `PORTARIA_389_2023.md` | `ilh-2023-port-389` | `portarias-de-provimento-e-posse-2023-2026.md` | OK | OK | grupo novo: provimento/posse |
| 3 | `DECRETO_MUNICIPAL_5136_2015.md` | `ilh-2015-dec-5136` | `decretos-de-nomeacao-e-exoneracao-2015-2017.md` | OK | OK | split: decreto de nomeação |
| 3 | `DECRETO_MUNICIPAL_2945_2012.md` | `ilh-2012-dec-2945` | `decretos-de-nomeacao-e-exoneracao-2010-2015.md` | OK | OK | split: decreto de nomeação |
| 3 | `PORTARIA_3161_2020.md` | `ilh-2020-port-3161` | `portarias-de-ferias-e-licencas-2020.md` | OK | OK | — |
| 3 | `DECRETO_MUNICIPAL_2849_2011.md` | `ilh-2011-dec-2849` | `decretos-de-nomeacao-e-exoneracao-2010-2015.md` | OK | OK | split: decreto de nomeação |
| 3 | `DECRETO_MUNICIPAL_6539_2017.md` | `ilh-2017-dec-6539` | `decretos-de-nomeacao-e-exoneracao-2015-2017.md` | OK | OK | split: decreto de nomeação |
| 3 | `PORTARIA_931_2015.md` | `ilh-2015-port-931` | `portarias-de-gratificacao-e-premios-2015-2026.md` | OK | OK | — |
| 3 | `PORTARIA_456_2021.md` | `ilh-2021-port-456` | `portarias-disciplinares-2018-2026.md` | OK | OK | grupo novo: PAD/sindicância |
| 3 | `PORTARIA_153_2026.md` | `ilh-2026-port-153` | `portarias-disciplinares-2018-2026.md` | OK | OK | grupo novo: PAD/sindicância |
| 3 | `PORTARIA_797_2022.md` | `ilh-2022-port-797` | `portarias-disciplinares-2018-2026.md` | OK | OK | grupo novo: PAD/sindicância |
| 3 | `PORTARIA_461_2025.md` | `ilh-2025-port-461` | `portarias-disciplinares-2018-2026.md` | OK | OK | grupo novo: PAD/sindicância |

**30/30 íntegras. 30/30 aderentes ao gabarito atual**, incluindo os quatro
clusters que motivaram os splits (decretos de exoneração, provimento/posse,
PAD/sindicância e adicionais).

## Auditoria de 5 partes inteiras

Sorteio de 5 partes (semente real, sem repetição) e conferência de **todos** os
blocos contra `leis/`: H1/título/período, contagem e palavras declaradas,
amostra do cabeçalho, temas, ordem cronológica, metadados, palavras-chave,
corpo byte a byte e classificação de cada norma.

| Parte | Blocos | Palavras de texto | Resultado |
|---|---|---|---|
| `portarias-de-designacao-e-comissoes-2015-2025.md` | 959 | 139.625 | OK |
| `lei-organica-e-emendas-1990.md` | 1 | 15.172 | OK |
| `portarias-de-nomeacao-e-exoneracao-2016-2026.md` | 674 | 170.574 | OK |
| `portarias-de-ferias-e-licencas-2020-2024.md` | 1.594 | 299.955 | OK |
| `portarias-de-provimento-e-posse-2023-2026.md` | 223 | 53.677 | OK |

**5/5 conformes** (3.451 blocos conferidos).

### Bug real encontrado e corrigido

A primeira passagem da auditoria falhou em `ilh-2020-port-1520`
(`portarias-de-designacao-e-comissoes-2015-2025.md`): a ementa saía com as
barras invertidas do frontmatter (`\"CAPUT\"` em vez de `"CAPUT"`). O gerador
tinha um parser de frontmatter próprio que não desescapava aspas. Correção:

1. O gerador passou a usar o `parseFrontmatter` compartilhado
   (`scripts/lib/frontmatter.ts`), eliminando o parser duplicado.
2. `scripts/verificar-saida.mjs` agora compara **título e ementa** de cada
   bloco com o frontmatter — a classe inteira de erro (328 normas com `\"`)
   passa a ser pega pelo `npm run notebooklm:check`.
3. O parser compartilhado devolve campos numéricos como número (`ementa: 1`);
   `fold()` passou a coagir para string, com testes dos casos reais
   (`PORTARIA_2177_2017`, `DECRETO_MUNICIPAL_1217_2006`).

## Conferência de fonte (Cespro)

A conferência é automática: `npm run verificar:cespro` baixa o diploma oficial
pela mesma API do `atualizar` (`content-diploma`) e compara **título, ementa,
status e corpo** de cada bloco do export. Não há checklist humano.

| Execução | Blocos | Conformes | Divergências |
|---|---|---|---|
| `npm run verificar:cespro` (1 por parte) | 41 | 41 | 0 |
| `npm run verificar:cespro -- --tudo` | 35.776 | 35.776 | 0 |

**Re-sync completo (24/10/2026):** `npm run atualizar -- --refazer` conferiu
**35.776** normas, **382 atualizadas**, **35.394 iguais**, **0 erros**. O
pipeline seguinte fechou com `enrich` 382 alterados/0 erros, `validate` 0
erros/8 avisos/4 qualidade, manifesto 35.776 e índice 35.776. O corpus não tem
mais resíduo “Versão Original/COMPILADA” (era 340), stub “texto no processo”
nem entidade `&RSQUO;` do import antigo.

**Status decidido por IA:** a página do diploma (`ds_situacao`) e a listagem
(`ds_status`) discordam em 11 normas. Todas foram conferidas e o status local
estava correto: 8 `revogada` confirmadas pela listagem (`REVOGADO`) e 3
`expirada` confirmadas pela listagem (`EFEITOS CESSADOS`) ou pela nota do corpo
(“Efeitos cessados…”). O re-sync também rebaixou 10 normas de `em_vigor` para
`revogada`/`expirada`; todas têm nota expressa no corpo e a listagem estava
desatualizada (`EM VIGOR`). Outras **4 normas vêm sem `ds_situacao`** no
diploma; o status local foi mantido e a listagem não o contradiz.

**Regra assimétrica do verificador:** local `em_vigor` contra portal fora de
vigor é sempre erro; local fora de vigor contra diploma `em vigor` passa quando
a listagem ou a nota do corpo confirmam a saída. A listagem é consultada por
número, só para a norma divergente (1 pedido), em vez de varrer as 716 páginas.
Os casos de portal inconsistente ficam registrados em
`idx/verificacao-cespro.json`.

**Ementa numérica:** o portal zero-preenche (“01”) o que o corpus guarda como
“1”; a comparação normaliza os dois. Casos reais: `PORTARIA_2177_2017` e
`PORTARIA_3022_2019`.

**Resíduos cosméticos do portal (não são divergências):** 2 normas com
`&rsquo;` duplamente codificado (`DECRETO_MUNICIPAL_2404_2011`,
`PORTARIA_617_2022`) e 2 com comentário HTML não fechado
(`DECRETO_MUNICIPAL_1472_1997`, `DECRETO_MUNICIPAL_7035_2018`) — o texto do
portal é reproduzido como está e confere com a fonte.

**Caracteres de controle:** 2 normas (`LEI_MUNICIPAL_497_2007` e
`LEI_MUNICIPAL_529_2007`) traziam `\x06`/`\x01` no corpo, vindos do HTML do
portal. O `htmlParaTexto` passou a removê-los; as duas foram rebaixadas pelo
`--refazer` e o caso real virou teste (`scripts/tests/atualizar.test.ts`).

## Lote 5 — validação empírica no Gemini Notebook (24/10/2026)

**Escopo desta execução:** forma A (as 10 perguntas-caveira, sem nomear a
parte). A forma B (medição de dependência de roteamento) fica pendente. As
respostas citaram as normas por número/ano, **sem** `ref`/`url_fonte` —
indício de que o custom goal com o texto de `00-INSTRUCOES.md` não estava
ativo; a auditoria resolveu cada citação manualmente contra o
`idx/manifest.jsonl` e conferiu os trechos em `leis/`.

**Critérios (plano, Lote 5):**

| Métrica | Meta | Resultado |
|---|---|---|
| Acerto por pergunta | ≥80% | **10/10 (100%)** |
| Citações corretas | ≥90% | **~95%** (6 erros em ~131; +2 erratas de auditoria) |
| Falso negativo | ≤1 | **0** |
| Ref inexistente | 0 | **0** |

**A forma A passa nos 4 critérios.** Todas as ~140 normas citadas existem no
acervo; nenhuma ref inventada; nenhuma pergunta ficou sem resposta.

**Erros de conteúdo** (norma existe, descrição não confere):

1. **Lei 649/1997, “art. 46”** — o art. 46 trata do Regime Diferenciado de
   Trabalho do magistério, não de preferência por readaptação na Educação.
2. **“Lei Municipal” 1.326/2018** — é **Lei Complementar** 1.326/2018
   (Estatuto dos Servidores); o art. 19 veio fiel.
3. **Lei 746/1998** citada como alteração do COMUS — dispõe sobre permuta com
   a SUCEN; não menciona o Conselho.
4. **Lei 285/2004** citada como “Estratégia de Mobilidade Urbana” — dispõe
   sobre parcelamento de multas de trânsito (ver nota abaixo).
5. **“Transporte gratuito em dias de votação eleitoral”** — sem base no
   acervo (os decretos “eleitorais” tratam de CIPA e de cessão de bens à
   Justiça Eleitoral).
6. **Lei 394/2006** citada como legislação urbanística de “Áreas de
   Interesse Cultural” — institui o Museu Municipal (a lei está errada; o
   conceito existe no Plano Diretor, Lei 421/2006, art. 154, II).
   *[Correção de auditoria (25/10): a expressão “Área de Interesse Cultural”
   EXISTE no acervo — meu grep da rodada 1 foi truncado pelo `head -5`.]*
7. ~~**“Vila Bela estritamente preservada”**~~ — *[RETIRADO em 25/10: a
   imposição EXISTE no acervo — Lei Orgânica, art. 49, com o texto exato
   (“...será preservada e mantida em suas características coloniais...”).
   O erro era da minha auditoria (mesmo grep truncado), não da resposta.]*
8. **“Procedimento Administrativo de Autorização para Corte de Árvore”** —
   apresentado como fonte, mas o procedimento descrito (documentos do
   imóvel, mapeamento dos cortes, vistoria prévia) não está no acervo.

**Omissões de status** (regra 3 das instruções): ~10 normas revogadas/expiradas
citadas em listas históricas sem o aviso (649/1997, 855/2010, 1.016/2013,
1.112/2015, 2.789/2011, 3.286/2013, LC 1.463/2021, 740/2009, 853/2010,
318/2004). Em contrapartida, as revogações-chave foram sinalizadas
corretamente (1.410/2020, 9.743/2023, 887/2000, 418/1991, códigos
tributários antigos).

**Fidelidade verificada trecho a trecho (amostra):** Decreto 9.795/2023
(Capítulo XIV, arts. 127–132), LC 1.326/2018 art. 19, Lei 335/1989 (letra “g”
do art. 2º da Lei 245/86 — gratuidades), Decreto 11.403/2025 (Tarifa
Integral/Reduzida, integração, biometria facial), LC 1.397/2019 (PMSB,
SANEILHA, Conselho, FMSAI, 30 anos), Lei 761/2009 (frota mínima de 15 vans,
cor branca), Leis 98/1980 e 1.784/2026 (supressão/poda), decretos do COMUS
(10.562/2024, 10.563/2024, 11.373/2025).

**Nota sobre palavras-chave automáticas:** a Lei 285/2004 (multas de trânsito)
carregava `mobilidade urbana` em `palavras_chave_auto` porque a regra de
sinônimos casa “trânsito” (`scripts/schema/sinonimos.pt-BR.json`). O domínio é
defensável, mas facilitou a atribuição errada (erro 4).

**Correções aplicadas em 25/10/2026 (pós-forma A):**

1. **Dicionário:** “trânsito” removido da lista `match` da regra de
   transporte/mobilidade (`scripts/schema/sinonimos.pt-BR.json`) — a própria
   descrição do dicionário manda preferir frases a termos genéricos.
   `npm run enrich:force` reprocessou as 35.776 normas: **92 perderam a
   palavra-chave equivocada** (231 → 139 normas com “mobilidade urbana”;
   6.082 → 6.005 com palavras-chave). O caso real virou teste
   (`scripts/tests/enrich.test.ts`, 86/86 no `npm test`).
2. **Instruções (`00-INSTRUCOES.md`, 509 → 583 palavras, em duas rodadas):** a regra 1 passou a
   exigir que efeito, procedimento ou imposição esteja **escrito** na norma
   (ataca os erros 1, 3, 5, 6, 7 e 8); a regra 2 passou a exigir o **tipo
   exato** ao citar (ataca o erro 2); a regra 3 passou a exigir o status junto
   **inclusive em listas** (ataca as ~10 omissões).
3. **Revalidação:** `npm test` 86/86 · `pipeline` 0 erros/8 avisos/4 qualidade
   · `notebooklm` 43 fontes/10.166.100 palavras/maior 394.497 ·
   `notebooklm:check` íntegro · `check:samples` exit 0.

Os erros 1–3 e 5–8 são do modelo, não do acervo; as instruções mais duras
reduzem o risco, mas **só a reexecução das perguntas com o custom goal ativo
confirma** (forma A2 + forma B).

**Pendências do Lote 5:** forma B (as mesmas 10 perguntas nomeando a parte
provável); ativar o custom goal com o texto de `00-INSTRUCOES.md` para as
respostas citarem `ref` e `url_fonte` (regra 2).

## Lote 5 — forma A2 (25/10/2026): 5 perguntas adversariais

Re-teste mirando os erros da forma A, nas 43 fontes regeneradas (dicionário
corrigido + instruções endurecidas). **O custom goal continuou inativo** —
nenhuma resposta citou `ref`/`url_fonte` e a Constituição Federal foi citada
de memória (violação da regra 6).

| Métrica | Meta | Resultado |
|---|---|---|
| Acerto por pergunta | ≥80% | **5/5 (100%)** |
| Citações corretas | ≥90% | **~76%** (10 normas com problema em 42 citadas) — **reprovado** |
| Falso negativo | ≤1 | **0** |
| Ref inexistente | 0 | **0** |

**Vitórias sobre a forma A:**

- **Lei 285/2004 sumiu** da resposta de mobilidade — a correção do
  dicionário funcionou; a resposta passou a se apoiar no Plano Diretor certo
  (Lei 421/2006, arts. 63–67 literais, verificados).
- **Vila Bela:** citação literal do art. 49 da Lei Orgânica (o suposto “erro
  7” da forma A era da auditoria — ver errata acima).
- **IPTU:** 17/18 citações perfeitas; separação vigente/revogada/expirada
  100% conforme o manifesto (ex.: Lei 008/1972, revogada pela Lei 540/1993;
  Lei 525/1993, art. 16 — exatos).
- As invenções da forma A (transporte eleitoral, procedimento de corte de
  árvore, Lei 746/1998 como alteração do COMUS) **não se repetiram**.

**Erros remanescentes — modo de falha “localizadores deduzidos”** (norma
certa, número de artigo/lei inventado):

1. “Lei Municipal” 1.326/2018 — é **Lei Complementar** (reincidente).
2. Lei 649/1997, art. 46 (2×) — Regime Diferenciado de Trabalho, não
   readaptação (reincidente).
3. Lei 649/1997, arts. 31 e 47 — recondução e vagas de jornada, citados
   para invalidez e irredutibilidade (o certo, art. 26 §§ 1º/3º, veio junto).
4. LC 1.326/2018, art. 37 — frequência; a regra de carreira/grupo é o
   art. 19 § 1º, II (citado certo na mesma linha).
5. Lei 1.327/2018, arts. 71, 73 e 74 — titulação, prazo regulamentar e
   anexos; todo o conteúdo citado está no art. 33 (que veio exato).
6. CF art. 37, XV — fora do acervo (regra 6).
7. Decreto 11.568/2025, art. 21, IX — o art. 21 é Diretoria de Trânsito (o
   art. 19, IV, veio literal).
8. Lei 549/2007, art. 13, § 2º — a lei trata de registro de bens imateriais;
   CONDEPHAAT só aparece na Lei 421/2006 (art. 154, § 1º, I).
9. Decreto 8.520/2021 — trata de comitê especial, não da Vila (o Decreto
   4.665/2015 veio exato).
10. Lei 432/1991, art. 14 — a lei institui PGV (e o art. 14 trata de
    parcelamento); a “isenção de aposentados” não está nela.
11. “Lei 1.670/2024” — o conteúdo citado (multa à SABESP por vazamento em via
    pública) é da **Lei 1.692/2025** (número trocado).
12. “Lei Complementar” 529/2007 — é **Lei Municipal** (o art. 71, II/III,
    veio literal).

**Resposta a isso (25/10):** a regra 2 das instruções ganhou o bloqueio de
localizadores deduzidos — “só cite artigo/inciso cujo número esteja escrito no
texto da norma; nunca deduza nem complete números de dispositivos ou de
leis”. Instruções: 509 → 583 palavras; export regenerado e íntegro
(`notebooklm:check` ok).

**Pendências críticas:** (1) ativar o custom goal com o texto de
`00-INSTRUCOES.md` — sem ele as regras 2/6 não são seguidas; (2) re-subir as
43 fontes (instruções mudaram de novo) e repetir as 5 perguntas; (3) forma B.

## Lote 5 — forma A3 (25/10/2026): 5 perguntas, execução contaminada

**Ressalva de método:** o roteiro de teste (arquivo removido do repositório
nesta release) foi enviado ao notebook como **44ª fonte** (a resposta começa
confirmando o arquivo), e as 5 perguntas foram feitas de uma vez, não uma por
vez. O teste **não** é uma medição limpa das 43 fontes: o roteiro contém as
palavras `ref`/`url_fonte` e
pode ter induzido as citações. Os números abaixo são indicativos; a rodada A4
precisa ser limpa.

| Métrica | Meta | Resultado |
|---|---|---|
| Acerto de conteúdo | ≥80% | **4/5 (80%)** — Q4 falhou |
| Citações com problema | ≥90% | **5/31 (83,9%)** — reprovado |
| Falso negativo | ≤1 | **0** |
| Ref inexistente | 0 | **2** — reprovado |
| Link `url_fonte` | 100% | **0/31** — reprovado |

*31 citações (29 normas distintas; Lei 421/2006 e Lei 529/2007 aparecem duas
vezes).*

**O que funcionou:**

- **Q1:** LC 1.326/2018, art. 19 (§§ 1º–3º) e Lei 1.327/2018, art. 33
  literais; as Portarias 797/2017 e 1.885/2017 existem e são de readaptação.
- **Q2:** Lei 421/2006, arts. 5º IV, 27 e 63–67 literais (sistema bimodal,
  TPA, Vila/ Centro Histórico); LC 1.517/2022, arts. 32–33; os três decretos
  existem e tratam de tarifa/ciclovia.
- **Q3:** Lei Orgânica, art. 49 literal (Vila Bela); LC 1.595/2023; Lei
  421/2006, arts. 14 §§ 4º–5º, 27 § 2º e 86; Decreto 8.483/2021; Leis
  824/2010 e 829/2010.
- **Q5:** Lei 369/1990, art. 2º e art. 3º “b” literais; Lei 1.279/2018;
  Lei 529/2007, art. 71 II/III; Lei 1.001/2013.

**Erros:**

1. **`ilh-1990-lom`** — ref inexistente; a Lei Orgânica é
   **`ilh-1990-lo-000`**.
2. **`ilh-2007-lc-529`** — ref inexistente e tipo errado; é **Lei
   Municipal**, `ilh-2007-lei-529` (reincidência do erro 12 da A2).
3. **Lei 529/2007 como “IPTU Verde”** — é o Código de Posturas; o benefício
   é da **Lei 1.592/2023**.
4. **Lei 156/2002** tratada como “antigo Código Tributário revogado” — é o
   CTM **em vigor**.
5. **Lei 047/1979** descrita como “referente a isenções” — alterou o art. 72
   (fato gerador do IPTU), não isenções.
6. **Imprecisões:** 432/1991 e 697/1997 são PGV (desconto de pagamento e
   remissão), não “leis de isenção”; os Decretos 7.613/2019 e 3.861/2014 são
   tarifários, não “sistema”; “Laudo de Conclusão Pericial” não está nas
   Portarias de 2017 citadas.

**Causa:** o modelo agora **constrói** a ref a partir de tipo/ano/número e
ignora o link **Fonte** (a instrução pedia `url_fonte`, mas o cabeçalho do
bloco diz **Fonte**). Exemplos: `ilh-1990-lom` (abreviação inventada) e
`ilh-2007-lc-529` (tipo errado). O status da Lei 156/2002 foi deduzido pelo
ano, não copiado do cabeçalho.

**Correção (25/10):** regras 1–3 das instruções:

- regra 1: “nunca invente ... **ref**” e “no texto **da norma citada**”
  (impede atribuir efeito de uma norma a outra);
- regra 2: copiar título/**Ref**/**Fonte** do cabeçalho, nunca montar,
  deduzir ou reformatar; se não houver, dizer que não encontrou;
- regra 3: copiar o **Status** do cabeçalho, nunca deduzir pelo ano ou tipo.

Instruções: **583 → 630 palavras**; export regenerado; `notebooklm:check`
íntegro; `npm test` **86/86**.

**Pendências críticas:** (1) **remover o roteiro de teste das fontes**
(voltar a 43); (2) re-subir as 43 fontes (instruções mudaram) e ativar o
custom goal; (3) rodada **A4** com uma pergunta por vez; (4) forma B.

## Lição da revisão

O gabarito é o contrato da amostragem: **se ele codifica um gap, a amostra passa
com o gap**. A primeira rodada de 30 normas aprovou 4 casos que estavam
exatamente nos clusters depois separados. A Etapa 1 valida a **implementação**
do gabarito; a revisão do **gabarito** é a §7.1 do plano de curadoria. Nenhuma
parte foi editada à mão.

## Reprodução

A receita de integridade está na Etapa 1C do `VALIDACAO-PARTES.md` (com
`grep -rl "^ref: $REF$"` para não casar a ref irmã `-2`). Para refazer um lote,
basta passar os arquivos acima; o veredito de classificação é o confronto com a
tabela da Etapa 1A.
