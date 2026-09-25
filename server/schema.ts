// Tabelas do V2. Ficam no schema "v2" do Postgres para conviver com o V1
// (que usa "public") no mesmo projeto Supabase sem que um altere o outro.
// Toda mudança aqui precisa de uma migração em supabase/migrations/.

import { pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

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
