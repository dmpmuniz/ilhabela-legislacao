# Enriquecimento Semântico — Prompt Manual

> **Regra:** `palavras_chave`/`tags` (curadoria humana/LLM) **nunca** são tocados pelo `enrich`.
> Apenas `_auto` são substituídos a cada execução.

---

## Como gerar keywords/tags para uma lei

1. Leia o **título**, a **ementa** e o **corpo** da lei.
2. Identifique o **assunto central** (ex: "supressão de vegetação nativa", "zoneamento urbano", "alvará de construção").
3. Pense em **como um advogado buscaria** essa norma no dia a dia:
   - Sinônimos técnicos (ex: "corte de árvore" ≈ "supressão vegetal")
   - Termos do processo (ex: "licença ambiental", "autorização prévia")
   - Órgãos envolvidos (ex: "Secretaria de Meio Ambiente", "Vigilância Sanitária")
   - Condicionantes (ex: "estudo de impacto", "EIV", "APF")
4. Escreva no frontmatter:

```yaml
palavras_chave:
  - "supressão de vegetação"
  - "corte de árvore"
  - "licença ambiental"
  - "meio ambiente"
tags:
  - "meio_ambiente"
  - "licenciamento"
```

---

## Critérios de qualidade

| Critério | Exemplo ✅ | Exemplo ❌ |
|---|---|---|
| **Específico ao domínio** | "alvará de construção" | "documento" |
| **Buscável por advogado** | "recurso inominado" | "processo" |
| **Não genérico** | "zoneamento ZU1" | "urbanismo" |
| **Máx. 8 keywords** | 5–7 itens focados | 20 itens soltos |

---

## Dicionário de sinônimos (referência)

O `enrich` usa `scripts/schema/sinonimos.pt-BR.json` para gerar `_auto`. O dicionário casa **apenas título + ementa + aliases** com fronteira de palavra — nunca o corpo inteiro.

Para ampliar o recall, edite o dicionário (não o `enrich`):

```json
{
  "regras": [
    { "match": ["readapta", "readaptacao"], "palavras_chave": ["readaptação funcional", "servidor público"] },
    { "match": ["defesa civil", "deslizamento"], "palavras_chave": ["defesa civil", "risco geológico"] }
  ]
}
```

---

## Fluxo recomendado

1. `npm run enrich` → gera `_auto` (rápido, determinístico)
2. Revise leis críticas → edite `palavras_chave`/`tags` manualmente
3. `npm run validate` → confira `qualidade` (aliases vazios, etc.)
4. `npm run pipeline` → índice final

> **Dica:** não tente automatizar a curadoria com LLM no pipeline. A precisão jurídica exige julgamento humano. O `_auto` cobre 80%; o humano ajusta os 20% que importam.