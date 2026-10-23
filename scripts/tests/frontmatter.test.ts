// scripts/tests/frontmatter.test.ts — o parser compartilhado precisa desescapar
// as aspas do frontmatter. Caso real: em 23/10/2026 a ementa da
// PORTARIA_1520_2020 saía na parte como `\"CAPUT\"` (com barras invertidas)
// porque o gerador tinha um parser próprio que não desescapava.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.ts';

describe('parseFrontmatter', () => {
  it('desescapa aspas no campo ementa (caso real PORTARIA_1520_2020)', async () => {
    const { data } = parseFrontmatter(
      await readFile(join('leis', 'PORTARIA_1520_2020.md'), 'utf8'),
    );
    assert.match(String(data.ementa), /ART\. 25 "CAPUT"/);
    assert.doesNotMatch(String(data.ementa), /\\"/);
  });
});
