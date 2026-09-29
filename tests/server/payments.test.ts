import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createPagamentosHandler } from '../../api/pagamentos.js';
import { createWebhookHandler } from '../../api/pagamentos/webhook.js';
import {
  MercadoPagoError, applyPayment, makeReference, memoryPayments, mercadoPagoClient, parseReference, verifyWebhookSignature,
  type MpClient, type MpPayment,
} from '../../server/payments.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

const DAY = 86_400_000;
const NOW = new Date('2026-09-10T12:00:00Z');
const SECRET = 'segredo-do-painel';

const sign = (dataId: string | undefined, requestId: string | undefined, ts = '1700000000', secret = SECRET) => {
  const manifest = [dataId && `id:${dataId}`, requestId && `request-id:${requestId}`, `ts:${ts}`].filter(Boolean).join(';') + ';';
  return `ts=${ts},v1=${crypto.createHmac('sha256', secret).update(manifest).digest('hex')}`;
};

const payment = (over: Partial<MpPayment> & { userId?: string; cycle?: 'monthly' | 'annual' } = {}): MpPayment => ({
  id: 111, status: 'approved', transaction_amount: 29.9, currency_id: 'BRL',
  external_reference: makeReference(over.cycle ?? 'monthly', over.userId ?? 'u1'),
  ...over,
});

describe('referência e assinatura', () => {
  it('a referência liga pagamento, plano e aluno', () => {
    expect(parseReference(makeReference('annual', 'abc-123'))).toEqual({ cycle: 'annual', userId: 'abc-123' });
    expect(parseReference('v1:monthly:u1:12345678')).toBeNull();
    expect(parseReference('v2:vitalicio:u1:12345678')).toBeNull();
    expect(parseReference(null)).toBeNull();
  });

  it('assinatura do webhook: válida, adulterada, sem segredo, id em minúsculas', () => {
    expect(verifyWebhookSignature({ xSignature: sign('123', 'req-1'), xRequestId: 'req-1', dataId: '123', secret: SECRET })).toBe(true);
    expect(verifyWebhookSignature({ xSignature: sign('123', 'req-1'), xRequestId: 'req-1', dataId: '124', secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: sign('123', 'req-1', '1', 'outro'), xRequestId: 'req-1', dataId: '123', secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: sign('123', 'req-1'), xRequestId: 'req-1', dataId: '123', secret: '' })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: undefined, dataId: '123', secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: 'ts=abc,v1=00', dataId: '123', secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: sign('abc', undefined), dataId: 'ABC', secret: SECRET })).toBe(true);
    expect(verifyWebhookSignature({ xSignature: sign(undefined, 'r'), xRequestId: 'r', secret: SECRET })).toBe(true);
  });
});

describe('aplicar pagamento', () => {
  it('aprovado: +30 dias; o mesmo pagamento de novo não soma; outro pagamento soma no fim', async () => {
    const store = memoryPayments();
    expect(await applyPayment(store, payment(), NOW)).toMatchObject({ status: 'granted', userId: 'u1' });
    expect(store.pro.get('u1')).toEqual(new Date(NOW.getTime() + 30 * DAY));
    expect(await applyPayment(store, payment(), NOW)).toMatchObject({ status: 'already' });
    expect(store.pro.get('u1')).toEqual(new Date(NOW.getTime() + 30 * DAY));
    await applyPayment(store, payment({ id: 222, cycle: 'annual', transaction_amount: 239.9 }), NOW);
    expect(store.pro.get('u1')).toEqual(new Date(NOW.getTime() + 395 * DAY));
  });

  it('PRO vencido: conta a partir de agora', async () => {
    const store = memoryPayments();
    store.pro.set('u1', new Date(NOW.getTime() - 5 * DAY));
    await applyPayment(store, payment(), NOW);
    expect(store.pro.get('u1')).toEqual(new Date(NOW.getTime() + 30 * DAY));
  });

  it('valor menor, outra moeda ou referência estranha não liberam', async () => {
    const store = memoryPayments();
    expect((await applyPayment(store, payment({ transaction_amount: 1 }), NOW)).status).toBe('ignored');
    expect((await applyPayment(store, payment({ cycle: 'annual', transaction_amount: 29.9 }), NOW)).status).toBe('ignored');
    expect((await applyPayment(store, payment({ currency_id: 'USD' }), NOW)).status).toBe('ignored');
    expect((await applyPayment(store, payment({ external_reference: 'qualquer' }), NOW)).status).toBe('ignored');
    expect(store.pro.size).toBe(0);
  });

  it('pendente/recusado não mexem; estorno tira os dias uma vez só', async () => {
    const store = memoryPayments();
    expect((await applyPayment(store, payment({ status: 'pending' }), NOW)).status).toBe('pending');
    expect((await applyPayment(store, payment({ status: 'rejected' }), NOW)).status).toBe('rejected');
    await applyPayment(store, payment(), NOW);
    expect((await applyPayment(store, payment({ status: 'refunded' }), NOW)).status).toBe('revoked');
    expect((await applyPayment(store, payment({ status: 'charged_back' }), NOW)).status).toBe('ignored');
    expect(store.pro.get('u1')).toEqual(NOW);
    expect((await store.history('u1'))[0]).toMatchObject({ paymentId: '111', status: 'refunded' });
  });
});

