// PaymentStore no Postgres: conceder e estornar em transação, com trava
// por aluno, para dois avisos do mesmo pagamento não somarem dias duas vezes.

import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from './db.js';
import type { Cycle, PaymentStore } from './payments.js';
import { checkouts, payments, profiles } from './schema.js';

const lock = (userId: string) => sql`select pg_advisory_xact_lock(hashtext(${`v2:user:${userId}`}))`;

export const postgresPayments: PaymentStore = {
  async proUntil(userId) {
    const [row] = await db().select({ proUntil: profiles.proUntil }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return row?.proUntil ?? null;
  },

  async grant({ paymentId, userId, cycle, days, amount, now }) {
    return db().transaction(async (tx) => {
      await tx.execute(lock(userId));
      const inserted = await tx.insert(payments)
        .values({ paymentId, userId, cycle, days, amount: amount.toFixed(2), status: 'approved', createdAt: now, updatedAt: now })
        .onConflictDoNothing().returning({ id: payments.paymentId });
      if (inserted.length === 0) {
        const [p] = await tx.select({ proUntil: profiles.proUntil }).from(profiles).where(eq(profiles.userId, userId));
        return { status: 'already' as const, proUntil: p?.proUntil ?? null };
      }
      // Soma a partir do fim do PRO atual (se ainda vale) ou de agora.
      const until = sql`greatest(coalesce(${profiles.proUntil}, ${now}), ${now}) + make_interval(days => ${days})`;
      const [row] = await tx.insert(profiles)
        .values({ userId, displayName: 'Aluno', proUntil: sql`${now}::timestamptz + make_interval(days => ${days})` })
        .onConflictDoUpdate({ target: profiles.userId, set: { proUntil: until, updatedAt: now } })
        .returning({ proUntil: profiles.proUntil });
      return { status: 'granted' as const, proUntil: row?.proUntil ?? null };
    });
  },

  async revoke({ paymentId, now }) {
    const [found] = await db().select({ userId: payments.userId }).from(payments).where(eq(payments.paymentId, paymentId));
    if (!found) return { status: 'ignored' as const };
    return db().transaction(async (tx) => {
      await tx.execute(lock(found.userId));
      const [row] = await tx.update(payments).set({ status: 'refunded', updatedAt: now })
        .where(and(eq(payments.paymentId, paymentId), eq(payments.status, 'approved')))
        .returning({ userId: payments.userId, days: payments.days });
      if (!row) return { status: 'ignored' as const };
      await tx.update(profiles)
        .set({ proUntil: sql`${profiles.proUntil} - make_interval(days => ${row.days})`, updatedAt: now })
        .where(eq(profiles.userId, row.userId));
      return { status: 'revoked' as const, userId: row.userId };
    });
  },

  async recordCheckout({ reference, userId, cycle, now }) {
    await db().insert(checkouts).values({ reference, userId, cycle, createdAt: now }).onConflictDoNothing();
  },

  async openCheckouts(userId, since, limit) {
    const rows = await db().select({ reference: checkouts.reference }).from(checkouts)
      .where(and(eq(checkouts.userId, userId), eq(checkouts.paid, false), gte(checkouts.createdAt, since)))
      .orderBy(desc(checkouts.createdAt)).limit(limit);
    return rows.map((r) => r.reference);
  },

  async markCheckoutPaid(reference) {
    await db().update(checkouts).set({ paid: true }).where(eq(checkouts.reference, reference));
  },

  async history(userId) {
    const rows = await db().select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(20);
    return rows.map((r) => ({
      paymentId: r.paymentId, cycle: r.cycle as Cycle, amount: Number(r.amount),
      status: r.status as 'approved' | 'refunded', createdAt: r.createdAt.toISOString(),
    }));
  },
};
