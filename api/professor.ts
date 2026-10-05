// /api/professor — revisão das questões por professor (server/professor.ts).
//   GET  → { revisor, fila }: questões das matérias do professor que esperam revisão
//   POST { questionId, versao, acao: aprovar|corrigir|descartar, nota? } → grava a decisão
// Só entra quem está em v2.revisores (pelo e-mail do login); o resto recebe 403.

import { authenticate, type VerifyToken } from '../server/auth.js';
import { jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { LIMITES, limitarAluno, limitarIp, postgresLimiter, type RateLimiter } from '../server/limite.js';
import { errorText } from '../server/log.js';
import { RevisaoError, decidir, filaDoRevisor, parseDecisao, postgresProfessor, type ProfessorStore } from '../server/professor.js';
import { verifySupabaseToken } from '../server/supabase.js';

export function createProfessorHandler(deps: { verifyToken: VerifyToken; store: ProfessorStore; limiter?: RateLimiter | null }) {
  const { store } = deps;
  return async function professorHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
    if (!(await limitarIp(deps.limiter, req, res))) return;
    const user = await authenticate(req, res, deps.verifyToken);
    if (!user) return;
    if (!(await limitarAluno(deps.limiter, res, 'professor', user.id, LIMITES.professorPorMinuto))) return;
    res.setHeader('Cache-Control', 'no-store');

    try {
      const revisor = user.email ? await store.revisor(user.email) : null;
      if (!revisor) {
        res.status(403).json({ error: 'Esta área é só para os professores que revisam as questões.', code: 'NAO_REVISOR' });
        return;
      }
      if (req.method === 'GET') {
        res.status(200).json({ revisor: { nome: revisor.nome, disciplinas: revisor.disciplinas }, fila: await filaDoRevisor(store, revisor) });
        return;
      }
      const decisao = parseDecisao(jsonBody(req));
      if (typeof decisao === 'string') {
        res.status(400).json({ error: decisao });
        return;
      }
      await decidir(store, revisor, { userId: user.id, email: revisor.email }, decisao);
      res.status(200).json({ ok: true });
    } catch (err) {
      if (err instanceof RevisaoError) {
        res.status(err.status).json({ error: err.message, code: err.code });
        return;
      }
      console.error('[professor] erro:', errorText(err));
      res.status(500).json({ error: 'Não foi possível concluir agora. Tente de novo.' });
    }
  };
}

export default createProfessorHandler({ verifyToken: verifySupabaseToken, store: postgresProfessor, limiter: postgresLimiter });
