// GameStore no Postgres. Cada withUser roda numa transação com uma trava
// por usuário (pg_advisory_xact_lock): dois pedidos do mesmo aluno ao mesmo
// tempo — mesmo em instâncias diferentes da Vercel — acontecem em fila.

import { and, desc, eq, gt, sql } from 'drizzle-orm';
import type { Plan } from '../shared/game.js';
import { db } from './db.js';
import type { GameStore, UserTx } from './game.js';
import { answers, missionClaims, phaseCompletions, profiles, questionState, userStats } from './schema.js';

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
};
