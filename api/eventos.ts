// POST /api/eventos — medição de marketing.
//   { consentimento: true | false }  aceitou ou recusou os cookies de anúncio
//                                    (com login, fica gravado no aluno)
// Funciona com ou sem login: o aluno vem só do token, nunca do corpo.
// Falhar aqui nunca atrapalha o estudo: a tela ignora qualquer erro.

import { bearerToken, type Identity, type VerifyToken } from '../server/auth.js';
import { jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { errorText } from '../server/log.js';
import { LIMITES, clientIp, limitar, limitarIp, postgresLimiter, type RateLimiter } from '../server/limite.js';
import type { MarketingStore } from '../server/marketing.js';
import { postgresMarketing } from '../server/marketing-pg.js';
import { verifySupabaseToken } from '../server/supabase.js';

// Login é opcional aqui: token ausente ou inválido = visitante.
async function identidadeOpcional(req: ApiRequest, verifyToken: VerifyToken): Promise<Identity | null> {
  const token = bearerToken(req);
  if (!token) return null;
  try {
    const user = await verifyToken(token);
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

export function createEventosHandler(deps: { verifyToken: VerifyToken; store: MarketingStore; limiter?: RateLimiter | null; now?: () => Date }) {
  const now = deps.now ?? (() => new Date());
  return async function eventosHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    if (!(await limitarIp(deps.limiter, req, res))) return;
    res.setHeader('Cache-Control', 'no-store');
    const body = jsonBody(req);
    if (!body) return res.status(400).json({ error: 'Envio inválido.' });

    const user = await identidadeOpcional(req, deps.verifyToken);
    if (!(await limitar(deps.limiter, res, `eventos:${user?.id ?? clientIp(req)}`, LIMITES.eventosPorMinuto, 60))) return;

    try {
      if (user && typeof body.consentimento === 'boolean') await deps.store.salvarConsentimento(user.id, body.consentimento, now());
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[eventos] erro:', errorText(err));
      res.status(500).json({ error: 'Não foi possível registrar agora.' });
    }
  };
}

export default createEventosHandler({ verifyToken: verifySupabaseToken, store: postgresMarketing, limiter: postgresLimiter });
