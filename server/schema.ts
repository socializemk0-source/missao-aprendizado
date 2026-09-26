// Tabelas do V2. Ficam no schema "v2" do Postgres para conviver com o V1
// (que usa "public") no mesmo projeto Supabase sem que um altere o outro.
// Toda mudança aqui precisa de uma migração em supabase/migrations/.

import { bigserial, boolean, date, integer, pgSchema, primaryKey, smallint, text, timestamp } from 'drizzle-orm/pg-core';

export const v2 = pgSchema('v2');

export const profiles = v2.table('profiles', {
  userId: text('user_id').primaryKey(), // id do usuário no Supabase Auth
  displayName: text('display_name').notNull(),
  targetExam: text('target_exam'),
  preferredBanca: text('preferred_banca'),
  city: text('city'),
  proUntil: timestamp('pro_until', { withTimezone: true }), // migração 0003
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProfileRow = typeof profiles.$inferSelect;

export const leads = v2.table('leads', {
  email: text('email').primaryKey(),
  name: text('name'),
  source: text('source').notNull(),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---- Jogo (migração 0003) ----

export const userStats = v2.table('user_stats', {
  userId: text('user_id').primaryKey(),
  xp: integer('xp').notNull(),
  hearts: integer('hearts').notNull(),
  heartsUpdatedAt: timestamp('hearts_updated_at', { withTimezone: true }).notNull(),
  streak: integer('streak').notNull(),
  bestStreak: integer('best_streak').notNull(),
  lastStudyDay: date('last_study_day', { mode: 'string' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const questionState = v2.table('question_state', {
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  everCorrect: boolean('ever_correct').notNull(),
  lastCorrect: boolean('last_correct').notNull(),
  timesWrong: integer('times_wrong').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.questionId] })]);

export const answers = v2.table('answers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  choice: smallint('choice').notNull(),
  correct: boolean('correct').notNull(),
  mode: text('mode').notNull(),
  day: date('day', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const phaseCompletions = v2.table('phase_completions', {
  userId: text('user_id').notNull(),
  phaseId: text('phase_id').notNull(),
  day: date('day', { mode: 'string' }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.phaseId] })]);

export const missionClaims = v2.table('mission_claims', {
  userId: text('user_id').notNull(),
  day: date('day', { mode: 'string' }).notNull(),
  missionId: text('mission_id').notNull(),
  claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.day, t.missionId] })]);
