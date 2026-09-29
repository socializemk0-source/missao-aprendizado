import { describe, expect, it, vi } from 'vitest';
import { createRedacaoHandler, WINDOW_MS } from '../../api/redacao.js';
import { memoryEssays } from '../../server/essays.js';
import type { GradeResult } from '../../server/essay.js';
import type { Plan } from '../../shared/game.js';
import { report } from './essay-fixtures.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

const TEXT = Array.from({ length: 90 }, (_, i) => `palavra${i}`).join(' ') + ' a tecnologia amplia o controle das fronteiras';
const valid = { topicId: 'cebraspe-seguranca', bank: 'Cebraspe', text: TEXT };

function setup(opts: { plan?: Plan; grade?: GradeResult | null } = {}) {
  let clock = new Date('2026-09-01T12:00:00Z');
  const store = memoryEssays({ plan: () => opts.plan ?? 'free' });
  const grade = vi.fn(async () => opts.grade ?? ({ ok: true, report: report() } as GradeResult));
  const handler = createRedacaoHandler({ verifyToken: fakeVerify, store, grade: opts.grade === null ? null : grade, now: () => clock });
  const call = async (method: string, extra: { body?: unknown; query?: Record<string, string>; token?: string } = {}) => {
    const res = makeRes();
    await handler(makeReq({ method, body: extra.body, query: extra.query ?? {}, token: extra.token ?? 'ok:u1' }), res);
    return res;
  };
  return { store, grade, call, advance: (ms: number) => { clock = new Date(clock.getTime() + ms); } };
}

describe('/api/redacao', () => {
  it('sem login → 401', async () => {
    const { call } = setup();
    expect((await call('GET', { token: 'x' })).statusCode).toBe(401);
    expect((await call('POST', { body: valid, token: 'x' })).statusCode).toBe(401);
  });

  it('GET: temas, bancas, rubrica, cota e histórico', async () => {
    const { call } = setup();
    const res = await call('GET');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ enabled: true, minWords: 80, cota: { plano: 'free', limite: 1, usadas: 0, proximaEm: null }, historico: [] });
    expect(res.body.temas.length).toBeGreaterThan(10);
    expect(res.body.criterios.map((c: { max: number }) => c.max).reduce((a: number, b: number) => a + b)).toBe(100);
  });

  it('POST inválido → 400 sem chamar a IA (tema, banca, menos de 80 palavras, texto grande)', async () => {
    const { call, grade } = setup();
    for (const body of [{ ...valid, topicId: 'x' }, { ...valid, bank: 'Banca X' }, { ...valid, text: 'curto demais' }, { ...valid, text: 'a '.repeat(6000) }]) {
      expect((await call('POST', { body })).statusCode).toBe(400);
    }
    expect(grade).not.toHaveBeenCalled();
  });

  it('corrige, soma a nota, grava e mostra no histórico; só o dono abre', async () => {
    const { call } = setup();
    const res = await call('POST', { body: valid });
    expect(res.statusCode).toBe(200);
    expect(res.body.score).toBe(16 + 22 + 15 + 25);
    expect(res.body.cota).toMatchObject({ usadas: 1, proximaEm: '2026-09-08T12:00:00.000Z' });
    const list = (await call('GET')).body.historico;
    expect(list).toEqual([expect.objectContaining({ id: res.body.id, topicTitle: expect.stringMatching(/segurança/), banca: 'Cebraspe', score: 78 })]);
    const one = await call('GET', { query: { id: res.body.id } });
    expect(one.body.redacao).toMatchObject({ content: TEXT, report: { summary: expect.any(String) } });
    expect((await call('GET', { query: { id: res.body.id }, token: 'ok:u2' })).statusCode).toBe(404);
  });

  it('Plano Grátis: 1 correção a cada 7 dias; abre de novo depois', async () => {
    const { call, advance, grade } = setup();
    expect((await call('POST', { body: valid })).statusCode).toBe(200);
    advance(2 * 60_000);
    const blocked = await call('POST', { body: valid });
    expect([blocked.statusCode, blocked.body.code]).toEqual([403, 'LIMITE_PLANO_GRATIS']);
    expect(blocked.body.cota.proximaEm).toBe('2026-09-08T12:00:00.000Z');
    expect(grade).toHaveBeenCalledTimes(1);
    advance(WINDOW_MS);
    expect((await call('POST', { body: valid })).statusCode).toBe(200);
  });

  it('dois envios ao mesmo tempo no grátis: só um é corrigido', async () => {
    const { call, grade } = setup();
    const results = await Promise.all([call('POST', { body: valid }), call('POST', { body: valid })]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 403]);
    expect(grade).toHaveBeenCalledTimes(1);
  });

  it('falha da IA devolve a vaga e explica com código', async () => {
    const { call, store } = setup({ grade: { ok: false, code: 'IA_LIMITE_API', message: 'Limite.' } });
    const res = await call('POST', { body: valid });
    expect([res.statusCode, res.body.code]).toEqual([502, 'IA_LIMITE_API']);
    expect(res.body.error).toMatch(/Nenhuma correção foi descontada/);
    expect(store.rows).toHaveLength(0);
    expect((await call('GET')).body.cota.usadas).toBe(0);
  });

  it('reserva de uma função que morreu no meio deixa de contar depois de 5 min', async () => {
    const { call, store, advance } = setup();
    await store.reserve('u1', { topicId: 't', topicTitle: 'T', banca: 'FGV', content: 'x' }, null, new Date('2026-09-01T12:00:00Z'));
    expect((await call('POST', { body: valid })).statusCode).toBe(403);
    advance(6 * 60_000);
    expect((await call('POST', { body: valid })).statusCode).toBe(200);
  });

  it('PRO: ilimitado', async () => {
    const { call } = setup({ plan: 'pro' });
    for (let i = 0; i < 3; i++) expect((await call('POST', { body: valid })).statusCode).toBe(200);
    expect((await call('GET')).body.cota).toEqual({ plano: 'pro', limite: null, usadas: 0, proximaEm: null });
  });

  it('limite por minuto (5) contra abuso, mesmo no PRO', async () => {
    const { call } = setup({ plan: 'pro' });
    for (let i = 0; i < 5; i++) await call('POST', { body: valid });
    const res = await call('POST', { body: valid });
    expect([res.statusCode, res.body.code]).toEqual([429, 'MUITAS_TENTATIVAS']);
  });

  it('sem chave da OpenAI: GET avisa e POST → 503', async () => {
    const { call } = setup({ grade: null });
    expect((await call('GET')).body.enabled).toBe(false);
    expect((await call('POST', { body: valid })).statusCode).toBe(503);
  });
});
