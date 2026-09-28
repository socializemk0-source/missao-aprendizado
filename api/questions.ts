// /api/questions — questões publicadas para o aluno responder.
//   GET ?subject=portugues&limit=5 → { questions } (sem gabarito)

import { authenticate, type VerifyToken } from '../server/auth.js';
import { methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { postgresQuestions, type QuestionStore } from '../server/question-store.js';
import { SUBJECTS, type Subject } from '../server/questions.js';
import { verifySupabaseToken } from '../server/supabase.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function createQuestionsHandler(deps: { verifyToken: VerifyToken; questions: QuestionStore }) {
  return async function questionsHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

    const user = await authenticate(req, res, deps.verifyToken);
    if (!user) return;

    const subject = one(req.query.subject);
    if (subject !== undefined && !(subject in SUBJECTS)) {
      res.status(400).json({ error: 'Matéria desconhecida.' });
      return;
    }
    const rawLimit = one(req.query.limit);
    const limit = rawLimit === undefined ? DEFAULT_LIMIT : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      res.status(400).json({ error: `Peça de 1 a ${MAX_LIMIT} questões.` });
      return;
    }

    try {
      const list = await deps.questions.listPublished({ subject: subject as Subject | undefined, limit });
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ questions: list });
    } catch (err) {
      console.error('[questions] erro:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Não foi possível carregar as questões agora.' });
    }
  };
}

export default createQuestionsHandler({ verifyToken: verifySupabaseToken, questions: postgresQuestions });
