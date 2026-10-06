import { describe, expect, it } from 'vitest';
import { createEventosHandler } from '../../api/eventos.js';
import { memoryMarketing } from '../../server/marketing.js';
import { memoryLimiter } from '../../server/limite.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

const T0 = new Date('2026-10-06T12:00:00Z');

function setup(opts: { limiter?: ReturnType<typeof memoryLimiter> } = {}) {
  const store = memoryMarketing();
  let agora = T0;
  const handler = createEventosHandler({ verifyToken: fakeVerify, store, limiter: opts.limiter ?? null, now: () => agora });
  const post = async (body: unknown, token?: string) => {
    const res = makeRes();
    await handler(makeReq({ method: 'POST', body, token }), res);
    return res;
  };
  return { store, post, avancar: (ms: number) => { agora = new Date(agora.getTime() + ms); } };
}

describe('POST /api/eventos — consentimento', () => {
  it('só aceita POST', async () => {
    const { store } = setup();
    const res = makeRes();
    await createEventosHandler({ verifyToken: fakeVerify, store })(makeReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });

  it('com login, grava aceite e data no aluno do token', async () => {
    const { store, post } = setup();
    const res = await post({ consentimento: true }, 'ok:u1');
    expect(res.statusCode).toBe(200);
    expect(store.usuarios.get('u1')).toEqual({ consentimento: true, consentimentoEm: T0 });
  });

  it('revogar troca para "não" com a data nova; repetir a mesma escolha não muda a data', async () => {
    const { store, post, avancar } = setup();
    await post({ consentimento: true }, 'ok:u1');
    avancar(60_000);
    await post({ consentimento: true }, 'ok:u1');
    expect(store.usuarios.get('u1')!.consentimentoEm).toEqual(T0);
    avancar(60_000);
    await post({ consentimento: false }, 'ok:u1');
    expect(store.usuarios.get('u1')).toEqual({ consentimento: false, consentimentoEm: new Date(T0.getTime() + 120_000) });
    expect(await store.consentimento('u1')).toBe(false);
  });

  it('sem login (ou token inválido) não grava nada em ninguém, mas responde 200', async () => {
    const { store, post } = setup();
    expect((await post({ consentimento: true })).statusCode).toBe(200);
    expect((await post({ consentimento: true }, 'forjado')).statusCode).toBe(200);
    expect(store.usuarios.size).toBe(0);
  });

  it('o aluno vem só do token: um id no corpo é ignorado', async () => {
    const { store, post } = setup();
    await post({ consentimento: true, userId: 'outro' }, 'ok:u1');
    expect([...store.usuarios.keys()]).toEqual(['u1']);
  });

  it('valor que não é sim/não não grava', async () => {
    const { store, post } = setup();
    await post({ consentimento: 'sim' }, 'ok:u1');
    expect(store.usuarios.size).toBe(0);
  });

  it('erro no banco → 500, sem derrubar nada', async () => {
    const store = memoryMarketing();
    store.salvarConsentimento = async () => { throw new Error('banco fora'); };
    const res = makeRes();
    await createEventosHandler({ verifyToken: fakeVerify, store })(makeReq({ method: 'POST', body: { consentimento: true }, token: 'ok:u1' }), res);
    expect(res.statusCode).toBe(500);
  });

  it('limite por aluno', async () => {
    const { post } = setup({ limiter: memoryLimiter(() => T0) });
    let ultimo = 200;
    for (let i = 0; i < 61; i++) ultimo = (await post({ consentimento: true }, 'ok:u1')).statusCode;
    expect(ultimo).toBe(429);
  });
});
