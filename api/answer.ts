// /api/answer — confere a resposta no servidor.
//   POST { questionId, choice } → { correct, correctIndex, explanation, legalBasis }
// O gabarito só sai daqui depois que o aluno responde.

import { authenticate, type VerifyToken } from '../server/auth.js';
import { jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { postgresQuestions, type QuestionStore } from '../server/question-store.js';
import { verifySupabaseToken } from '../server/supabase.js';

export function createAnswerHandler(deps: { verifyToken: VerifyToken; questions: QuestionStore }) {
  return async function answerHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    const user = await authenticate(req, res, deps.verifyToken);
    if (!user) return;

    const body = jsonBody(req);
    const questionId = body?.questionId;
    const choice = body?.choice;
    if (typeof questionId !== 'string' || !questionId || questionId.length > 60 || !Number.isInteger(choice) || (choice as number) < 0) {
      res.status(400).json({ error: 'Resposta inválida.' });
      return;
    }

    try {
      const key = await deps.questions.answerKey(questionId);
      if (!key) {
        res.status(404).json({ error: 'Questão não encontrada.' });
        return;
      }
      if ((choice as number) >= key.optionsCount) {
        res.status(400).json({ error: 'Essa alternativa não existe.' });
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({
        correct: choice === key.correctIndex,
        correctIndex: key.correctIndex,
        explanation: key.explanation,
        legalBasis: key.legalBasis,
      });
    } catch (err) {
      console.error('[answer] erro:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Não foi possível conferir sua resposta agora.' });
    }
  };
}

export default createAnswerHandler({ verifyToken: verifySupabaseToken, questions: postgresQuestions });
