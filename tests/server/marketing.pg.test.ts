// Medição de marketing no Postgres de verdade (PG_TEST=1).
import { describe, expect, it } from 'vitest';

const run = process.env.PG_TEST === '1';

describe.runIf(run)('marketing no Postgres', async () => {
  const { sql } = await import('drizzle-orm');
  const { db } = await import('../../server/db.js');
  const { postgresMarketing } = await import('../../server/marketing-pg.js');
  const dataDe = async (u: string) => {
    const r = (await db().execute(sql`select consentimento_em from v2.marketing_usuarios where user_id = ${u}`)) as unknown as { rows: { consentimento_em: Date | string }[] };
    return new Date(r.rows[0]!.consentimento_em).toISOString();
  };

  it('consentimento: grava, revoga e mantém a data quando a escolha se repete', async () => {
    const u = `pg-mkt-${Date.now()}`;
    expect(await postgresMarketing.consentimento(u)).toBeNull();
    await postgresMarketing.salvarConsentimento(u, true, new Date('2026-10-01T10:00:00Z'));
    await postgresMarketing.salvarConsentimento(u, true, new Date('2026-10-02T10:00:00Z'));
    expect(await postgresMarketing.consentimento(u)).toBe(true);
    expect(await dataDe(u)).toBe('2026-10-01T10:00:00.000Z');
    await postgresMarketing.salvarConsentimento(u, false, new Date('2026-10-03T10:00:00Z'));
    expect(await postgresMarketing.consentimento(u)).toBe(false);
    expect(await dataDe(u)).toBe('2026-10-03T10:00:00.000Z');
  });
});
