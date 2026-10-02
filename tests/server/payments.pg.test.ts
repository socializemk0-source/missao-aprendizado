// Pagamentos no Postgres de verdade (PG_TEST=1).
import { describe, expect, it } from 'vitest';

const run = process.env.PG_TEST === '1';
const DAY = 86_400_000;

describe.runIf(run)('pagamentos no Postgres', async () => {
  const { postgresPayments } = await import('../../server/payments-pg.js');
  const { postgresGame } = await import('../../server/game-pg.js');
  const { getProgress } = await import('../../server/game.js');
  const id = (s: string) => `pg-pay-${Date.now()}-${s}`;

  it('mesmo pagamento em avisos simultâneos soma os dias uma vez; o jogo passa a ver PRO', async () => {
    const u = id('a');
    const pid = id('p1');
    const now = new Date();
    const results = await Promise.all([1, 2, 3].map(() => postgresPayments.grant({ paymentId: pid, userId: u, cycle: 'monthly', days: 30, amount: 29.9, now })));
    expect(results.map((r) => r.status).sort()).toEqual(['already', 'already', 'granted']);
    const until = await postgresPayments.proUntil(u);
    expect(Math.round((until!.getTime() - now.getTime()) / DAY)).toBe(30);
    expect((await getProgress(postgresGame, u)).plan).toBe('pro');

    await postgresPayments.grant({ paymentId: id('p2'), userId: u, cycle: 'annual', days: 365, amount: 239.9, now });
    expect(Math.round(((await postgresPayments.proUntil(u))!.getTime() - now.getTime()) / DAY)).toBe(395);
    expect(await postgresPayments.history(u)).toHaveLength(2);
  });

  it('compras iniciadas: grava uma vez, lista as abertas do aluno (mais nova primeiro) e sai da lista quando paga', async () => {
    const u = id('c');
    const now = new Date();
    const older = new Date(now.getTime() - 60_000);
    await postgresPayments.recordCheckout({ reference: `v2:monthly:${u}:aaaaaaaa`, userId: u, cycle: 'monthly', now: older });
    await postgresPayments.recordCheckout({ reference: `v2:annual:${u}:bbbbbbbb`, userId: u, cycle: 'annual', now });
    await postgresPayments.recordCheckout({ reference: `v2:annual:${u}:bbbbbbbb`, userId: u, cycle: 'annual', now });
    await postgresPayments.recordCheckout({ reference: `v2:monthly:${id('outro')}:cccccccc`, userId: id('outro'), cycle: 'monthly', now });
    expect(await postgresPayments.openCheckouts(u, new Date(now.getTime() - DAY), 5)).toEqual([`v2:annual:${u}:bbbbbbbb`, `v2:monthly:${u}:aaaaaaaa`]);
    expect(await postgresPayments.openCheckouts(u, new Date(now.getTime() - 1000), 5)).toEqual([`v2:annual:${u}:bbbbbbbb`]);
    await postgresPayments.markCheckoutPaid(`v2:annual:${u}:bbbbbbbb`);
    expect(await postgresPayments.openCheckouts(u, new Date(now.getTime() - DAY), 5)).toEqual([`v2:monthly:${u}:aaaaaaaa`]);
  });

  it('estorno tira os dias uma vez só; pagamento desconhecido é ignorado', async () => {
    const u = id('b');
    const pid = id('p1');
    const now = new Date();
    await postgresPayments.grant({ paymentId: pid, userId: u, cycle: 'monthly', days: 30, amount: 29.9, now });
    const r = await Promise.all([postgresPayments.revoke({ paymentId: pid, now }), postgresPayments.revoke({ paymentId: pid, now })]);
    expect(r.map((x) => x.status).sort()).toEqual(['ignored', 'revoked']);
    expect(Math.abs((await postgresPayments.proUntil(u))!.getTime() - now.getTime())).toBeLessThan(2000);
    expect((await getProgress(postgresGame, u)).plan).toBe('free');
    expect((await postgresPayments.revoke({ paymentId: 'nao-existe', now })).status).toBe('ignored');
    expect((await postgresPayments.history(u))[0]).toMatchObject({ status: 'refunded', amount: 29.9, cycle: 'monthly' });
  });
});
