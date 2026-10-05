// Revisão das questões por professor (/api/professor). Só quem está em
// v2.revisores (pelo e-mail do login) entra, e só nas matérias dele. A
// aprovação vale para a versão que o professor viu: se o texto mudou depois,
// a questão volta para a fila.
import { describe, expect, it } from 'vitest';
import { createProfessorHandler } from '../../api/professor.js';
import type { Questao } from '../../content/types.js';
import { memoryProfessor, versaoDe } from '../../server/professor.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

const q = (id: string, disciplina: Questao['disciplina'], extra: Partial<Questao> = {}): Questao => ({
  id, disciplina, assunto: 'Assunto', enunciado: `Enunciado ${id}`, alternativas: ['A', 'B', 'C', 'D'],
  correta: 1, dificuldade: 1, explicacao: `Explicação ${id}`, fonte: { tipo: 'autoral', estilo: 'FGV' }, ...extra,
});

function setup() {
  const store = memoryProfessor({
    revisores: [
      { email: 'prof-pt@teste.dev', nome: 'Profa. Ana', disciplinas: ['portugues'] },
      { email: 'coord@teste.dev', nome: 'Coordenação', disciplinas: null },
    ],
    trilha: [q('tr-pt-1', 'portugues'), q('tr-rlm-1', 'rlm')],
    banco: [
      { ...q('bn-pt-1', 'portugues'), status: 'revisao' },
      { ...q('bn-pt-2', 'portugues'), status: 'revisao' },
      { ...q('bn-pt-3', 'portugues'), status: 'ativa' },
      { ...q('bn-rlm-1', 'rlm'), status: 'revisao' },
    ],
  });
  const handler = createProfessorHandler({ verifyToken: fakeVerify, store });
  const call = async (user: string, method: 'GET' | 'POST', body?: unknown) => {
    const res = makeRes();
    await handler(makeReq({ method, headers: { authorization: `Bearer ok:${user}` }, body }), res);
    return res;
  };
  return { store, call };
}

type Fila = { fila: { id: string; origem: string; versao: string; situacao: string; pedido: { nota: string } | null }[]; revisor: { nome: string; disciplinas: string[] | null } };

