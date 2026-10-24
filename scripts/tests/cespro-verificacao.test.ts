// scripts/tests/cespro-verificacao.test.ts — comparação bloco × diploma do Cespro
//
// Caso real: a PORTARIA_1520_2020 tem aspas no meio da ementa. O bloco do
// export e o diploma do portal precisam ser comparados sem normalizar demais
// (foi justamente um escape perdido que passou na revisão anterior).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFrontmatter } from '../lib/frontmatter.ts';
import { compararDiploma, type BlocoGerado, type DiplomaExtraido } from '../lib/cespro.ts';

async function casoReal(): Promise<{ local: BlocoGerado; remoto: DiplomaExtraido }> {
  const { data, body } = parseFrontmatter(
    await readFile(join('leis', 'PORTARIA_1520_2020.md'), 'utf8'),
  );
  const local: BlocoGerado = {
    titulo: String(data.titulo),
    ementa: String(data.ementa),
    status: 'em vigor',
    corpo: body.trim(),
  };
  return {
    local,
    remoto: {
      titulo: local.titulo,
      tipo: 'PORTARIA',
      numero: '1520',
      ano: '2020',
      ementa: local.ementa ?? '',
      status: 'em_vigor',
      corpo: local.corpo,
    },
  };
}

describe('compararDiploma', () => {
  it('aprova o bloco idêntico ao diploma do Cespro (caso real)', async () => {
    const { local, remoto } = await casoReal();
    assert.deepEqual(compararDiploma(local, remoto), []);
  });

  it('acusa ementa divergente', async () => {
    const { local, remoto } = await casoReal();
    const erros = compararDiploma(local, { ...remoto, ementa: 'outra ementa' });
    assert.deepEqual(erros, ['ementa']);
  });

  it('acusa corpo divergente', async () => {
    const { local, remoto } = await casoReal();
    const erros = compararDiploma(local, { ...remoto, corpo: `${remoto.corpo}\nlinha extra` });
    assert.deepEqual(erros, ['corpo']);
  });

  it('acusa status divergente', async () => {
    const { local, remoto } = await casoReal();
    const erros = compararDiploma(local, { ...remoto, status: 'revogada' });
    assert.deepEqual(erros, ['status: "em vigor" != "revogada"']);
  });

  it('acusa título divergente', async () => {
    const { local, remoto } = await casoReal();
    const erros = compararDiploma(local, { ...remoto, titulo: 'OUTRO TÍTULO' });
    assert.equal(erros.length, 1);
    assert.match(erros[0], /^título:/);
  });

  it('acusa portal sem conteúdo', async () => {
    const { local } = await casoReal();
    assert.deepEqual(compararDiploma(local, null), ['portal sem conteúdo utilizável']);
  });
});
