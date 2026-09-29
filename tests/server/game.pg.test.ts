// O motor do jogo contra o Postgres de verdade (PG_TEST=1).
import { describe, expect, it } from 'vitest';
import { fase, questao } from '../../content/trilha.js';
import { answer, claimMission, getMissions, getProgress, getRanking, getTrail } from '../../server/game.js';

const run = process.env.PG_TEST === '1';
const right = (id: string) => questao(id)!.correta;

describe.runIf(run)('jogo no Postgres', async () => {
  const { postgresGame } = await import('../../server/game-pg.js');
  const { postgresProfiles } = await import('../../server/profiles.js');
  const { db } = await import('../../server/db.js');
  const { profiles } = await import('../../server/schema.js');
  const { eq } = await import('drizzle-orm');
  const id = (s: string) => `pg-game-${Date.now()}-${s}`;

  it('concluir fase, desbloquear a próxima e somar XP (sem dobrar em envios simultâneos)', async () => {
    const u = id('a');
    await postgresProfiles.ensure({ id: u, email: null, name: 'Aluno PG' });
    const q = 'pt-acent-1';
    const results = await Promise.all([1, 2, 3, 4].map(() => answer(postgresGame, u, { questionId: q, choice: right(q), mode: 'trilha' })));
    expect(results.map((r) => r.xpGanho).sort()).toEqual([0, 0, 0, 10]);
    for (const qq of fase('fase-01-1')!.questoes.slice(1)) await answer(postgresGame, u, { questionId: qq, choice: right(qq), mode: 'trilha' });
    expect((await getProgress(postgresGame, u)).xp).toBe(60);
    const trail = await getTrail(postgresGame, u);
    expect(trail[0]!.fases.map((f) => f.status)).toEqual(['done', 'available']);
  });

  it('missão: resgate único mesmo com pedidos simultâneos; ranking com nome do perfil', async () => {
    const u = id('b');
    await postgresProfiles.ensure({ id: u, email: null, name: 'Rank PG' });
    for (const qq of fase('fase-01-1')!.questoes) await answer(postgresGame, u, { questionId: qq, choice: right(qq), mode: 'trilha' });
    expect((await getMissions(postgresGame, u)).find((m) => m.id === 'concluir-fase')!.atual).toBe(1);
    const claims = await Promise.allSettled([1, 2, 3].map(() => claimMission(postgresGame, u, 'concluir-fase')));
    expect(claims.filter((c) => c.status === 'fulfilled')).toHaveLength(1);
    expect((await getProgress(postgresGame, u)).xp).toBe(60 + 25);
    const ranking = await getRanking(postgresGame, u, 100);
    expect(ranking.top.some((t) => t.voce && t.nome === 'Rank PG')).toBe(true);
  });

  it('PRO vem de pro_until no perfil; vencido volta a ser grátis', async () => {
    const u = id('c');
    await postgresProfiles.ensure({ id: u, email: null, name: 'Pro PG' });
    await db().update(profiles).set({ proUntil: new Date(Date.now() + 86_400_000) }).where(eq(profiles.userId, u));
    expect((await getProgress(postgresGame, u)).plan).toBe('pro');
    await db().update(profiles).set({ proUntil: new Date(Date.now() - 1000) }).where(eq(profiles.userId, u));
    expect((await getProgress(postgresGame, u)).plan).toBe('free');
  });
});
