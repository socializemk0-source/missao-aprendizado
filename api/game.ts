// /api/game?action=... — tudo do jogo numa função só (o plano grátis da
// Vercel permite poucas funções por projeto).
//   GET  progresso | trilha | fase&id= | revisar | pratica&disciplina= | desafio
//        missoes | conquistas | disciplinas | ranking
//        simulados | simulado&id= | jogos | plano
//   POST responder { questionId, choice, mode } | resgatar { missionId }
//        simulado-iniciar { nivel, disciplinas, banca, quantidade, cronometro }
//        simulado-entregar { id, respostas: { [questionId]: alternativa } }
//        jogo-iniciar { tipo, disciplina? } | jogo-jogada { id, ...jogada }
//        jogo-terminar { id }
//        plano-salvar { prova, banca, dataProva, minutosDia, nivel, disciplinas }
//
// As ações, os parâmetros (zod), o limite e quem exige Idempotency-Key estão
// em server/actions.ts. Todo POST exige o header Idempotency-Key (uuid):
// repetir a chave devolve a mesma resposta, sem creditar XP de novo.
// A hora de tudo é a do Postgres (store.now()), nunca a do aparelho.
// Toda escrita também exige um CAPTCHA novo no header X-Turnstile-Token
// (server/turnstile.ts, formulário "game"): um token por tentativa; repetir
// a mesma Idempotency-Key devolve a resposta guardada sem gastar token, e uma
// tentativa nova pede token novo à tela.

