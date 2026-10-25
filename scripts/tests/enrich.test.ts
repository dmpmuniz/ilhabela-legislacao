// scripts/tests/enrich.test.ts — o dicionário de sinônimos não pode taguear
// "mobilidade urbana" numa lei de multas de trânsito. Caso real: a Lei 285/2004
// (parcelamento de multas de trânsito) carregava a palavra-chave e o NotebookLM
// atribuiu a ela conteúdo da Estratégia de Mobilidade Urbana (Lote 5, forma A,
// erro 4 — docs/RELATORIO-VALIDACAO.md).
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseFrontmatter } from '../lib/frontmatter.ts';
import { repoRoot } from '../lib/io.ts';

let dir: string;
let corpusDir: string;
let idxDir: string;

const norma = (arquivo: string, titulo: string, ementa: string) =>
  `---\nid: 1\ntipo: lei\nnumero: 1\nano: 2004\ncidade: Ilhabela\nestado: SP\n` +
  `esfera: municipal\nstatus: em_vigor\ntitulo: "${titulo}"\n` +
  `ementa: "${ementa}"\nurl_fonte: "https://www.cespro.com.br/x"\nversao_formato: "1.1"\n` +
  `---\n${titulo}\nCorpo.\n`;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'enrich-test-'));
  corpusDir = join(dir, 'corpus');
  idxDir = join(dir, 'idx');
  await mkdir(corpusDir, { recursive: true });
  await mkdir(idxDir, { recursive: true });
  await writeFile(
    join(corpusDir, 'LEI_MUNICIPAL_285_2004.md'),
    norma(
      'LEI MUNICIPAL Nº 285, DE 20/08/2004',
      'DISPÕE SOBRE O PARCELAMENTO DE DÉBITOS DECORRENTES DE MULTAS DE TRÂNSITO NO MUNICÍPIO DE ILHABELA E DÁ OUTRAS PROVIDÊNCIAS.',
    ),
    'utf8',
  );
  await writeFile(
    join(corpusDir, 'LEI_MUNICIPAL_286_2004.md'),
    norma(
      'LEI MUNICIPAL Nº 286, DE 20/08/2004',
      'DISPÕE SOBRE O PLANO DE MOBILIDADE URBANA DO MUNICÍPIO DE ILHABELA.',
    ),
    'utf8',
  );
  await writeFile(
    join(corpusDir, 'LEI_MUNICIPAL_287_2004.md'),
    norma(
      'LEI MUNICIPAL Nº 287, DE 20/08/2004',
      'DISPÕE SOBRE O TRANSPORTE PÚBLICO COLETIVO URBANO NO MUNICÍPIO DE ILHABELA.',
    ),
    'utf8',
  );
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('enrich — dicionário de sinônimos (caso real Lei 285/2004)', () => {
  it('multas de trânsito não ganham a palavra-chave mobilidade urbana', async () => {
    const r = spawnSync(
      process.execPath,
      ['--experimental-strip-types', join(repoRoot, 'scripts', 'enrich.ts'), '--laws', corpusDir, '--idx', idxDir],
      { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr);
    const { data } = parseFrontmatter(await readFile(join(corpusDir, 'LEI_MUNICIPAL_285_2004.md'), 'utf8'));
    assert.ok(!((data.palavras_chave_auto ?? []) as string[]).includes('mobilidade urbana'));
    assert.ok(!((data.tags_auto ?? []) as string[]).includes('mobilidade_urbana'));
  });

  it('plano de mobilidade e transporte público continuam tagueados', async () => {
    const r = spawnSync(
      process.execPath,
      ['--experimental-strip-types', join(repoRoot, 'scripts', 'enrich.ts'), '--laws', corpusDir, '--idx', idxDir],
      { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr);
    for (const f of ['LEI_MUNICIPAL_286_2004.md', 'LEI_MUNICIPAL_287_2004.md']) {
      const { data } = parseFrontmatter(await readFile(join(corpusDir, f), 'utf8'));
      assert.ok(((data.palavras_chave_auto ?? []) as string[]).includes('mobilidade urbana'), f);
      assert.ok(((data.tags_auto ?? []) as string[]).includes('mobilidade_urbana'), f);
    }
  });
});
