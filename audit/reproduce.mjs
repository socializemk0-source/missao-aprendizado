// Audit probes: these assertions confirm defects, not correct behavior.
// Only in-memory doubles are used; no real accounts, database or payments.
import { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, resetStore, buildNamedExports } from '../tests/fixtures/fake-db.js';
import { makeReq, makeRes } from '../tests/fixtures/http.js';
import { requireAuth } from '../tests/fixtures/fake-auth.js';

const store = createStore();
mock.module(new URL('../src/db/queries.js', import.meta.url).href, { namedExports: buildNamedExports(store) });
mock.module(new URL('../middleware/requireAuth.js', import.meta.url).href, { namedExports: { requireAuth } });
const { default: auth } = await import('../api/auth.js');
const { default: data } = await import('../api/data.js');
const { default: payments } = await import('../api/payments.js');
const headers = { authorization: 'Bearer TEST:user_A', host: 'localhost:3000', 'content-type': 'application/json' };
async function call(handler, body, deps, method = 'POST') {
  const res = makeRes();
  await handler(makeReq({ headers, body, method }), res, deps);
  assert.equal(res.statusCode, 200);
  return res.body;
}

await call(data, { action: 'save-stats', xp: 999999999, hearts: -50, streak: 99999 });
assert.equal(store.users.user_A.xp, 999999999);
assert.equal(store.users.user_A.hearts, -50);
console.log('CONFIRMED: server accepts invented XP, streak and negative hearts.');

resetStore(store);
await call(auth, { action: 'update-profile', preferredBanca: 'FGV' });
assert.equal(store.profiles.user_A.fullName, 'Estudante Concurseiro');
assert.equal(store.profiles.user_A.bio, '');
assert.equal(store.profiles.user_A.city, 'Brasil');
console.log('CONFIRMED: changing only banca overwrites name, bio and city.');

resetStore(store);
store.users.user_A.plan = 'pro';
store.users.user_A.xp = 1500;
await call(auth, { action: 'sync-profile', name: 'Aluno Teste', whatsapp: '11999999999', cidade: 'Sao Paulo' });
assert.equal(store.users.user_A.plan, 'free');
assert.equal(store.users.user_A.xp, 0);
console.log('CONFIRMED: repeating sync-profile resets PRO and XP.');

resetStore(store);
store.subscriptions.user_A = { userId: 'user_A', mpPreapprovalId: 'active_original', status: 'authorized' };
let created = 0;
const cancelled = [];
const mpClient = {
  createSubscription: async () => ({ id: `new_${++created}`, status: 'pending', init_point: 'https://example.invalid/test-only' }),
  cancelSubscription: async id => { cancelled.push(id); },
};
await call(payments, {}, { mpClient });
await call(payments, {}, { mpClient });
assert.equal(created, 2);
assert.equal(store.subscriptions.user_A.mpPreapprovalId, 'new_2');
await call(auth, { action: 'downgrade-to-free' }, { mpClient });
assert.deepEqual(cancelled, []);
console.log('CONFIRMED: repeated checkout replaces active subscription; downgrade cancels none when latest is pending.');

await call(payments, {}, { mpClient }, 'GET');
assert.equal(created, 3);
console.log('CONFIRMED: payment handler also creates subscription on GET (Vercel file route).');

resetStore(store);
process.env.OPENAI_API_KEY = 'audit-placeholder-no-network';
const { default: redacao } = await import('../api/redacao.js');
const report = {
  summary: 'Texto coerente e organizado.',
  criteria: [
    { id: 'tema', score: 15, reason: 'Atende ao tema.' },
    { id: 'argumentos', score: 20, reason: 'Argumentacao consistente.' },
    { id: 'organizacao', score: 15, reason: 'Boa estrutura.' },
    { id: 'linguagem', score: 25, reason: 'Linguagem clara.' },
  ],
  annotations: [], strengths: ['Tese clara.'], nextSteps: ['Revisar conclusao.'],
};
let aiCalls = 0;
let releaseBoth;
const bothStarted = new Promise(resolve => { releaseBoth = resolve; });
const send = async () => {
  if (++aiCalls === 2) releaseBoth();
  await bothStarted;
  return { ok: true, status: 200, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(report) }] }] }) };
};
async function essayProbe() {
  const res = makeRes();
  await redacao(makeReq({ headers, body: { topicId: 'digital', bank: 'Treino geral', text: 'A inclusao digital exige politicas publicas para garantir acesso e cidadania. '.repeat(10) } }), res, { send });
  return res.statusCode;
}
const concurrentStatuses = await Promise.all([essayProbe(), essayProbe()]);
assert.deepEqual(concurrentStatuses, [200, 200]);
assert.equal(aiCalls, 2);
console.log('CONFIRMED: two concurrent free-plan essay requests both invoke AI and succeed.');
