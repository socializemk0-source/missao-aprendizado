// Limite de chamadas no Postgres de verdade (PG_TEST=1): a contagem é
// atômica e a janela seguinte começa do zero.
import { describe, expect, it } from 'vitest';

const run = process.env.PG_TEST === '1';

describe.runIf(run)('limite de chamadas no Postgres', async () => {
  const { postgresLimiter } = await import('../../server/limite.js');
  const T0 = new Date('2026-10-02T12:00:05Z');

  it('conta certo mesmo com chamadas ao mesmo tempo', async () => {
    const key = `pg-limite-${Date.now()}`;
    const results = await Promise.all(Array.from({ length: 8 }, () => postgresLimiter.hit(key, 5, 60, T0)));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await postgresLimiter.hit(key, 5, 60, new Date(T0.getTime() + 60_000))).toBe(true);
  });
});
