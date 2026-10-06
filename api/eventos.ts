// POST /api/eventos — medição de marketing (registro próprio).
//   {
//     consentimento?: true | false | null,  aceitou ou recusou os cookies de
//                                           anúncio (null = ainda não escolheu)
//     origem?: { utm_source, ..., fbclid, gclid, ttclid, pagina, em },
//     eventos?: [{ nome, eventId, dados? }]  PageView, DemoQuestionAnswered,
//                                           ViewContent, InitiateCheckout
//   }
//   → { pendentes: [{ nome, eventId, dados }] } eventos do servidor
//     (cadastro, onboarding, 1ª fase) para o pixel disparar com o mesmo
//     event_id — só com login e com aceite.
// Funciona com ou sem login: o aluno vem só do token, nunca do corpo. Valor
// e moeda do InitiateCheckout vêm da tabela de planos do servidor.
// Falhar aqui nunca atrapalha o estudo: a tela ignora qualquer erro.

import { bearerToken, type Identity, type VerifyToken } from '../server/auth.js';
import { jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { errorText } from '../server/log.js';
import { LIMITES, clientIp, limitar, limitarIp, postgresLimiter, type RateLimiter } from '../server/limite.js';
import { eventoDoAluno, limparEventId, limparOrigem, registrarSeguro, type MarketingStore } from '../server/marketing.js';
import { postgresMarketing } from '../server/marketing-pg.js';
import { PLANS, isCycle } from '../server/payments.js';
import { verifySupabaseToken } from '../server/supabase.js';
import { EVENTOS_NAVEGADOR, type EventoNavegador, type EventoParaPixel } from '../shared/medicao.js';

const MAX_EVENTOS = 10;

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

interface EventoValido {
  nome: EventoNavegador;
  eventId: string;
  dados: Record<string, string | number>;
  valor: number | null;
  moeda: 'BRL' | null;
}

// Só os eventos conhecidos, cada um com os dados que ele pode ter.
export function eventoValido(raw: unknown): EventoValido | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const eventId = limparEventId(r.eventId);
  const nome = EVENTOS_NAVEGADOR.find((n) => n === r.nome);
  const d = (r.dados && typeof r.dados === 'object' ? r.dados : {}) as Record<string, unknown>;
  if (!eventId || !nome) return null;
  const base = { nome, eventId, valor: null, moeda: null };
  switch (nome) {
    case 'PageView':
      return typeof d.pagina === 'string' && /^\/[\w\-./]{0,199}$/.test(d.pagina) ? { ...base, dados: { pagina: d.pagina } } : null;
    case 'DemoQuestionAnswered':
      return d.acertou === 'sim' || d.acertou === 'nao' ? { ...base, dados: { acertou: d.acertou } } : null;
    case 'ViewContent':
      return d.content_name === 'planos' ? { ...base, dados: { content_name: 'planos' } } : null;
    case 'InitiateCheckout':
      return isCycle(d.plano) ? { ...base, dados: { plano: d.plano }, valor: PLANS[d.plano].amount, moeda: 'BRL' } : null;
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

    const consentimento = typeof body.consentimento === 'boolean' ? body.consentimento : null;
    const aceitou = consentimento === true;
    const origemDaVisita = limparOrigem(body.origem);
    const eventos = (Array.isArray(body.eventos) ? body.eventos.slice(0, MAX_EVENTOS) : []).map(eventoValido).filter((e) => e !== null);
    const agora = now();

    try {
      let origem = origemDaVisita;
      let pendentes: EventoParaPixel[] = [];
      if (user) {
        if (consentimento !== null) await deps.store.salvarConsentimento(user.id, consentimento, agora);
        // Cadastro novo: grava a primeira origem e o CompleteRegistration (uma vez só).
        if (await deps.store.cadastroRecente(user.id, agora)) {
          if (origemDaVisita) await deps.store.salvarOrigem(user.id, origemDaVisita, agora);
          await eventoDoAluno(deps.store, user.id, 'CompleteRegistration', agora);
        }
        origem = (await deps.store.origem(user.id)) ?? origemDaVisita;
      }
      for (const e of eventos) {
        await registrarSeguro(deps.store, {
          ...e, userId: user?.id ?? null, origem, consentimento: aceitou,
          envio: { meta_pixel: aceitou ? 'navegador' : 'sem_consentimento' }, now: agora,
        });
      }
      if (user && aceitou) pendentes = await deps.store.pendentesDoPixel(user.id, agora);
      res.status(200).json({ pendentes });
    } catch (err) {
      console.error('[eventos] erro:', errorText(err));
      res.status(500).json({ error: 'Não foi possível registrar agora.' });
    }
  };
}

export default createEventosHandler({ verifyToken: verifySupabaseToken, store: postgresMarketing, limiter: postgresLimiter });
