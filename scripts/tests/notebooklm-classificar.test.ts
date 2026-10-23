// scripts/tests/notebooklm-classificar.test.ts — Classificação temática do export
//
// Cada caso abaixo é uma norma REAL do acervo que revelou um erro de
// classificação na revisão de 23/10/2026 (plano-curadoria.md §7.1):
//   - 1.845 decretos de exoneração nos decretos gerais;
//   - 228 portarias de provimento/posse no catch-all (rótulo "concurso");
//   - ~220 PAD/sindicância no catch-all;
//   - 358 adicionais no catch-all.
// O teste lê o frontmatter do corpus: se a norma mudar, o caso real muda junto.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.ts';
import { classificar } from '../lib/notebooklm-classificar.mjs';

async function grupoDe(arquivo: string) {
  const { data } = parseFrontmatter(await readFile(join('leis', arquivo), 'utf8'));
  return classificar(data);
}

describe('classificar — atos de pessoal', () => {
  it('decreto de exoneração vai para o grupo de nomeação/exoneração', async () => {
    assert.equal(await grupoDe('DECRETO_MUNICIPAL_051_2001.md'), 'decreto-nomeacao');
  });

  it('decreto de nomeação continua no grupo de nomeação/exoneração', async () => {
    assert.equal(await grupoDe('DECRETO_MUNICIPAL_002_2001.md'), 'decreto-nomeacao');
  });

  it('portaria de PAD vai para disciplinar', async () => {
    assert.equal(await grupoDe('PORTARIA_024_2022.md'), 'portaria-disciplinar');
  });

  it('portaria de sindicância vai para disciplinar', async () => {
    assert.equal(await grupoDe('PORTARIA_1032_2025.md'), 'portaria-disciplinar');
  });

  it('portaria de provimento/posse tem grupo próprio', async () => {
    assert.equal(await grupoDe('PORTARIA_021_2026.md'), 'portaria-provimento');
  });

  it('portaria de adicional vai para gratificação, adicionais e prêmios', async () => {
    assert.equal(await grupoDe('PORTARIA_004_2021.md'), 'portaria-gratificacao');
  });

  it('portaria de nomeação continua em nomeação/exoneração', async () => {
    assert.equal(await grupoDe('PORTARIA_003_2023.md'), 'portaria-nomeacao-exoneracao');
  });
});

describe('classificar — ementa numérica', () => {
  it('portaria com ementa "1" não quebra e cai em diversas', async () => {
    assert.equal(await grupoDe('PORTARIA_2177_2017.md'), 'portaria-outros');
  });

  it('decreto com ementa "29" não quebra e cai em decretos', async () => {
    assert.equal(await grupoDe('DECRETO_MUNICIPAL_1217_2006.md'), 'decreto');
  });
});

describe('classificar — fora de vigor', () => {
  it('norma expirada vai para o grupo de expiradas', async () => {
    assert.equal(await grupoDe('DECRETO_MUNICIPAL_1665_2008.md'), 'fora-vigor-expirada');
  });

  it('lei revogada continua no grupo de leis revogadas', async () => {
    assert.equal(await grupoDe('LEI_MUNICIPAL_176_1984_2.md'), 'revogada-lei');
  });
});
