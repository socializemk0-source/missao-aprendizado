// Leitura do banco de questões pelas rotas. Só questões publicadas saem
// daqui, e o gabarito nunca vai junto com a questão: ele só é usado no
// servidor para conferir a resposta (regra 2 do projeto).

import { and, eq, sql } from 'drizzle-orm';
import { db } from './db.js';
import type { Question, Subject } from './questions.js';
import { questions } from './schema.js';

export interface PublicQuestion {
  id: string;
  subject: Subject;
  topic: string;
  difficulty: number;
  statement: string;
  options: string[];
  style: string | null;
}

export interface AnswerKey {
  correctIndex: number;
  optionsCount: number;
  explanation: string;
  legalBasis: string | null;
}

export interface QuestionStore {
  listPublished(opts: { subject?: Subject; limit: number }): Promise<PublicQuestion[]>;
  // null quando a questão não existe ou ainda não foi publicada.
  answerKey(id: string): Promise<AnswerKey | null>;
}

export function toPublicQuestion(q: Pick<Question, 'id' | 'subject' | 'topic' | 'difficulty' | 'statement' | 'options' | 'style'>): PublicQuestion {
  return {
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    statement: q.statement,
    options: q.options,
    style: q.style ?? null,
  };
}

export const postgresQuestions: QuestionStore = {
  async listPublished({ subject, limit }) {
    const published = eq(questions.status, 'publicada');
    const rows = await db()
      .select({
        id: questions.id,
        subject: questions.subject,
        topic: questions.topic,
        difficulty: questions.difficulty,
        statement: questions.statement,
        options: questions.options,
        style: questions.style,
      })
      .from(questions)
      .where(subject ? and(published, eq(questions.subject, subject)) : published)
      .orderBy(sql`random()`)
      .limit(limit);
    return rows.map((row) => toPublicQuestion({ ...row, subject: row.subject as Subject, difficulty: row.difficulty as Question['difficulty'], style: row.style ?? undefined }));
  },
  async answerKey(id) {
    const [row] = await db()
      .select({ correctIndex: questions.correctIndex, options: questions.options, explanation: questions.explanation, legalBasis: questions.legalBasis })
      .from(questions)
      .where(and(eq(questions.id, id), eq(questions.status, 'publicada')))
      .limit(1);
    return row ? { correctIndex: row.correctIndex, optionsCount: row.options.length, explanation: row.explanation, legalBasis: row.legalBasis } : null;
  },
};
