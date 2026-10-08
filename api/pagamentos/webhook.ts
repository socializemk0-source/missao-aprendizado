// /api/pagamentos/webhook — notificações do Mercado Pago.
// 1) confere a assinatura (x-signature) com o segredo do painel;
// 2) consulta o pagamento na API com o nosso token;
// 3) aplica (idempotente). Erro nosso → 500, e o Mercado Pago tenta de novo.

import { header, jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../../server/http.js';
import { MercadoPagoError, applyPayment, mercadoPagoClient, verifyWebhookSignature, type MpClient, type PaymentStore } from '../../server/payments.js';
import { postgresPayments } from '../../server/payments-pg.js';
import { errorText, log } from '../../server/log.js';
import { comSeguranca } from '../../server/seguranca.js';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function createWebhookHandler(deps: { store: PaymentStore; client: MpClient | null; secret: string | undefined }) {
  return async function webhookHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    if (!deps.client || !deps.secret) {
      log.erro('[webhook] MERCADOPAGO_ACCESS_TOKEN ou MERCADOPAGO_WEBHOOK_SECRET não configurados');
      return res.status(503).json({ error: 'Não configurado.' });
    }
    // Formato antigo (IPN/Feed: ?topic=...&id=...) não tem assinatura. O mesmo
    // pagamento chega também pelo aviso assinado, então este é só ignorado
    // (200, para o Mercado Pago não insistir) e nada é consultado. Fica no
    // log: se só este formato chegar, falta ligar o aviso assinado no painel.
    const topic = one(req.query.topic);
    if (topic && !one(req.query['data.id'])) {
      log.aviso('[webhook] aviso no formato antigo ignorado', { topic, id: one(req.query.id) });
      return res.status(200).json({ ok: true, ignored: true });
    }

    const body = jsonBody(req) ?? {};
    const data = (body.data && typeof body.data === 'object' ? body.data : {}) as { id?: unknown };
    const dataId = one(req.query['data.id']) ?? (data.id !== undefined ? String(data.id) : one(req.query.id));
    const type = one(req.query.type) ?? (typeof body.type === 'string' ? body.type : undefined);

    if (!verifyWebhookSignature({ xSignature: header(req, 'x-signature'), xRequestId: header(req, 'x-request-id'), dataId, secret: deps.secret })) {
      log.aviso('[webhook] assinatura inválida', { type, dataId });
      return res.status(401).json({ error: 'Assinatura inválida.' });
    }
    if (type !== 'payment' || !dataId || !/^\d{1,30}$/.test(dataId)) return res.status(200).json({ ok: true, ignored: true });

    try {
      let payment;
      try {
        payment = await deps.client.getPayment(dataId);
      } catch (err) {
        // Pagamento que não existe (ex.: "Simular notificação" do painel):
        // não adianta o Mercado Pago tentar de novo.
        if (err instanceof MercadoPagoError && err.status === 404) {
          log.aviso('[webhook] pagamento não encontrado', { dataId });
          return res.status(200).json({ ok: true, ignored: true });
        }
        throw err;
      }
      const result = await applyPayment(deps.store, payment);
      log.info('[webhook] pagamento', { dataId, status: result.status });
      res.status(200).json({ ok: true, resultado: result.status });
    } catch (err) {
      log.erro('[webhook] erro:', errorText(err));
      res.status(500).json({ error: 'Falha ao processar; tente de novo.' });
    }
  };
}

const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

export default comSeguranca(createWebhookHandler({
  store: postgresPayments,
  client: token ? mercadoPagoClient(token) : null,
  secret: process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim(),
}), { metodos: ['POST'], headers: ['Content-Type'], cors: false }); // só o Mercado Pago chama (sem CORS)