import { authenticate, type VerifyToken } from '../server/auth.js';
import { actionSpec, BUCKETS, isAction, parseParams, type ParsedAction } from '../server/actions.js';
import {
  GameError, answer, claimMission, getAchievements, getChallengeSession, getMissions, getPhaseSession,
  getPracticeSession, getProgress, getRanking, getReviewSession, getSubjects, getTrail, studyDay, type GameStore,
} from '../server/game.js';
import { postgresGame } from '../server/game-pg.js';
import { header, jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { hashPedido, memoryIdempotency, postgresIdempotency, type IdempotencyStore } from '../server/idempotencia.js';
import { clientIp, limitar, limitarIp, postgresLimiter, type RateLimiter } from '../server/limite.js';
import { responderCaptcha, verifyTurnstile, type VerifyTurnstile } from '../server/turnstile.js';
import { getDominio, getPlano, parsePerfilEstudo, saveStudyProfile } from '../server/estudo.js';
import { getJogos, jogar, startJogo, terminarJogo } from '../server/minigames.js';
import { deliverSimulado, getSimulado, getSimuladoOptions, parseSimuladoInput, startSimulado } from '../server/simulado.js';
import { verifySupabaseToken } from '../server/supabase.js';
import { errorText } from '../server/log.js';
import { comSeguranca } from '../server/seguranca.js';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE_LIMITED = 'rate_limited';

interface Resultado { status: number; body: unknown }

// Parâmetros da URL (menos "action"), um valor por nome.
function queryParams(query: ApiRequest['query']): Record<string, string> {
  return Object.fromEntries(Object.entries(query).filter(([k]) => k !== 'action').map(([k, v]) => [k, one(v)]));
}

// Cada ação chama a sua regra com os parâmetros JÁ validados. Sem default:
// uma ação nova que não tenha caso aqui não compila.
async function executar(store: GameStore, userId: string, p: ParsedAction, now: Date): Promise<unknown> {
  switch (p.action) {
    case 'progresso': return getProgress(store, userId, now);
    case 'trilha': return { capitulos: await getTrail(store, userId), progress: await getProgress(store, userId, now) };
    case 'fase': return getPhaseSession(store, userId, p.params.id);
    case 'revisar': return getReviewSession(store, userId, undefined, now);
    case 'pratica': return getPracticeSession(store, userId, p.params.disciplina);
    case 'desafio': return getChallengeSession(store, userId);
    case 'missoes': return { missoes: await getMissions(store, userId, now) };
    case 'conquistas': return { conquistas: await getAchievements(store, userId, now) };
    case 'disciplinas': return { disciplinas: await getSubjects(store, userId), assuntos: await getDominio(store, userId, now) };
    case 'ranking': return getRanking(store, userId, undefined, now);
    case 'simulados': return getSimuladoOptions(store, userId, now);
    case 'simulado': return getSimulado(store, userId, p.params.id, now);
    case 'jogos': return getJogos(store, userId, now);
    case 'plano': return getPlano(store, userId, now);
    case 'responder': return answer(store, userId, p.params, now);
    case 'resgatar': return claimMission(store, userId, p.params.missionId, now);
    case 'simulado-iniciar': {
      const input = parseSimuladoInput(p.params);
      if (!input) throw new GameError('ACAO_INVALIDA', 400, 'Escolha nível, matérias e quantidade.');
      return startSimulado(store, userId, input, now);
    }
    case 'simulado-entregar': return deliverSimulado(store, userId, p.params.id, p.params.respostas, now);
    case 'jogo-iniciar': return startJogo(store, userId, { tipo: p.params.tipo, disciplina: p.params.disciplina ?? null }, undefined, now);
    case 'jogo-jogada': {
      const { id, ...jogada } = p.params;
      return jogar(store, userId, id, jogada, now);
    }
    case 'jogo-terminar': return terminarJogo(store, userId, p.params.id, now);
    case 'plano-salvar': {
      const perfil = parsePerfilEstudo(p.params, studyDay(now));
      if (typeof perfil === 'string') throw new GameError('ACAO_INVALIDA', 400, perfil);
      await saveStudyProfile(store, userId, perfil);
      return getPlano(store, userId, now);
    }
  }
  const nunca: never = p;
  throw new Error(`ação sem caso: ${String((nunca as { action?: unknown }).action)}`);
}

async function rodar(store: GameStore, userId: string, p: ParsedAction, now: Date): Promise<Resultado> {
  try {
    return { status: 200, body: await executar(store, userId, p, now) };
  } catch (err) {
    if (err instanceof GameError) return { status: err.status, body: { error: err.message, code: err.code, ...err.extra } };
    console.error('[game] erro:', errorText(err));
    return { status: 500, body: { error: 'Algo deu errado. Tente de novo.' } };
  }
}

export function createGameHandler(deps: {
  verifyToken: VerifyToken; store: GameStore; limiter?: RateLimiter | null; idempotency?: IdempotencyStore; turnstile?: VerifyTurnstile;
}) {
  const { store, turnstile = verifyTurnstile } = deps;
  const idempotency = deps.idempotency ?? memoryIdempotency();
  return async function gameHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
    if (!(await limitarIp(deps.limiter, req, res, undefined, RATE_LIMITED))) return;

    const action = one(req.query.action);
    if (!isAction(action)) return res.status(400).json({ error: 'Ação inválida.', code: 'unknown_action' });
    const spec = actionSpec(action);
    if (req.method !== spec.method) return methodNotAllowed(res, [spec.method]);

    const user = spec.authRequired ? await authenticate(req, res, deps.verifyToken) : null;
    if (spec.authRequired && !user) return;
    const quem = user ? user.id : `ip:${clientIp(req)}`;
    if (!(await limitar(deps.limiter, res, `jogo-${spec.rateLimitBucket}:${quem}`, BUCKETS[spec.rateLimitBucket], 60, undefined, RATE_LIMITED))) return;
    res.setHeader('Cache-Control', 'no-store');
    // Toda ação de hoje é do aluno logado; uma ação pública teria o seu próprio caminho.
    if (!user) return res.status(401).json({ error: 'Faça login para continuar.' });

    const raw = spec.method === 'GET' ? queryParams(req.query) : jsonBody(req);
    const parsed = raw === null ? null : parseParams(action, raw);
    if (!parsed?.ok) return res.status(400).json({ error: parsed?.error ?? 'Envio inválido.', code: 'invalid_params' });

    try {
      if (!spec.idempotent) {
        const r = await rodar(store, user.id, parsed.parsed, await store.now());
        return res.status(r.status).json(r.body);
      }

      const key = header(req, 'idempotency-key')?.trim() ?? '';
      if (!UUID.test(key)) {
        return res.status(400).json({ error: 'Envio sem identificação. Atualize a página e tente de novo.', code: 'idempotency_key_required' });
      }
      const now = await store.now();
      const reserva = await idempotency.reservar(user.id, key.toLowerCase(), action, hashPedido(action, parsed.parsed.params), now);
      if (reserva.estado === 'repetida') {
        res.setHeader('Idempotent-Replayed', 'true');
        return res.status(reserva.status).json(reserva.body);
      }
      if (reserva.estado === 'em-andamento') {
        return res.status(409).json({ error: 'Este envio ainda está sendo processado. Espere um instante.', code: 'idempotency_in_progress' });
      }
      if (reserva.estado === 'conflito') {
        return res.status(422).json({ error: 'Este envio já foi usado para outro pedido.', code: 'idempotency_conflict' });
      }

      // CAPTCHA da tentativa (escrita do jogo: sem resposta da Cloudflare, bloqueia).
      // Recusado: a chave é liberada para a tela tentar de novo com um token novo.
      const captcha = await turnstile(header(req, 'x-turnstile-token'), { uso: 'jogo', remoteip: clientIp(req) });
      if (!captcha.ok) {
        await idempotency.liberar(user.id, key.toLowerCase());
        responderCaptcha(res, captcha);
        return;
      }

      const r = await rodar(store, user.id, parsed.parsed, now);
      // Erro do servidor: libera a chave para tentar de novo. O resto (inclusive
      // recusas como SEM_VIDAS) fica guardado e se repete igual.
      if (r.status >= 500) await idempotency.liberar(user.id, key.toLowerCase());
      else await idempotency.concluir(user.id, key.toLowerCase(), r.status, r.body);
      return res.status(r.status).json(r.body);
    } catch (err) {
      console.error('[game] erro:', errorText(err));
      res.status(500).json({ error: 'Algo deu errado. Tente de novo.' });
    }
  };
}

export default comSeguranca(
  createGameHandler({ verifyToken: verifySupabaseToken, store: postgresGame, limiter: postgresLimiter, idempotency: postgresIdempotency }),
  { metodos: ['GET', 'POST'], headers: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Turnstile-Token'] },
);
