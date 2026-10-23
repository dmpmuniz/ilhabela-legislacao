// norma-doc.ts — completamento do frontmatter para o schema v1.1.
//
// Único ponto que sabe QUAIS campos um documento do corpus precisa além dos
// que a fonte traz: cidade/estado/esfera (identidade do acervo), url_fonte
// (origem citável), coletado_em, sha256_raw (hash da fonte bruta, para detectar
// mudança de texto em re-sincronizações) e versao_formato.
//
// Compartilhado por ingest.ts (pacote bruto → corpus) e atualizar.ts
// (portal → corpus) para que os dois caminhos não divirjam.

import type { Frontmatter } from "./frontmatter.ts"

export function completarFrontmatter(
  fm: Frontmatter,
  opts: {
    cidade: string
    estado: string
    esfera: string
    url?: string
    coletadoEm: string
    sha256: string
  },
): Frontmatter {
  return {
    ...fm,
    cidade: opts.cidade,
    estado: opts.estado,
    esfera: opts.esfera,
    ...(opts.url ? { url_fonte: opts.url } : {}),
    coletado_em: opts.coletadoEm,
    sha256_raw: opts.sha256,
    versao_formato: "1.1",
  }
}
