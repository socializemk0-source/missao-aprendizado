// Perfil do aluno no V2. A interface existe para os testes trocarem o
// banco por uma versão em memória.

import { eq, sql } from 'drizzle-orm';
import type { Identity } from './auth.js';
import { db } from './db.js';
import { profiles, type ProfileRow } from './schema.js';

export interface Profile {
  displayName: string;
  targetExam: string | null;
  preferredBanca: string | null;
  city: string | null;
}

export type ProfileUpdate = Partial<Profile>;

export interface ProfileStore {
  // Devolve o perfil, criando-o na primeira vez (a partir do nome do cadastro).
  ensure(identity: Identity): Promise<Profile>;
  update(userId: string, fields: ProfileUpdate): Promise<Profile | null>;
}

export function defaultDisplayName(identity: Identity): string {
  return identity.name ?? identity.email?.split('@')[0] ?? 'Concurseiro(a)';
}

function toProfile(row: ProfileRow): Profile {
  return {
    displayName: row.displayName,
    targetExam: row.targetExam,
    preferredBanca: row.preferredBanca,
    city: row.city,
  };
}

export const postgresProfiles: ProfileStore = {
  async ensure(identity) {
    // Um INSERT ... ON CONFLICT DO NOTHING seguido de SELECT: dois acessos
    // simultâneos do mesmo aluno nunca criam o perfil duas vezes.
    await db().insert(profiles).values({ userId: identity.id, displayName: defaultDisplayName(identity) }).onConflictDoNothing();
    const [row] = await db().select().from(profiles).where(eq(profiles.userId, identity.id)).limit(1);
    if (!row) throw new Error('perfil não encontrado logo após ser criado');
    return toProfile(row);
  },
  async update(userId, fields) {
    const [row] = await db()
      .update(profiles)
      .set({ ...fields, updatedAt: sql`now()` })
      .where(eq(profiles.userId, userId))
      .returning();
    return row ? toProfile(row) : null;
  },
};
