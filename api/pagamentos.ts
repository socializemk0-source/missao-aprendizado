// /api/pagamentos
//   GET                       plano atual, opções e histórico
//   POST ?action=checkout     { cycle } → link do Checkout Pro
//   POST ?action=confirmar    { paymentId } → na volta do checkout, consulta
//                             o pagamento no Mercado Pago e aplica
//   POST ?action=verificar    procura pagamentos das compras do aluno (últimos
//                             30 dias) no Mercado Pago: libera o PRO se o
//                             aviso automático não chegou
// O webhook fica em /api/pagamentos/webhook.

import { authenticate, type VerifyToken } from '../server/auth.js';
import { header, jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { MercadoPagoError, PLANS, applyPayment, isCycle, makeReference, mercadoPagoClient, parseReference, type MpClient, type PaymentStore } from '../server/payments.js';
import { postgresPayments } from '../server/payments-pg.js';
import { verifySupabaseToken } from '../server/supabase.js';
import { errorText } from '../server/log.js';
import { LIMITES, limitarAluno, limitarIp, postgresLimiter, type RateLimiter } from '../server/limite.js';
import { comSeguranca } from '../server/seguranca.js';

const DAY = 86_400_000;
// Quantas compras recentes o "verificar" consulta (cada uma é uma busca no
// Mercado Pago).
const VERIFY_LIMIT = 5;

// Endereço do app para a volta do checkout e o aviso do Mercado Pago. Vem
// da configuração (APP_BASE_URL) ou do endereço que a própria Vercel informa
// (VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL) — nunca dos cabeçalhos da
// requisição em produção, que quem chama pode inventar.
export function baseUrlFrom(req: ApiRequest, configured = process.env.APP_BASE_URL, env: NodeJS.ProcessEnv = process.env): string {
  if (configured) return configured.replace(/\/$/, '');
  const vercel = env.VERCEL_ENV === 'production' ? env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  // Só no desenvolvimento local (fora da Vercel).
  const proto = header(req, 'x-forwarded-proto') ?? 'https';
  const host = header(req, 'x-forwarded-host') ?? header(req, 'host');
  return `${proto}://${host}`;
}

export function createPagamentosHandler(deps: {
  verifyToken: VerifyToken;
  store: PaymentStore;
  client: MpClient | null; // null = pagamentos não configurados
  baseUrl?: (req: ApiRequest) => string;
  now?: () => Date;
  limiter?: RateLimiter | null;
}) {
  const now = deps.now ?? (() => new Date());
  const baseUrl = deps.baseUrl ?? ((req: ApiRequest) => baseUrlFrom(req));

  async function status(userId: string) {
    const until = await deps.store.proUntil(userId);
    const active = Boolean(until && until.getTime() > now().getTime());
    return { plano: active ? 'pro' : 'free', proAte: active ? until!.toISOString() : null };
  }

  return async function pagamentosHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
    if (!(await limitarIp(deps.limiter, req, res))) return;
    const user = await authenticate(req, res, deps.verifyToken);
    if (!user) return;
    if (!(await limitarAluno(deps.limiter, res, 'pagamentos', user.id, LIMITES.pagamentosPorMinuto))) return;
    res.setHeader('Cache-Control', 'no-store');

    try {
      if (req.method === 'GET') {
        return res.status(200).json({
          enabled: Boolean(deps.client),
          ...(await status(user.id)),
          opcoes: Object.entries(PLANS).map(([id, p]) => ({ id, dias: p.days, valor: p.amount })),
          pagamentos: await deps.store.history(user.id),
        });
      }

      if (!deps.client) return res.status(503).json({ error: 'Os pagamentos ainda não estão disponíveis. Tente mais tarde.', code: 'PAGAMENTOS_DESLIGADOS' });
      const body = jsonBody(req);
      const action = req.query.action;

      if (action === 'checkout') {
        if (!isCycle(body?.cycle)) return res.status(400).json({ error: 'Escolha 30 dias ou 1 ano.', code: 'ENVIO_INVALIDO' });
        const reference = makeReference(body.cycle, user.id);
        await deps.store.recordCheckout({ reference, userId: user.id, cycle: body.cycle, now: now() });
        const pref = await deps.client.createPreference({ cycle: body.cycle, reference, payerEmail: user.email, baseUrl: baseUrl(req) });
        return res.status(200).json({ url: pref.url });
      }

      if (action === 'verificar') {
        const refs = await deps.store.openCheckouts(user.id, new Date(now().getTime() - 30 * DAY), VERIFY_LIMIT);
        let resultado: 'granted' | 'pending' | 'none' = 'none';
        for (const reference of refs) {
          for (const payment of await deps.client.searchPayments(reference)) {
            // A referência é do próprio aluno, mas confere de novo o que veio da API.
            if (parseReference(payment.external_reference)?.userId !== user.id) continue;
            const r = await applyPayment(deps.store, payment, now());
            if (r.status === 'granted' || r.status === 'already') resultado = 'granted';
            else if (r.status === 'pending' && resultado === 'none') resultado = 'pending';
          }
        }
        return res.status(200).json({ resultado, ...(await status(user.id)) });
      }

      if (action === 'confirmar') {
        const paymentId = typeof body?.paymentId === 'string' || typeof body?.paymentId === 'number' ? String(body.paymentId) : '';
        if (!/^\d{1,30}$/.test(paymentId)) return res.status(400).json({ error: 'Pagamento inválido.', code: 'ENVIO_INVALIDO' });
        let payment;
        try {
          payment = await deps.client.getPayment(paymentId);
        } catch (err) {
          if (err instanceof MercadoPagoError && err.status === 404) return res.status(404).json({ error: 'Pagamento não encontrado.', code: 'PAGAMENTO_INEXISTENTE' });
          throw err;
        }
        // Só o dono do pagamento confirma o próprio pagamento.
        if (parseReference(payment.external_reference)?.userId !== user.id) {
          return res.status(404).json({ error: 'Pagamento não encontrado.', code: 'PAGAMENTO_INEXISTENTE' });
        }
        const result = await applyPayment(deps.store, payment, now());
        return res.status(200).json({ resultado: result.status, ...(await status(user.id)) });
      }

      res.status(400).json({ error: 'Ação inválida.', code: 'ACAO_INVALIDA' });
    } catch (err) {
      console.error('[pagamentos] erro:', errorText(err));
      if (err instanceof MercadoPagoError) {
        return res.status(502).json({ error: 'Não foi possível falar com o Mercado Pago agora. Tente de novo em instantes.', code: 'MERCADO_PAGO_INDISPONIVEL' });
      }
      res.status(500).json({ error: 'Não foi possível carregar seus pagamentos agora. Tente de novo em instantes.' });
    }
  };
}

const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

export default comSeguranca(createPagamentosHandler({
  verifyToken: verifySupabaseToken,
  store: postgresPayments,
  client: token ? mercadoPagoClient(token) : null,
  limiter: postgresLimiter,
}), { metodos: ['GET', 'POST'], headers: ['Authorization', 'Content-Type'] });
