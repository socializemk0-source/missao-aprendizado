// Pagamentos pelo Mercado Pago (Checkout Pro): passe PRO de 30 dias ou
// 1 ano, pago uma vez por PIX ou cartão, sem renovação automática.
//
// Regra de segurança: um pagamento só vale depois de CONSULTADO na API do
// Mercado Pago com o token do servidor. O corpo de uma notificação ou os
// parâmetros da volta do checkout nunca decidem nada sozinhos.

import crypto from 'node:crypto';

export type Cycle = 'monthly' | 'annual';

export const PLANS: Record<Cycle, { days: number; amount: number; title: string }> = {
  monthly: { days: 30, amount: 29.9, title: 'Aprova Tico PRO — 30 dias' },
  annual: { days: 365, amount: 239.9, title: 'Aprova Tico PRO — 1 ano' },
};

export const isCycle = (v: unknown): v is Cycle => v === 'monthly' || v === 'annual';

// external_reference: "v2:<ciclo>:<userId>:<nonce>" — liga o pagamento ao
// aluno e ao plano. O valor pago é conferido de novo contra PLANS.
export function makeReference(cycle: Cycle, userId: string): string {
  return `v2:${cycle}:${userId}:${crypto.randomUUID().slice(0, 8)}`;
}

export function parseReference(ref: unknown): { cycle: Cycle; userId: string } | null {
  if (typeof ref !== 'string') return null;
  const m = /^v2:(monthly|annual):(.+):[0-9a-f]{8}$/.exec(ref);
  return m ? { cycle: m[1] as Cycle, userId: m[2]! } : null;
}

// ---------------------------------------------------------------- Cliente
export interface MpPayment {
  id: number | string;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded | charged_back
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
}

export interface MpClient {
  createPreference(input: { cycle: Cycle; userId: string; payerEmail: string | null; baseUrl: string }): Promise<{ id: string; url: string }>;
  getPayment(id: string): Promise<MpPayment>;
}

