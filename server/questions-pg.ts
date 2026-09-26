// Questões no Postgres: as da trilha (código) + as do banco (v2.questions).
// O catálogo (só id, disciplina, dificuldade e banca) fica 5 minutos em
// memória na instância — com dezenas de milhares de questões, é leve.

import { and, eq, inArray } from 'drizzle-orm';
import { contentSource, catalogItem, type CatalogItem, type QuestionSource } from './questions.js';
import type { Dificuldade, DisciplinaId, Fonte, Questao } from '../content/types.js';
import { db } from './db.js';
import { questions } from './schema.js';

const CACHE_MS = 5 * 60 * 1000;
const content = contentSource();
let cached: { at: number; items: CatalogItem[] } | null = null;

function toQuestao(r: typeof questions.$inferSelect): Questao {
  return {
    id: r.id, disciplina: r.disciplina as DisciplinaId, assunto: r.assunto, enunciado: r.enunciado,
    alternativas: r.alternativas as string[], correta: r.correta, explicacao: r.explicacao,
    fonte: r.fonte as Fonte, dificuldade: r.dificuldade as Dificuldade,
  };
}

export const postgresQuestions: QuestionSource = {
  async get(ids) {
    const found = await content.get(ids);
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) {
      const rows = await db().select().from(questions).where(and(inArray(questions.id, missing), eq(questions.status, 'ativa')));
      for (const r of rows) found.set(r.id, toQuestao(r));
    }
    return found;
  },
  async catalog() {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.items;
    const rows = await db()
      .select({ id: questions.id, disciplina: questions.disciplina, dificuldade: questions.dificuldade, fonte: questions.fonte })
      .from(questions).where(eq(questions.status, 'ativa'));
    const bank = rows.map((r) => catalogItem({ id: r.id, disciplina: r.disciplina as DisciplinaId, dificuldade: r.dificuldade as Dificuldade, fonte: r.fonte as Fonte } as Questao));
    cached = { at: Date.now(), items: [...(await content.catalog()), ...bank] };
    return cached.items;
  },
};
