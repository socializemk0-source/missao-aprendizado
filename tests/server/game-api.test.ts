import { describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game.js';
import { questao } from '../../content/trilha.js';
import { memoryGameStore } from '../../server/game-memory.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

function setup() {
  const store = memoryGameStore();
  const handler = createGameHandler({ verifyToken: fakeVerify, store });
  const call = async (method: string, action: string, extra: { query?: Record<string, string>; body?: unknown; token?: string } = {}) => {
    const res = makeRes();
    await handler(makeReq({ method, query: { action, ...(extra.query ?? {}) }, body: extra.body, token: extra.token ?? 'ok:u1' }), res);
    return res;
  };
  return { store, call };
}

describe('/api/game', () => {
  it('sem login → 401', async () => {
    const { call } = setup();
    expect((await call('GET', 'trilha', { token: 'forjado' })).statusCode).toBe(401);
  });

  it('trilha e fase: fase aberta vem sem gabarito; bloqueada → 403 com código', async () => {
    const { call } = setup();
    const trail = await call('GET', 'trilha');
    expect(trail.statusCode).toBe(200);
    expect(trail.body.capitulos).toHaveLength(10);
    expect(trail.body.progress).toMatchObject({ xp: 0, hearts: 5 });
    const ok = await call('GET', 'fase', { query: { id: 'fase-01-1' } });
    expect(ok.body.questoes[0]).not.toHaveProperty('correta');
    const blocked = await call('GET', 'fase', { query: { id: 'fase-01-2' } });
    expect([blocked.statusCode, blocked.body.code]).toEqual([403, 'FASE_BLOQUEADA']);
  });

  it('responder devolve gabarito, explicação e progresso; corpo inválido → 400', async () => {
    const { call } = setup();
    const q = 'pt-acent-1';
    const res = await call('POST', 'responder', { body: { questionId: q, choice: questao(q)!.correta, mode: 'trilha' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ correct: true, xpGanho: 10, progress: { xp: 10 } });
    for (const body of [{ questionId: q, choice: '1', mode: 'trilha' }, { questionId: q, choice: 1, mode: 'turbo' }, null]) {
      expect((await call('POST', 'responder', { body })).statusCode).toBe(400);
    }
  });

  it('sem vidas → 403 SEM_VIDAS com a hora da próxima vida', async () => {
    const { call } = setup();
    const q = 'pt-acent-1';
    const wrong = (questao(q)!.correta + 1) % 4;
    for (let i = 0; i < 5; i++) await call('POST', 'responder', { body: { questionId: q, choice: wrong, mode: 'trilha' } });
    const res = await call('POST', 'responder', { body: { questionId: q, choice: wrong, mode: 'trilha' } });
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('SEM_VIDAS');
    expect(typeof res.body.nextHeartAt).toBe('string');
  });

  it('ação desconhecida → 400; outros métodos → 405', async () => {
    const { call } = setup();
    expect((await call('GET', 'hackear')).statusCode).toBe(400);
    expect((await call('DELETE', 'trilha')).statusCode).toBe(405);
  });
});

describe('/api/game — simulado', () => {
  it('opções, iniciar (sem gabarito), entregar, ver; erros com código', async () => {
    const { call } = setup();
    const opts = await call('GET', 'simulados');
    expect(opts.body).toMatchObject({ limite: { plano: 'free', porDia: 1, usadosHoje: 0 }, aberto: null });
    expect((await call('POST', 'simulado-iniciar', { body: { nivel: 'x', disciplinas: ['rlm'], quantidade: 10 } })).statusCode).toBe(400);
    const start = await call('POST', 'simulado-iniciar', { body: { nivel: 'misto', disciplinas: ['portugues', 'rlm'], quantidade: 10, cronometro: true } });
    expect(start.statusCode).toBe(200);
    expect(start.body.questoes).toHaveLength(10);
    expect(start.body.questoes[0]).not.toHaveProperty('correta');
    const again = await call('POST', 'simulado-iniciar', { body: { nivel: 'misto', disciplinas: ['rlm'], quantidade: 5 } });
    expect([again.statusCode, again.body.code, again.body.id]).toEqual([409, 'SIMULADO_ABERTO', start.body.id]);
    const done = await call('POST', 'simulado-entregar', { body: { id: start.body.id, respostas: {} } });
    expect(done.body.resultado).toMatchObject({ total: 10, respondidas: 0, acertos: 0 });
    const view = await call('GET', 'simulado', { query: { id: start.body.id } });
    expect(view.body.estado).toBe('entregue');
    const limit = await call('POST', 'simulado-iniciar', { body: { nivel: 'misto', disciplinas: ['rlm'], quantidade: 5 } });
    expect([limit.statusCode, limit.body.code]).toEqual([403, 'LIMITE_SIMULADO']);
    expect((await call('GET', 'simulado', { query: { id: start.body.id }, token: 'ok:u2' })).statusCode).toBe(404);
    expect((await call('POST', 'simulado-entregar', { body: { id: start.body.id } })).statusCode).toBe(400);
  });
});
