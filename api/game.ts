// /api/game?action=... — tudo do jogo numa função só (o plano grátis da
// Vercel permite poucas funções por projeto).
//   GET  progresso | trilha | fase&id= | revisar | pratica&disciplina= | desafio
//        missoes | conquistas | disciplinas | ranking
//   POST responder { questionId, choice, mode } | resgatar { missionId }

import type { DisciplinaId } from '../content/types.js';
import { authenticate, type VerifyToken } from '../server/auth.js';
import {
  GameError, answer, claimMission, getAchievements, getChallengeSession, getMissions, getPhaseSession,
  getPracticeSession, getProgress, getRanking, getReviewSession, getSubjects, getTrail, type GameStore,
} from '../server/game.js';
import { postgresGame } from '../server/game-pg.js';
import { jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { verifySupabaseToken } from '../server/supabase.js';
import type { Mode } from '../shared/game.js';

const MODES: Mode[] = ['trilha', 'revisar', 'pratica', 'desafio'];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export function createGameHandler(deps: { verifyToken: VerifyToken; store: GameStore }) {
  const { store } = deps;
  return async function gameHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
    const user = await authenticate(req, res, deps.verifyToken);
    if (!user) return;
    const action = one(req.query.action);
    res.setHeader('Cache-Control', 'no-store');

    try {
      if (req.method === 'GET') {
        switch (action) {
          case 'progresso': return res.status(200).json(await getProgress(store, user.id));
          case 'trilha': return res.status(200).json({ capitulos: await getTrail(store, user.id), progress: await getProgress(store, user.id) });
          case 'fase': return res.status(200).json(await getPhaseSession(store, user.id, one(req.query.id)));
          case 'revisar': return res.status(200).json(await getReviewSession(store, user.id));
          case 'pratica': return res.status(200).json(await getPracticeSession(store, user.id, one(req.query.disciplina) as DisciplinaId));
          case 'desafio': return res.status(200).json(await getChallengeSession(store, user.id));
          case 'missoes': return res.status(200).json({ missoes: await getMissions(store, user.id) });
          case 'conquistas': return res.status(200).json({ conquistas: await getAchievements(store, user.id) });
          case 'disciplinas': return res.status(200).json({ disciplinas: await getSubjects(store, user.id) });
          case 'ranking': return res.status(200).json(await getRanking(store, user.id));
        }
      } else {
        const body = jsonBody(req);
        if (!body) return res.status(400).json({ error: 'Envio inválido.' });
        if (action === 'responder') {
          const mode = body.mode as Mode;
          if (typeof body.questionId !== 'string' || typeof body.choice !== 'number' || !MODES.includes(mode)) {
            return res.status(400).json({ error: 'Envio inválido.', code: 'ACAO_INVALIDA' });
          }
          return res.status(200).json(await answer(store, user.id, { questionId: body.questionId, choice: body.choice, mode }));
        }
        if (action === 'resgatar' && typeof body.missionId === 'string') {
          return res.status(200).json(await claimMission(store, user.id, body.missionId));
        }
      }
      res.status(400).json({ error: 'Ação inválida.', code: 'ACAO_INVALIDA' });
    } catch (err) {
      if (err instanceof GameError) {
        res.status(err.status).json({ error: err.message, code: err.code, ...err.extra });
        return;
      }
      console.error('[game] erro:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Algo deu errado. Tente de novo.' });
    }
  };
}

export default createGameHandler({ verifyToken: verifySupabaseToken, store: postgresGame });
