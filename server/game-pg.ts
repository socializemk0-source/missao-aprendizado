// GameStore no Postgres. Cada withUser roda numa transação com uma trava
// por usuário (pg_advisory_xact_lock): dois pedidos do mesmo aluno ao mesmo
// tempo — mesmo em instâncias diferentes da Vercel — acontecem em fila.

import { and, desc, eq, gt, inArray, isNotNull, lt, ne, sql } from 'drizzle-orm';
import type { DisciplinaId } from '../content/types.js';
import type { Nivel, Plan } from '../shared/game.js';
import { db } from './db.js';
import { PERCENTILE_MIN, type GameStore, type SimuladoRow, type SimuladoStored, type UserTx } from './game.js';
import { postgresQuestions } from './questions-pg.js';
import { answers, missionClaims, phaseCompletions, profiles, questionState, questionStats, simulados, userStats } from './schema.js';

type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];

function userTx(tx: Tx, userId: string): UserTx {
  return {
    async plan(): Promise<Plan> {
      const [row] = await tx.select({ proUntil: profiles.proUntil }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
      return row?.proUntil && row.proUntil.getTime() > Date.now() ? 'pro' : 'free';
    },
    async stats() {
      const [row] = await tx.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
      return row ? { xp: row.xp, hearts: row.hearts, heartsUpdatedAt: row.heartsUpdatedAt, streak: row.streak, bestStreak: row.bestStreak, lastStudyDay: row.lastStudyDay } : null;
    },
    async saveStats(s) {
      const values = { xp: s.xp, hearts: s.hearts, heartsUpdatedAt: s.heartsUpdatedAt, streak: s.streak, bestStreak: s.bestStreak, lastStudyDay: s.lastStudyDay, updatedAt: new Date() };
      await tx.insert(userStats).values({ userId, ...values }).onConflictDoUpdate({ target: userStats.userId, set: values });
    },
    async questionStates() {
      const rows = await tx.select().from(questionState).where(eq(questionState.userId, userId));
      return new Map(rows.map((r) => [r.questionId, { questionId: r.questionId, everCorrect: r.everCorrect, lastCorrect: r.lastCorrect, timesWrong: r.timesWrong }]));
    },
    async saveQuestionState(s) {
      const values = { everCorrect: s.everCorrect, lastCorrect: s.lastCorrect, timesWrong: s.timesWrong, updatedAt: new Date() };
      await tx.insert(questionState).values({ userId, questionId: s.questionId, ...values })
        .onConflictDoUpdate({ target: [questionState.userId, questionState.questionId], set: values });
    },
    async addAnswer(a) {
      await tx.insert(answers).values({ userId, questionId: a.questionId, choice: a.choice, correct: a.correct, mode: a.mode, day: a.day });
    },
    async answersOnDay(day) {
      const [row] = await tx
        .select({ total: sql<number>`count(*)::int`, correct: sql<number>`count(*) filter (where ${answers.correct})::int` })
        .from(answers).where(and(eq(answers.userId, userId), eq(answers.day, day)));
      return { total: row?.total ?? 0, correct: row?.correct ?? 0 };
    },
    async completedPhases() {
      const rows = await tx.select({ phaseId: phaseCompletions.phaseId, day: phaseCompletions.day }).from(phaseCompletions).where(eq(phaseCompletions.userId, userId));
      return new Map(rows.map((r) => [r.phaseId, r.day]));
    },
    async completePhase(phaseId, day) {
      await tx.insert(phaseCompletions).values({ userId, phaseId, day }).onConflictDoNothing();
    },
    async claimedMissions(day) {
      const rows = await tx.select({ id: missionClaims.missionId }).from(missionClaims).where(and(eq(missionClaims.userId, userId), eq(missionClaims.day, day)));
      return new Set(rows.map((r) => r.id));
    },
    async claimMission(day, missionId) {
      await tx.insert(missionClaims).values({ userId, day, missionId });
    },
    async bumpQuestionStats(questionId, correct) {
      const hit = correct ? 1 : 0;
      await tx.insert(questionStats).values({ questionId, respostas: 1, acertos: hit })
        .onConflictDoUpdate({
          target: questionStats.questionId,
          set: { respostas: sql`${questionStats.respostas} + 1`, acertos: sql`${questionStats.acertos} + ${hit}`, updatedAt: new Date() },
        });
    },
    async simulados(limit) {
      const rows = await tx.select().from(simulados).where(eq(simulados.userId, userId)).orderBy(desc(simulados.startedAt)).limit(limit);
      return rows.map(toRow);
    },
    async simulado(id) {
      if (!UUID.test(id)) return null;
      const [row] = await tx.select().from(simulados).where(and(eq(simulados.id, id), eq(simulados.userId, userId)));
      return row ? toRow(row) : null;
    },
    async simuladosOnDay(day) {
      const [row] = await tx.select({ n: sql<number>`count(*)::int` }).from(simulados).where(and(eq(simulados.userId, userId), eq(simulados.day, day)));
      return row?.n ?? 0;
    },
    async createSimulado(r) {
      const [row] = await tx.insert(simulados).values({
        userId, day: r.day, nivel: r.nivel, disciplinas: r.disciplinas, banca: r.banca,
        questionIds: r.questionIds, timeLimitSec: r.timeLimitSec, startedAt: r.startedAt,
      }).returning({ id: simulados.id });
      return row!.id;
    },
    async finishSimulado(id, done) {
      await tx.update(simulados).set({ finishedAt: done.finishedAt, acertos: done.acertos, pct: done.pct, result: done.result })
        .where(and(eq(simulados.id, id), eq(simulados.userId, userId)));
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toRow(r: typeof simulados.$inferSelect): SimuladoRow {
  return {
    id: r.id, nivel: r.nivel as Nivel, disciplinas: r.disciplinas as DisciplinaId[], banca: r.banca, questionIds: r.questionIds,
    timeLimitSec: r.timeLimitSec, startedAt: r.startedAt, day: r.day, finishedAt: r.finishedAt,
    acertos: r.acertos, pct: r.pct, result: (r.result as SimuladoStored | null) ?? null,
  };
}

export const postgresGame: GameStore = {
  withUser(userId, fn) {
    return db().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`v2:user:${userId}`}))`);
      return fn(userTx(tx, userId));
    });
  },
  async topXp(limit) {
    return db()
      .select({ userId: userStats.userId, displayName: profiles.displayName, xp: userStats.xp })
      .from(userStats).innerJoin(profiles, eq(profiles.userId, userStats.userId))
      .where(gt(userStats.xp, 0))
      .orderBy(desc(userStats.xp), userStats.userId).limit(limit);
  },
  async rankOf(xp) {
    const [row] = await db().select({ n: sql<number>`count(*)::int` }).from(userStats).where(gt(userStats.xp, xp));
    return (row?.n ?? 0) + 1;
  },
  questions: postgresQuestions,
  async questionStats(ids) {
    if (ids.length === 0) return new Map();
    const rows = await db().select().from(questionStats).where(inArray(questionStats.questionId, ids));
    return new Map(rows.map((r) => [r.questionId, { respostas: r.respostas, acertos: r.acertos }]));
  },
  async simuladoPercentile(nivel, pct, userId) {
    const [row] = await db()
      .select({ total: sql<number>`count(*)::int`, lower: sql<number>`count(*) filter (where ${lt(simulados.pct, pct)})::int` })
      .from(simulados)
      .where(and(eq(simulados.nivel, nivel), isNotNull(simulados.finishedAt), ne(simulados.userId, userId)));
    return row && row.total >= PERCENTILE_MIN ? Math.round((row.lower / row.total) * 100) : null;
  },
};
