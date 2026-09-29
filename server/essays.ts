// Onde as redações ficam. A vaga do Plano Grátis é RESERVADA (contar +
// inserir numa operação só, com trava por usuário) antes de chamar a IA:
// só contar deixaria dois envios simultâneos passarem. Se a correção
// falhar, a reserva é apagada; se a função morrer no meio, a reserva
// velha deixa de contar depois de alguns minutos.

import { and, desc, eq, gt, or, sql } from 'drizzle-orm';
import type { Essay, EssayReport, EssaySummary } from '../shared/essay.js';
import type { Plan } from '../shared/game.js';
import { db } from './db.js';
import { essays, profiles } from './schema.js';

export interface NewEssay { topicId: string; topicTitle: string; banca: string; content: string }
export interface QuotaWindow { since: Date; staleBefore: Date; limit: number }

export interface EssayStore {
  plan(userId: string): Promise<Plan>;
  // Datas das correções que contam na janela (as feitas e as em andamento).
  counted(userId: string, window: Omit<QuotaWindow, 'limit'>): Promise<Date[]>;
  // null = cota esgotada. Sem janela (PRO), sempre reserva.
  reserve(userId: string, essay: NewEssay, window: QuotaWindow | null, now: Date): Promise<string | null>;
  complete(id: string, report: EssayReport, score: number): Promise<void>;
  release(id: string): Promise<void>;
  list(userId: string, limit: number): Promise<EssaySummary[]>;
  get(userId: string, id: string): Promise<Essay | null>;
}

// ---------------------------------------------------------------- Memória
interface Row extends NewEssay { id: string; userId: string; status: 'reservada' | 'corrigida'; score: number | null; report: EssayReport | null; createdAt: Date }

export function memoryEssays(options: { plan?: (userId: string) => Plan } = {}): EssayStore & { rows: Row[] } {
  const rows: Row[] = [];
  let seq = 0;
  const countedRows = (userId: string, w: Omit<QuotaWindow, 'limit'>) =>
    rows.filter((r) => r.userId === userId && r.createdAt > w.since && (r.status === 'corrigida' || r.createdAt > w.staleBefore));
  const summary = (r: Row): EssaySummary => ({ id: r.id, topicId: r.topicId, topicTitle: r.topicTitle, banca: r.banca, score: r.score ?? 0, createdAt: r.createdAt.toISOString() });
  return {
    rows,
    plan: async (userId) => options.plan?.(userId) ?? 'free',
    counted: async (userId, w) => countedRows(userId, w).map((r) => r.createdAt),
    async reserve(userId, essay, w, now) {
      if (w && countedRows(userId, w).length >= w.limit) return null;
      const id = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
      rows.push({ ...essay, id, userId, status: 'reservada', score: null, report: null, createdAt: now });
      return id;
    },
    async complete(id, report, score) {
      const r = rows.find((x) => x.id === id);
      if (r) Object.assign(r, { status: 'corrigida', report, score });
    },
    async release(id) {
      const i = rows.findIndex((x) => x.id === id && x.status === 'reservada');
      if (i >= 0) rows.splice(i, 1);
    },
    list: async (userId, limit) => rows.filter((r) => r.userId === userId && r.status === 'corrigida').sort((a, b) => +b.createdAt - +a.createdAt).slice(0, limit).map(summary),
    async get(userId, id) {
      const r = rows.find((x) => x.id === id && x.userId === userId && x.status === 'corrigida');
      return r ? { ...summary(r), content: r.content, report: r.report! } : null;
    },
  };
}

// ---------------------------------------------------------------- Postgres
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const countedWhere = (userId: string, w: Omit<QuotaWindow, 'limit'>) => and(
  eq(essays.userId, userId), gt(essays.createdAt, w.since),
  or(eq(essays.status, 'corrigida'), gt(essays.createdAt, w.staleBefore)),
);
const summaryCols = { id: essays.id, topicId: essays.topicId, topicTitle: essays.topicTitle, banca: essays.banca, score: essays.score, createdAt: essays.createdAt };
const toSummary = (r: { id: string; topicId: string; topicTitle: string; banca: string; score: number | null; createdAt: Date }): EssaySummary =>
  ({ ...r, score: r.score ?? 0, createdAt: r.createdAt.toISOString() });

export const postgresEssays: EssayStore = {
  async plan(userId) {
    const [row] = await db().select({ proUntil: profiles.proUntil }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return row?.proUntil && row.proUntil.getTime() > Date.now() ? 'pro' : 'free';
  },
  async counted(userId, w) {
    const rows = await db().select({ createdAt: essays.createdAt }).from(essays).where(countedWhere(userId, w));
    return rows.map((r) => r.createdAt);
  },
  async reserve(userId, essay, w, now) {
    return db().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`v2:essay:${userId}`}))`);
      if (w) {
        const [row] = await tx.select({ n: sql<number>`count(*)::int` }).from(essays).where(countedWhere(userId, w));
        if ((row?.n ?? 0) >= w.limit) return null;
      }
      const [inserted] = await tx.insert(essays).values({ userId, ...essay, status: 'reservada', createdAt: now }).returning({ id: essays.id });
      return inserted!.id;
    });
  },
  async complete(id, report, score) {
    await db().update(essays).set({ status: 'corrigida', report, score, gradedAt: new Date() }).where(eq(essays.id, id));
  },
  async release(id) {
    await db().delete(essays).where(and(eq(essays.id, id), eq(essays.status, 'reservada')));
  },
  async list(userId, limit) {
    const rows = await db().select(summaryCols).from(essays)
      .where(and(eq(essays.userId, userId), eq(essays.status, 'corrigida'))).orderBy(desc(essays.createdAt)).limit(limit);
    return rows.map(toSummary);
  },
  async get(userId, id) {
    if (!UUID.test(id)) return null;
    const [r] = await db().select({ ...summaryCols, content: essays.content, report: essays.report }).from(essays)
      .where(and(eq(essays.id, id), eq(essays.userId, userId), eq(essays.status, 'corrigida'))).limit(1);
    return r ? { ...toSummary(r), content: r.content, report: r.report as EssayReport } : null;
  },
};
