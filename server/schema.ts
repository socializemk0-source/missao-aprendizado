// Tabelas do V2. Ficam no schema "v2" do Postgres para conviver com o V1
// (que usa "public") no mesmo projeto Supabase sem que um altere o outro.
// Toda mudança aqui precisa de uma migração em supabase/migrations/.

import { jsonb, pgSchema, smallint, text, timestamp } from 'drizzle-orm/pg-core';

export const v2 = pgSchema('v2');

export const profiles = v2.table('profiles', {
  userId: text('user_id').primaryKey(), // id do usuário no Supabase Auth
  displayName: text('display_name').notNull(),
  targetExam: text('target_exam'),
  preferredBanca: text('preferred_banca'),
  city: text('city'),
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

// Banco de questões (migração 0003). O formato e as regras de origem estão
// em server/questions.ts; o conteúdo, em content/questoes/.
export const questions = v2.table('questions', {
  id: text('id').primaryKey(),
  subject: text('subject').notNull(),
  topic: text('topic').notNull(),
  level: text('level').notNull(),
  difficulty: smallint('difficulty').notNull(),
  statement: text('statement').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctIndex: smallint('correct_index').notNull(),
  explanation: text('explanation').notNull(),
  legalBasis: text('legal_basis'),
  style: text('style'),
  origin: text('origin').notNull(),
  banca: text('banca'),
  examYear: smallint('exam_year'),
  orgao: text('orgao'),
  cargo: text('cargo'),
  sourceUrl: text('source_url'),
  authorizationNote: text('authorization_note'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