describe('cliente do Mercado Pago', () => {
  it('cria a preferência com referência, volta, webhook e sem boleto; token TEST usa o sandbox', async () => {
    const send = vi.fn(async () => new Response(JSON.stringify({ id: 'pref', init_point: 'https://mp/prod', sandbox_init_point: 'https://mp/sandbox' })));
    const client = mercadoPagoClient('TEST-abc', send as unknown as typeof fetch);
    const reference = makeReference('annual', 'u1');
    const r = await client.createPreference({ cycle: 'annual', reference, payerEmail: 'a@b.c', baseUrl: 'https://app.dev' });
    expect(r.url).toBe('https://mp/sandbox');
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe('https://api.mercadopago.com/checkout/preferences');
    expect(init.headers.Authorization).toBe('Bearer TEST-abc');
    expect(init.headers['X-Idempotency-Key']).toBeTruthy();
    const body = JSON.parse(init.body as string);
    expect(body.items[0]).toMatchObject({ unit_price: 239.9, currency_id: 'BRL' });
    expect(body.external_reference).toBe(reference);
    expect(parseReference(body.external_reference)).toEqual({ cycle: 'annual', userId: 'u1' });
    expect(body.back_urls.success).toBe('https://app.dev/planos');
    expect(body.notification_url).toBe('https://app.dev/api/pagamentos/webhook');
    expect(body.payment_methods.excluded_payment_types).toEqual([{ id: 'ticket' }]);
    const prod = mercadoPagoClient('APP_USR-x', send as unknown as typeof fetch);
    expect((await prod.createPreference({ cycle: 'monthly', reference: makeReference('monthly', 'u1'), payerEmail: null, baseUrl: 'https://app.dev' })).url).toBe('https://mp/prod');
  });

  it('erro HTTP vira MercadoPagoError com status', async () => {
    const client = mercadoPagoClient('x', (async () => new Response('{"message":"not found"}', { status: 404 })) as unknown as typeof fetch);
    await expect(client.getPayment('1')).rejects.toMatchObject({ status: 404 });
  });

  it('busca os pagamentos de uma compra pela referência', async () => {
    const reference = makeReference('monthly', 'u1');
    const send = vi.fn(async () => new Response(JSON.stringify({ results: [{ id: 9, status: 'approved', external_reference: reference }] })));
    const found = await mercadoPagoClient('x', send as unknown as typeof fetch).searchPayments(reference);
    expect(found).toEqual([{ id: 9, status: 'approved', external_reference: reference }]);
    const [url] = send.mock.calls[0] as unknown as [string];
    expect(url).toBe(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(reference)}&sort=date_created&criteria=desc`);
  });

  it('falha de rede (sem resposta) também vira MercadoPagoError', async () => {
    const client = mercadoPagoClient('x', (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch);
    await expect(client.getPayment('1')).rejects.toBeInstanceOf(MercadoPagoError);
  });
});

function fakeClient(payments: Record<string, MpPayment> = {}): MpClient & { created: { reference: string }[] } {
  const created: { reference: string }[] = [];
  return {
    created,
    async createPreference(input) { created.push(input); return { id: 'pref', url: 'https://mp/checkout' }; },
    async searchPayments(reference) { return Object.values(payments).filter((p) => p.external_reference === reference); },
    async getPayment(id) {
      const p = payments[id];
      if (!p) throw new MercadoPagoError('nf', 404);
      return p;
    },
  };
}

describe('/api/pagamentos', () => {
  const setup = (payments: Record<string, MpPayment> = {}, enabled = true) => {
    const store = memoryPayments();
    const client = fakeClient(payments);
    const handler = createPagamentosHandler({ verifyToken: fakeVerify, store, client: enabled ? client : null, baseUrl: () => 'https://app.dev', now: () => NOW });
    const call = async (method: string, action?: string, body?: unknown, token = 'ok:u1') => {
      const res = makeRes();
      await handler(makeReq({ method, query: action ? { action } : {}, body, token }), res);
      return res;
    };
    return { store, client, call };
  };

  it('sem login → 401; GET mostra plano grátis e opções', async () => {
    const { call } = setup();
    expect((await call('GET', undefined, undefined, 'x')).statusCode).toBe(401);
    const res = await call('GET');
    expect(res.body).toMatchObject({ enabled: true, plano: 'free', proAte: null, pagamentos: [] });
    expect(res.body.opcoes).toEqual([{ id: 'monthly', dias: 30, valor: 29.9 }, { id: 'annual', dias: 365, valor: 239.9 }]);
  });

  it('checkout: cria o link para o aluno logado', async () => {
    const { call, client } = setup();
    const res = await call('POST', 'checkout', { cycle: 'annual' });
    expect(res.body).toEqual({ url: 'https://mp/checkout' });
    expect(client.created[0]).toMatchObject({ cycle: 'annual', payerEmail: 'u1@teste.dev', baseUrl: 'https://app.dev' });
    expect(parseReference(client.created[0]!.reference)).toEqual({ cycle: 'annual', userId: 'u1' });
    expect((await call('POST', 'checkout', { cycle: 'vitalicio' })).statusCode).toBe(400);
  });

  it('confirmar: aplica o pagamento do próprio aluno; de outro aluno → 404', async () => {
    const { call } = setup({ '111': payment(), '222': payment({ id: 222, userId: 'u2' }) });
    const res = await call('POST', 'confirmar', { paymentId: '111' });
    expect(res.body).toMatchObject({ resultado: 'granted', plano: 'pro', proAte: new Date(NOW.getTime() + 30 * DAY).toISOString() });
    expect((await call('POST', 'confirmar', { paymentId: '111' })).body.resultado).toBe('already');
    expect((await call('POST', 'confirmar', { paymentId: '222' })).statusCode).toBe(404);
    expect((await call('POST', 'confirmar', { paymentId: '999' })).statusCode).toBe(404);
    expect((await call('POST', 'confirmar', { paymentId: '../x' })).statusCode).toBe(400);
  });

  it('sem token do Mercado Pago: GET avisa, POST → 503', async () => {
    const { call } = setup({}, false);
    expect((await call('GET')).body.enabled).toBe(false);
    expect((await call('POST', 'checkout', { cycle: 'monthly' })).statusCode).toBe(503);
  });

  it('checkout registra a compra iniciada, com a mesma referência enviada ao Mercado Pago', async () => {
    const { call, client, store } = setup();
    await call('POST', 'checkout', { cycle: 'monthly' });
    expect([...store.checkouts.keys()]).toEqual([client.created[0]!.reference]);
    expect(store.checkouts.get(client.created[0]!.reference)).toMatchObject({ userId: 'u1', cycle: 'monthly', paid: false });
  });

  it('verificar: acha o pagamento aprovado da compra e libera o PRO (quando o aviso não chegou)', async () => {
    const payments: Record<string, MpPayment> = {};
    const { call, client } = setup(payments);
    expect((await call('POST', 'verificar')).body).toMatchObject({ resultado: 'none', plano: 'free' });
    await call('POST', 'checkout', { cycle: 'monthly' });
    const reference = client.created[0]!.reference;
    payments['901'] = { id: 901, status: 'pending', transaction_amount: 29.9, currency_id: 'BRL', external_reference: reference };
    expect((await call('POST', 'verificar')).body).toMatchObject({ resultado: 'pending', plano: 'free' });
    payments['901'] = { ...payments['901']!, status: 'approved' };
    const ok = await call('POST', 'verificar');
    expect(ok.body).toMatchObject({ resultado: 'granted', plano: 'pro', proAte: new Date(NOW.getTime() + 30 * DAY).toISOString() });
    // Compra já paga sai da lista: verificar de novo não consulta nem soma.
    expect((await call('POST', 'verificar')).body).toMatchObject({ resultado: 'none', plano: 'pro' });
  });

  it('verificar só olha as compras do próprio aluno', async () => {
    const payments: Record<string, MpPayment> = {};
    const { call, client } = setup(payments);
    await call('POST', 'checkout', { cycle: 'monthly' }, undefined, 'ok:u2');
    payments['902'] = { id: 902, status: 'approved', transaction_amount: 29.9, currency_id: 'BRL', external_reference: client.created[0]!.reference };
    expect((await call('POST', 'verificar')).body).toMatchObject({ resultado: 'none', plano: 'free' });
  });

  it('Mercado Pago fora do ar → 502; falha no nosso banco → 500 (não culpa o Mercado Pago)', async () => {
    const { call, client, store } = setup();
    client.createPreference = async () => { throw new MercadoPagoError('HTTP 500', 500); };
    const mp = await call('POST', 'checkout', { cycle: 'monthly' });
    expect(mp.statusCode).toBe(502);
    expect(mp.body.code).toBe('MERCADO_PAGO_INDISPONIVEL');
    store.history = async () => { throw new Error('column "pro_until" does not exist'); };
    const db = await call('GET');
    expect(db.statusCode).toBe(500);
    expect(db.body.error).not.toMatch(/Mercado Pago/);
  });
});

describe('/api/pagamentos/webhook', () => {
  const setup = (payments: Record<string, MpPayment> = {}, secret: string | undefined = SECRET) => {
    const store = memoryPayments();
    const client = fakeClient(payments);
    const handler = createWebhookHandler({ store, client, secret });
    const call = async (query: Record<string, string>, headers: Record<string, string>, body: unknown = {}) => {
      const res = makeRes();
      await handler(makeReq({ method: 'POST', query, headers, body }), res);
      return res;
    };
    return { store, client, call };
  };

  it('assinatura válida: consulta e libera; repetido não soma', async () => {
    const { store, call } = setup({ '111': payment() });
    const headers = { 'x-signature': sign('111', 'r1'), 'x-request-id': 'r1' };
    const res = await call({ 'data.id': '111', type: 'payment' }, headers, { type: 'payment', data: { id: '111' } });
    expect(res.body).toMatchObject({ ok: true, resultado: 'granted' });
    await call({ 'data.id': '111', type: 'payment' }, headers);
    expect(store.rows.size).toBe(1);
  });

  it('pagamento aprovado pelo aviso marca a compra como paga', async () => {
    const reference = makeReference('monthly', 'u1');
    const { store, call } = setup({ '333': payment({ id: 333, external_reference: reference }) });
    await store.recordCheckout({ reference, userId: 'u1', cycle: 'monthly', now: NOW });
    await call({ 'data.id': '333', type: 'payment' }, { 'x-signature': sign('333', 'r3'), 'x-request-id': 'r3' });
    expect(store.checkouts.get(reference)?.paid).toBe(true);
    expect(await store.openCheckouts('u1', new Date(0), 5)).toEqual([]);
  });

  it('assinatura inválida → 401 e nada muda', async () => {
    const { store, call } = setup({ '111': payment() });
    const res = await call({ 'data.id': '111', type: 'payment' }, { 'x-signature': sign('111', 'r1', '1', 'chute'), 'x-request-id': 'r1' });
    expect(res.statusCode).toBe(401);
    expect(store.pro.size).toBe(0);
  });

  it('outros tipos e pagamento inexistente (ex.: "Simular notificação" do painel) → 200 ignorado; falha ao consultar → 500 (o Mercado Pago tenta de novo)', async () => {
    const { call, client } = setup({});
    expect((await call({ 'data.id': '5', type: 'merchant_order' }, { 'x-signature': sign('5', 'r'), 'x-request-id': 'r' })).body).toMatchObject({ ignored: true });
    const missing = await call({ 'data.id': '404', type: 'payment' }, { 'x-signature': sign('404', 'r'), 'x-request-id': 'r' });
    expect(missing.statusCode).toBe(200);
    expect(missing.body).toMatchObject({ ok: true, ignored: true });
    client.getPayment = async () => { throw new MercadoPagoError('HTTP 500', 500); };
    expect((await call({ 'data.id': '405', type: 'payment' }, { 'x-signature': sign('405', 'r'), 'x-request-id': 'r' })).statusCode).toBe(500);
  });

  it('sem segredo configurado → 503', async () => {
    const { call } = setup({}, '');
    expect((await call({ 'data.id': '1', type: 'payment' }, {})).statusCode).toBe(503);
  });
});
