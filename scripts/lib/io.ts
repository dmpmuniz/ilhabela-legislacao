// io.ts — utilitários de arquivos e CLI. Sem dependências externas.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import type { Dirent } from "node:fs"
import { createHash } from "node:crypto"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/** Raiz do repositório (…/ilhabela-legislacao). */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

/** Lista recursivamente todos os .md de um diretório, ordenados. */
export async function walkMarkdown(root: string): Promise<string[]> {
  const out: string[] = []
  async function rec(dir: string): Promise<void> {
    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === ".git" || e.name === "node_modules" || e.name === "idx") continue
        await rec(p)
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
        out.push(p)
      }
    }
  }
  await rec(root)
  return out.sort()
}

export async function readText(p: string): Promise<string> {
  return readFile(p, "utf8")
}

export async function writeText(p: string, s: string): Promise<void> {
  await mkdir(dirname(p), { recursive: true })
  await writeFile(p, s, "utf8")
}

export async function readJson<T>(p: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(p, "utf8")) as T
  } catch {
    return fallback
  }
}

export async function writeJson(p: string, obj: unknown): Promise<void> {
  await mkdir(dirname(p), { recursive: true })
  await writeFile(p, JSON.stringify(obj, null, 2) + "\n", "utf8")
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex")
}

/** Parser mínimo de argumentos: --chave valor | --flag. */
export function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith("--")) {
      out[key] = next
      i++
    } else {
      out[key] = "true"
    }
  }
  return out
}