describe('/api/professor', () => {
  it('sem login: 401. Aluno comum (fora da lista de revisores): 403 em português', async () => {
    const { call } = setup();
    const res = makeRes();
    const { createProfessorHandler: h } = await import('../../api/professor.js');
    await h({ verifyToken: fakeVerify, store: memoryProfessor({ revisores: [], trilha: [], banco: [] }) })(makeReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(401);
    const aluno = await call('aluno', 'GET');
    expect(aluno.statusCode).toBe(403);
    expect(aluno.body).toMatchObject({ code: 'NAO_REVISOR' });
  });

  it('a fila traz só as matérias do professor: questões da trilha sem aprovação e do banco em revisão, com gabarito e explicação', async () => {
    const { call } = setup();
    const res = await call('prof-pt', 'GET');
    expect(res.statusCode).toBe(200);
    const body = res.body as Fila;
    expect(body.revisor).toEqual({ nome: 'Profa. Ana', disciplinas: ['portugues'] });
    expect(body.fila.map((x) => x.id).sort()).toEqual(['bn-pt-1', 'bn-pt-2', 'tr-pt-1']);
    expect(body.fila.find((x) => x.id === 'tr-pt-1')).toMatchObject({ origem: 'trilha', situacao: 'pendente', correta: 1, explicacao: 'Explicação tr-pt-1' });
    expect(body.fila.find((x) => x.id === 'bn-pt-1')).toMatchObject({ origem: 'banco', situacao: 'pendente' });
    expect(res.headers['Cache-Control']).toBe('no-store');

    const coord = (await call('coord', 'GET')).body as Fila;
    expect(coord.fila).toHaveLength(5);
  });

  it('aprovar uma questão do banco: vira "ativa" (chega ao aluno) e sai da fila; fica registrado quem aprovou', async () => {
    const { call, store } = setup();
    const fila = (await call('prof-pt', 'GET')).body as Fila;
    const alvo = fila.fila.find((x) => x.id === 'bn-pt-1')!;
    const res = await call('prof-pt', 'POST', { questionId: 'bn-pt-1', versao: alvo.versao, acao: 'aprovar' });
    expect(res.statusCode).toBe(200);
    expect(store.status('bn-pt-1')).toBe('ativa');
    expect(store.registros.at(-1)).toMatchObject({ questionId: 'bn-pt-1', acao: 'aprovar', userId: 'prof-pt', email: 'prof-pt@teste.dev' });
    const depois = (await call('prof-pt', 'GET')).body as Fila;
    expect(depois.fila.map((x) => x.id)).not.toContain('bn-pt-1');
  });

  it('aprovar uma questão da trilha registra a aprovação daquela versão; se o texto mudar, ela volta para a fila', async () => {
    const { call, store } = setup();
    const alvo = ((await call('prof-pt', 'GET')).body as Fila).fila.find((x) => x.id === 'tr-pt-1')!;
    expect((await call('prof-pt', 'POST', { questionId: 'tr-pt-1', versao: alvo.versao, acao: 'aprovar' })).statusCode).toBe(200);
    expect(((await call('prof-pt', 'GET')).body as Fila).fila.map((x) => x.id)).not.toContain('tr-pt-1');

    store.editarTrilha('tr-pt-1', { explicacao: 'Explicação reescrita' });
    const volta = ((await call('prof-pt', 'GET')).body as Fila).fila.find((x) => x.id === 'tr-pt-1');
    expect(volta).toMatchObject({ situacao: 'pendente' });
    expect(volta!.versao).not.toBe(alvo.versao);
  });

  it('pedir correção exige o motivo; a questão vai para "correção pedida" e continua fora do aluno', async () => {
    const { call, store } = setup();
    const alvo = ((await call('prof-pt', 'GET')).body as Fila).fila.find((x) => x.id === 'bn-pt-2')!;
    const semNota = await call('prof-pt', 'POST', { questionId: 'bn-pt-2', versao: alvo.versao, acao: 'corrigir', nota: '  ' });
    expect(semNota.statusCode).toBe(400);
    expect(semNota.body).toMatchObject({ error: expect.stringContaining('o que precisa mudar') });

    const ok = await call('prof-pt', 'POST', { questionId: 'bn-pt-2', versao: alvo.versao, acao: 'corrigir', nota: 'A alternativa C também está certa.' });
    expect(ok.statusCode).toBe(200);
    expect(store.status('bn-pt-2')).toBe('revisao');
    const item = ((await call('prof-pt', 'GET')).body as Fila).fila.find((x) => x.id === 'bn-pt-2')!;
    expect(item).toMatchObject({ situacao: 'correcao', pedido: { nota: 'A alternativa C também está certa.' } });

    // Corrigida (texto novo): volta como pendente, mostrando o pedido anterior.
    store.editarBanco('bn-pt-2', { alternativas: ['A', 'B', 'C corrigida', 'D'] });
    const corrigida = ((await call('prof-pt', 'GET')).body as Fila).fila.find((x) => x.id === 'bn-pt-2')!;
    expect(corrigida).toMatchObject({ situacao: 'pendente', pedido: { nota: 'A alternativa C também está certa.' } });
  });

  it('descartar (só do banco, com motivo) anula a questão; na trilha não dá para descartar', async () => {
    const { call, store } = setup();
    const fila = ((await call('prof-pt', 'GET')).body as Fila).fila;
    const bn = fila.find((x) => x.id === 'bn-pt-1')!;
    expect((await call('prof-pt', 'POST', { questionId: 'bn-pt-1', versao: bn.versao, acao: 'descartar', nota: 'Assunto fora do edital.' })).statusCode).toBe(200);
    expect(store.status('bn-pt-1')).toBe('anulada');
    const tr = fila.find((x) => x.id === 'tr-pt-1')!;
    const res = await call('prof-pt', 'POST', { questionId: 'tr-pt-1', versao: tr.versao, acao: 'descartar', nota: 'x' });
    expect(res.statusCode).toBe(400);
  });

  it('o servidor decide o alcance: matéria de outro professor, questão já ativa ou inexistente → 404', async () => {
    const { call } = setup();
    for (const questionId of ['bn-rlm-1', 'tr-rlm-1', 'bn-pt-3', 'nao-existe']) {
      const res = await call('prof-pt', 'POST', { questionId, versao: 'x', acao: 'aprovar' });
      expect(res.statusCode, questionId).toBe(404);
    }
  });

  it('se o texto mudou depois que o professor abriu, não aprova a versão errada (409)', async () => {
    const { call, store } = setup();
    const alvo = ((await call('prof-pt', 'GET')).body as Fila).fila.find((x) => x.id === 'bn-pt-1')!;
    store.editarBanco('bn-pt-1', { enunciado: 'Enunciado novo' });
    const res = await call('prof-pt', 'POST', { questionId: 'bn-pt-1', versao: alvo.versao, acao: 'aprovar' });
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'VERSAO_MUDOU' });
    expect(store.status('bn-pt-1')).toBe('revisao');
  });

  it('pedido inválido (ação desconhecida, motivo longo demais) → 400; método errado → 405', async () => {
    const { call } = setup();
    expect((await call('prof-pt', 'POST', { questionId: 'bn-pt-1', versao: 'x', acao: 'publicar' })).statusCode).toBe(400);
    expect((await call('prof-pt', 'POST', { questionId: 'bn-pt-1', versao: 'x', acao: 'corrigir', nota: 'a'.repeat(2001) })).statusCode).toBe(400);
    const res = makeRes();
    await createProfessorHandler({ verifyToken: fakeVerify, store: memoryProfessor({ revisores: [], trilha: [], banco: [] }) })(makeReq({ method: 'DELETE' }), res);
    expect(res.statusCode).toBe(405);
  });
});

describe('versaoDe', () => {
  it('muda quando muda enunciado, alternativas, gabarito ou explicação; não muda com o mesmo texto', () => {
    const base = q('x', 'portugues');
    expect(versaoDe(base)).toBe(versaoDe({ ...base }));
    for (const mud of [{ enunciado: 'outro' }, { alternativas: ['A', 'B'] }, { correta: 2 }, { explicacao: 'outra' }]) {
      expect(versaoDe({ ...base, ...mud })).not.toBe(versaoDe(base));
    }
  });
});
