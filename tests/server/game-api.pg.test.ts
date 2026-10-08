// /api/game contra o Postgres de verdade (PG_TEST=1): 20 pedidos em
// paralelo da mesma conta, replay da Idempotency-Key, hora do banco e a
// trava otimista de user_stats.
import { describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game.js';
import { fase, questao } from '../../content/trilha.js';
import { XP_FIRST_CORRECT, XP_PHASE_BONUS } from '../../shared/game.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

const run = process.env.PG_TEST === '1';
const right = (id: string) => questao(id)!.correta;
const FASE1 = fase('fase-01-1')!.questoes;

describe.runIf(run)('/api/game no Postgres', async () => {
  const { postgresGame } = await import('../../server/game-pg.js');
  const { postgresIdempotency } = await import('../../server/idempotencia.js');
  const { postgresProfiles } = await import('../../server/profiles.js');
  const { StatsConflict, getProgress } = await import('../../server/game.js');
  const { db } = await import('../../server/db.js');
  const { sql } = await import('drizzle-orm');
  const handler = createGameHandler({ verifyToken: fakeVerify, store: postgresGame, limiter: null, idempotency: postgresIdempotency });
  const novoAluno = async (s: string) => {
    const u = `pg-api-${Date.now()}-${s}`;
    await postgresProfiles.ensure({ id: u, email: null, name: 'Aluno PG' });
    return u;
  };
  const responder = async (u: string, q: string, key = crypto.randomUUID()) => {
    const res = makeRes();
    await handler(makeReq({
      method: 'POST', query: { action: 'responder' }, token: `ok:${u}`,
      headers: { 'idempotency-key': key }, body: { questionId: q, choice: right(q), mode: 'trilha' },
    }), res);
    return res;
  };

  it('20 respostas em paralelo: o XP final bate com as tentativas que valem, nem 1 a mais', async () => {
    const u = await novoAluno('a');
    const pedidos = Array.from({ length: 20 }, (_, i) => FASE1[i % FASE1.length]!);
    const results = await Promise.all(pedidos.map((q) => responder(u, q)));
    expect(results.map((r) => r.statusCode)).toEqual(Array(20).fill(200));
    const esperado = FASE1.length * XP_FIRST_CORRECT + XP_PHASE_BONUS;
    expect(results.reduce((s, r) => s + r.body.xpGanho, 0)).toBe(esperado);
    expect((await getProgress(postgresGame, u)).xp).toBe(esperado);
    const answers = await db().execute(sql`select count(*)::int as n from v2.answers where user_id = ${u}`);
    expect((answers as unknown as { rows: { n: number }[] }).rows[0]!.n).toBe(20);
  });

  it('20 envios em paralelo com a MESMA chave: uma resposta gravada, XP uma vez', async () => {
    const u = await novoAluno('b');
    const key = crypto.randomUUID();
    const results = await Promise.all(Array.from({ length: 20 }, () => responder(u, FASE1[0]!, key)));
    expect(results.every((r) => r.statusCode === 200 || r.body.code === 'idempotency_in_progress')).toBe(true);
    expect((await getProgress(postgresGame, u)).xp).toBe(XP_FIRST_CORRECT);
    const answers = await db().execute(sql`select count(*)::int as n from v2.answers where user_id = ${u}`);
    expect((answers as unknown as { rows: { n: number }[] }).rows[0]!.n).toBe(1);
    // Terminado o processamento, a mesma chave devolve a mesma resposta.
    const again = await responder(u, FASE1[0]!, key);
    expect([again.statusCode, again.headers['Idempotent-Replayed'], again.body.xpGanho]).toEqual([200, 'true', XP_FIRST_CORRECT]);
    const outro = await responder(u, FASE1[1]!, key);
    expect([outro.statusCode, outro.body.code]).toEqual([422, 'idempotency_conflict']);
  });

  it('a hora vem do Postgres', async () => {
    const antes = Date.now();
    const agora = await postgresGame.now();
    expect(Math.abs(agora.getTime() - antes)).toBeLessThan(60_000);
  });

  it('trava otimista: gravar user_stats com versão velha é recusado', async () => {
    const u = await novoAluno('c');
    await responder(u, FASE1[0]!);
    await expect(postgresGame.withUser(u, async (tx) => {
      const lida = (await tx.stats())!;
      await tx.saveStats({ ...lida, xp: lida.xp + 1 });
      await tx.saveStats({ ...lida, xp: lida.xp + 1000 }); // versão já usada
    })).rejects.toBeInstanceOf(StatsConflict);
    expect((await getProgress(postgresGame, u)).xp).toBe(XP_FIRST_CORRECT); // a transação inteira foi desfeita
  });
});
