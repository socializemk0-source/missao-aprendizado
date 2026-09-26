// Redações no Postgres de verdade (PG_TEST=1).
import { describe, expect, it } from 'vitest';
import { report } from './essay-fixtures.js';

const run = process.env.PG_TEST === '1';

describe.runIf(run)('redações no Postgres', async () => {
  const { postgresEssays } = await import('../../server/essays.js');
  const id = (s: string) => `pg-essay-${Date.now()}-${s}`;
  const essay = { topicId: 'cebraspe-seguranca', topicTitle: 'Segurança', banca: 'Cebraspe', content: 'texto' };
  const window = (now: Date) => ({ since: new Date(now.getTime() - 7 * 864e5), staleBefore: new Date(now.getTime() - 5 * 60_000), limit: 1 });

  it('reserva com cota: só uma passa em envios simultâneos; devolver libera', async () => {
    const u = id('a');
    const now = new Date();
    const ids = await Promise.all([1, 2, 3].map(() => postgresEssays.reserve(u, essay, window(now), now)));
    const ok = ids.filter(Boolean) as string[];
    expect(ok).toHaveLength(1);
    await postgresEssays.release(ok[0]!);
    expect(await postgresEssays.counted(u, window(now))).toHaveLength(0);
    expect(await postgresEssays.reserve(u, essay, window(now), now)).toBeTruthy();
  });

  it('corrigida vai para o histórico, com relatório, só para o dono; reserva velha não conta', async () => {
    const u = id('b');
    const now = new Date();
    const essayId = (await postgresEssays.reserve(u, essay, null, now))!;
    await postgresEssays.complete(essayId, report(), 78);
    const [row] = await postgresEssays.list(u, 10);
    expect(row).toMatchObject({ id: essayId, score: 78, banca: 'Cebraspe' });
    expect((await postgresEssays.get(u, essayId))?.report.summary).toBe(report().summary);
    expect(await postgresEssays.get(id('outro'), essayId)).toBeNull();
    expect(await postgresEssays.get(u, 'nao-e-uuid')).toBeNull();

    const v = id('c');
    const old = new Date(Date.now() - 10 * 60_000);
    await postgresEssays.reserve(v, essay, null, old);
    expect(await postgresEssays.counted(v, window(new Date()))).toHaveLength(0);
    expect(await postgresEssays.plan(v)).toBe('free');
  });
});
