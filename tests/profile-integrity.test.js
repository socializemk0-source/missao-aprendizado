import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, resetStore, buildNamedExports } from './fixtures/fake-db.js';
import { makeReq, makeRes } from './fixtures/http.js';
import { requireAuth } from './fixtures/fake-auth.js';

const store = createStore();
mock.module(new URL('../src/db/queries.js', import.meta.url).href, { namedExports: buildNamedExports(store) });
mock.module(new URL('../middleware/requireAuth.js', import.meta.url).href, { namedExports: { requireAuth } });
const { default: handler } = await import('../api/auth.js');
beforeEach(() => resetStore(store));
async function request(body, method = 'POST') {
  const res = makeRes();
  await handler(makeReq({ method, body, headers: { authorization: 'Bearer TEST:user_A' } }), res);
  return res;
}

test('changing banca preserves unrelated profile fields', async () => {
  const res = await request({ action: 'update-profile', preferredBanca: 'FGV' });
  assert.equal(res.statusCode, 200);
  assert.equal(store.profiles.user_A.fullName, 'Aluno A');
  assert.equal(store.profiles.user_A.bio, 'bio original de A');
  assert.equal(store.profiles.user_A.city, 'Cidade A');
  assert.equal(store.profiles.user_A.preferredBanca, 'FGV');
  assert.equal(store.users.user_A.preferredBanca, 'FGV');
});

test('repeated registration sync preserves PRO, XP and custom profile', async () => {
  store.users.user_A.plan = 'pro';
  store.users.user_A.xp = 1500;
  const res = await request({ action: 'sync-profile', name: 'Outro Nome', whatsapp: '11999999999', cidade: 'Outra Cidade' });
  assert.equal(res.statusCode, 200);
  assert.equal(store.users.user_A.plan, 'pro');
  assert.equal(store.users.user_A.xp, 1500);
  assert.equal(store.profiles.user_A.bio, 'bio original de A');
});

test('name changes are reflected in both profile and user record', async () => {
  await request({ action: 'update-profile', fullName: 'Nome Novo' });
  assert.equal(store.users.user_A.name, 'Nome Novo');
  assert.equal(store.profiles.user_A.fullName, 'Nome Novo');
});

test('invalid profile fields fail before writing', async () => {
  const res = await request({ action: 'update-profile', fullName: { unexpected: true } });
  assert.equal(res.statusCode, 400);
  assert.equal(store.profiles.user_A.fullName, 'Aluno A');
});

test('profile mutation is refused on GET', async () => {
  const res = await request({ action: 'update-profile', fullName: 'Nome Novo' }, 'GET');
  assert.equal(res.statusCode, 405);
  assert.equal(store.profiles.user_A.fullName, 'Aluno A');
});
