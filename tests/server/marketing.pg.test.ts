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

  it('origem: só a primeira fica', async () => {
    const u = `pg-mkt-origem-${Date.now()}`;
    await postgresMarketing.salvarOrigem(u, { utm_source: 'meta', utm_content: 'c001', em: '2026-10-01T10:00:00.000Z' }, new Date());
    await postgresMarketing.salvarOrigem(u, { utm_source: 'google', utm_content: 'c002' }, new Date());
    expect(await postgresMarketing.origem(u)).toMatchObject({ utm_source: 'meta', utm_content: 'c001' });
  });

  it('cadastro recente: sem perfil ou perfil novo = sim; perfil antigo = não', async () => {
    const { postgresProfiles } = await import('../../server/profiles.js');
    const u = `pg-mkt-cad-${Date.now()}`;
    expect(await postgresMarketing.cadastroRecente(u, new Date())).toBe(true);
    await postgresProfiles.ensure({ id: u, email: null, name: 'Cad' });
    expect(await postgresMarketing.cadastroRecente(u, new Date())).toBe(true);
    expect(await postgresMarketing.cadastroRecente(u, new Date(Date.now() + 3 * 86_400_000))).toBe(false);
  });

  it('eventos: event_id único, uma vez por aluno nos de cadastro, e pendentes saem uma vez só', async () => {
    const u = `pg-mkt-ev-${Date.now()}`;
    const base = { userId: u, origem: { utm_source: 'meta' }, consentimento: true, teste: false, now: new Date() };
    expect(await postgresMarketing.registrar({ ...base, eventId: `${u}-pv`, nome: 'PageView', dados: { pagina: '/' }, envio: { meta_pixel: 'navegador' } })).toBe(true);
    expect(await postgresMarketing.registrar({ ...base, eventId: `${u}-pv`, nome: 'PageView', dados: { pagina: '/' }, envio: { meta_pixel: 'navegador' } })).toBe(false);
    expect(await postgresMarketing.registrar({ ...base, eventId: `${u}-c1`, nome: 'CompleteRegistration', envio: { meta_pixel: 'pendente' } })).toBe(true);
    expect(await postgresMarketing.registrar({ ...base, eventId: `${u}-c2`, nome: 'CompleteRegistration', envio: { meta_pixel: 'pendente' } })).toBe(false);
    expect(await postgresMarketing.registrar({ ...base, eventId: `${u}-ic`, nome: 'InitiateCheckout', valor: 29.9, moeda: 'BRL', dados: { plano: 'monthly' }, envio: { meta_pixel: 'navegador' } })).toBe(true);

    expect(await postgresMarketing.pendentesDoPixel(u, new Date())).toEqual([{ nome: 'CompleteRegistration', eventId: `${u}-c1`, dados: {} }]);
    expect(await postgresMarketing.pendentesDoPixel(u, new Date())).toEqual([]);
    const r = (await db().execute(sql`select valor::float as valor, moeda, origem->>'utm_source' as fonte from v2.eventos_marketing where event_id = ${`${u}-ic`}`)) as unknown as { rows: { valor: number; moeda: string; fonte: string }[] };
    expect(r.rows[0]).toEqual({ valor: 29.9, moeda: 'BRL', fonte: 'meta' });
  });
});