export class MercadoPagoError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function mercadoPagoClient(accessToken: string, send: typeof fetch = fetch): MpClient {
  async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const method = init.method ?? 'GET';
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    // Uma criação repetida (nova tentativa de rede) não vira duas cobranças.
    if (method === 'POST') headers['X-Idempotency-Key'] = crypto.randomUUID();
    const res = await send(`https://api.mercadopago.com${path}`, {
      method, headers, signal: AbortSignal.timeout(15_000),
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
    if (!res.ok || !data) throw new MercadoPagoError(`Mercado Pago ${method} ${path}: HTTP ${res.status} ${data?.message ?? ''}`.trim(), res.status);
    return data;
  }

  return {
    async createPreference({ cycle, userId, payerEmail, baseUrl }) {
      const plan = PLANS[cycle];
      const back = `${baseUrl}/planos`;
      const pref = await request<{ id: string; init_point: string; sandbox_init_point?: string }>('/checkout/preferences', {
        method: 'POST',
        body: {
          items: [{ id: `pro-${cycle}`, title: plan.title, quantity: 1, unit_price: plan.amount, currency_id: 'BRL' }],
          external_reference: makeReference(cycle, userId),
          ...(payerEmail ? { payer: { email: payerEmail } } : {}),
          back_urls: { success: back, pending: back, failure: back },
          auto_return: 'approved',
          notification_url: `${baseUrl}/api/pagamentos/webhook`,
          // Boleto leva dias para compensar; o aluno ficaria esperando.
          payment_methods: { excluded_payment_types: [{ id: 'ticket' }] },
          statement_descriptor: 'APROVATICO',
        },
      });
      // Credenciais de teste (TEST-...) abrem o ambiente de testes.
      const url = accessToken.startsWith('TEST-') && pref.sandbox_init_point ? pref.sandbox_init_point : pref.init_point;
      return { id: pref.id, url };
    },
    getPayment: (id) => request<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`),
  };
}

// ---------------------------------------------------------------- Assinatura do webhook
// Header x-signature "ts=...,v1=..."; manifest "id:{data.id};request-id:{x-request-id};ts:{ts};"
// (omitindo o par que não veio). data.id alfanumérico vale em minúsculas.
export function verifyWebhookSignature(input: { xSignature?: string; xRequestId?: string; dataId?: string; secret: string }): boolean {
  const { xSignature, secret } = input;
  if (!xSignature || !secret) return false;
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(',')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim().toLowerCase();
    const value = part.slice(i + 1).trim();
    if (key === 'ts') ts = value;
    else if (key === 'v1') v1 = value;
  }
  if (!ts || !/^\d+$/.test(ts) || !v1) return false;
  const id = input.dataId?.trim() || undefined;
  const requestId = input.xRequestId?.trim() || undefined;
  const candidates = id && id.toLowerCase() !== id ? [id, id.toLowerCase()] : [id];
  return candidates.some((candidate) => {
    const manifest = [candidate && `id:${candidate}`, requestId && `request-id:${requestId}`, `ts:${ts}`].filter(Boolean).join(';') + ';';
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return expected.length === v1!.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1!));
  });
}

// ---------------------------------------------------------------- Aplicar no banco
export interface PaymentRecord { paymentId: string; cycle: Cycle; amount: number; status: 'approved' | 'refunded'; createdAt: string }

export interface PaymentStore {
  proUntil(userId: string): Promise<Date | null>;
  // Idempotente pelo paymentId: o mesmo pagamento nunca soma dias duas vezes.
  grant(input: { paymentId: string; userId: string; cycle: Cycle; days: number; amount: number; now: Date }): Promise<{ status: 'granted' | 'already'; proUntil: Date | null }>;
  revoke(input: { paymentId: string; now: Date }): Promise<{ status: 'revoked' | 'ignored'; userId?: string }>;
  history(userId: string): Promise<PaymentRecord[]>;
}

export type ApplyResult =
  | { status: 'granted' | 'already'; userId: string; proUntil: Date | null }
  | { status: 'revoked'; userId?: string }
  | { status: 'pending' | 'rejected' | 'ignored'; userId?: string };

export async function applyPayment(store: PaymentStore, payment: MpPayment, now = new Date()): Promise<ApplyResult> {
  const ref = parseReference(payment.external_reference);
  if (!ref || payment.id === undefined || payment.id === null) return { status: 'ignored' };
  const paymentId = String(payment.id);
  const plan = PLANS[ref.cycle];

  if (payment.status === 'approved') {
    const amount = Number(payment.transaction_amount);
    if (payment.currency_id !== 'BRL' || !(amount >= plan.amount - 0.005)) {
      console.warn('[pagamentos] valor/moeda inesperados; PRO não liberado', { paymentId, currency: payment.currency_id, amount });
      return { status: 'ignored', userId: ref.userId };
    }
    const r = await store.grant({ paymentId, userId: ref.userId, cycle: ref.cycle, days: plan.days, amount, now });
    return { ...r, userId: ref.userId };
  }
  if (payment.status === 'refunded' || payment.status === 'charged_back') {
    const r = await store.revoke({ paymentId, now });
    return r.status === 'revoked' ? { status: 'revoked', userId: r.userId } : { status: 'ignored', userId: ref.userId };
  }
  if (payment.status === 'rejected' || payment.status === 'cancelled') return { status: 'rejected', userId: ref.userId };
  return { status: 'pending', userId: ref.userId }; // PIX aguardando, em análise
}

// ---------------------------------------------------------------- Memória
const DAY = 86_400_000;

export function memoryPayments(): PaymentStore & { pro: Map<string, Date>; rows: Map<string, PaymentRecord & { userId: string; days: number }> } {
  const pro = new Map<string, Date>();
  const rows = new Map<string, PaymentRecord & { userId: string; days: number }>();
  return {
    pro, rows,
    proUntil: async (userId) => pro.get(userId) ?? null,
    async grant({ paymentId, userId, cycle, days, amount, now }) {
      if (rows.has(paymentId)) return { status: 'already', proUntil: pro.get(userId) ?? null };
      rows.set(paymentId, { paymentId, userId, cycle, days, amount, status: 'approved', createdAt: now.toISOString() });
      const base = Math.max(pro.get(userId)?.getTime() ?? 0, now.getTime());
      pro.set(userId, new Date(base + days * DAY));
      return { status: 'granted', proUntil: pro.get(userId)! };
    },
    async revoke({ paymentId }) {
      const row = rows.get(paymentId);
      if (!row || row.status !== 'approved') return { status: 'ignored' };
      row.status = 'refunded';
      const until = pro.get(row.userId);
      if (until) pro.set(row.userId, new Date(until.getTime() - row.days * DAY));
      return { status: 'revoked', userId: row.userId };
    },
    history: async (userId) => [...rows.values()].filter((r) => r.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ paymentId, cycle, amount, status, createdAt }) => ({ paymentId, cycle, amount, status, createdAt })),
  };
}
