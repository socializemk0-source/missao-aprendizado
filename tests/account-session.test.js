import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadClient } from './fixtures/browser-module.js';

test('missing configuration exposes a usable guest API and an explicit login error', async () => {
  const { api } = await loadClient({ configured:false });
  assert.equal((await api.loginGuest()).isGuest, true);
  await assert.rejects(api.loginWithEmail('a@example.com','password'), /indisponível/i);
});
test('signup requiring email confirmation is a pending success, not an exception', async () => {
  const { api } = await loadClient({ signup:{ user:{id:'A',identities:[{}]}, session:null } });
  const result = await api.registerUser({ name:'Aluno A',email:'a@example.com',password:'12345678',whatsapp:'11999999999',cidade:'Recife' });
  assert.equal(result.confirmationRequired,true);
});
test('backend profile failure does not cache a fake free-plan user', async () => {
  const { api, values } = await loadClient({ profileStatus:503 });
  await assert.rejects(api.loginWithEmail('a@example.com','password'), /Perfil indisponível/);
  assert.equal(values.has('missao_aprovacao_auth_user'),false);
});
test('expired session clears stale identity instead of redirecting based on cache', async () => {
  const { api } = await loadClient({ initial:{ missao_aprovacao_auth_user:JSON.stringify({uid:'A',plan:'pro'}) } });
  assert.equal(api.getCurrentUser(),null);
});
test('auth event listener never waits for session API while inside the SDK callback', async () => {
  const { api, listener } = await loadClient();
  api.subscribeAuth(()=>{});
  const result = listener()('SIGNED_IN',{user:{id:'A'},access_token:'test'});
  assert.equal(result,undefined);
});
test('password recovery returns to the dedicated recovery page', async () => {
  const { api, calls } = await loadClient();
  await api.requestPasswordReset('a@example.com');
  assert.equal(calls.find(c=>c[0]==='reset')[2].redirectTo,'http://localhost:3000/recuperar-senha');
});
