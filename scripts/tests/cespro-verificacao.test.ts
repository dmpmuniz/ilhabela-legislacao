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
import { compararDiploma, statusDaNota, type BlocoGerado, type DiplomaExtraido } from '../lib/cespro.ts';

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

  it('trata ementa numérica "1" e "01" como iguais', async () => {
    const { local, remoto } = await casoReal();
    assert.deepEqual(
      compararDiploma({ ...local, ementa: '1' }, { ...remoto, ementa: '01' }),
      [],
    );
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

  // Casos reais da inconsistência do portal: a página do diploma diz
  // "em vigor", mas a nota do corpo ou a listagem registram a saída.
  it('aceita status local confirmado pela nota do corpo', async () => {
    const local = await lerNorma('DECRETO_MUNICIPAL_9320_2022.md');
    assert.equal(local.status, 'expirada');
    assert.deepEqual(compararDiploma(local, remotoDe(local)), []);
  });

  it('aceita status local confirmado pela listagem', async () => {
    const local = await lerNorma('DECRETO_MUNICIPAL_9561_2022.md');
    assert.equal(local.status, 'expirada');
    assert.deepEqual(compararDiploma(local, remotoDe(local), 'EFEITOS CESSADOS'), []);
    assert.deepEqual(compararDiploma(local, remotoDe(local), 'EM VIGOR'), [
      'status: "expirada" != "em vigor"',
    ]);
  });

  it('não aceita local em vigor contra portal fora de vigor (assimetria)', async () => {
    const local = await lerNorma('DECRETO_MUNICIPAL_9320_2022.md');
    const emVigor = { ...local, status: 'em vigor' };
    assert.deepEqual(compararDiploma(emVigor, remotoDe(local, 'revogada'), 'REVOGADO'), [
      'status: "em vigor" != "revogada"',
    ]);
  });
});

describe('statusDaNota', () => {
  it('reconhece as notas reais de saída de vigor', async () => {
    assert.equal(statusDaNota((await lerNorma('DECRETO_MUNICIPAL_11688_2026.md')).corpo), 'revogada');
    assert.equal(statusDaNota((await lerNorma('DECRETO_MUNICIPAL_9320_2022.md')).corpo), 'expirada');
  });

  it('ignora "revogam-se as disposições em contrário" no articulado', async () => {
    assert.equal(statusDaNota((await lerNorma('DECRETO_MUNICIPAL_9561_2022.md')).corpo), null);
  });
});

async function lerNorma(nome: string): Promise<BlocoGerado> {
  const { data, body } = parseFrontmatter(await readFile(join('leis', nome), 'utf8'));
  return {
    titulo: String(data.titulo),
    ementa: String(data.ementa),
    status: String(data.status).replaceAll('_', ' '),
    corpo: body.trim(),
  };
}

function remotoDe(local: BlocoGerado, status = 'em_vigor'): DiplomaExtraido {
  return {
    titulo: local.titulo,
    tipo: '',
    numero: '',
    ano: '',
    ementa: local.ementa ?? '',
    status,
    corpo: local.corpo,
  };
}
