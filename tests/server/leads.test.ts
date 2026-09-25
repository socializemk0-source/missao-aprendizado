import { describe, expect, it } from 'vitest';
import { createLeadsHandler } from '../../api/leads.js';
import type { LeadStore } from '../../server/leads.js';
import { makeReq, makeRes } from './helpers.js';

function setup() {
  const saved: { email: string; name: string | null; source: string }[] = [];
  const store: LeadStore = {
    async save(lead) {
      if (!saved.some((s) => s.email === lead.email)) saved.push(lead);
    },
  };
  let now = 0;
  const handler = createLeadsHandler({ store, now: () => now, limitPerMinute: 3 });
  const post = async (body: unknown, ip = '1.1.1.1') => {
    const res = makeRes();
    await handler(makeReq({ method: 'POST', body, headers: { 'x-forwarded-for': ip } }), res);
    return res;
  };
  return { saved, post, advance: (ms: number) => (now += ms) };
}

const valid = { email: '  Maria@Email.COM ', name: 'Maria', consent: true, source: 'landing' };

describe('POST /api/leads', () => {
  it('grava o e-mail normalizado com o consentimento', async () => {
    const { saved, post } = setup();
    const res = await post(valid);
    expect(res.statusCode).toBe(201);
    expect(saved).toEqual([{ email: 'maria@email.com', name: 'Maria', source: 'landing' }]);
  });

  it('sem consentimento (LGPD) ou com e-mail inválido → 400 e nada é gravado', async () => {
    const { saved, post } = setup();
    const invalid = [{ ...valid, consent: false }, { ...valid, consent: 'sim' }, { ...valid, email: 'maria' }, { ...valid, email: `${'a'.repeat(250)}@x.com` }, { ...valid, name: 'x'.repeat(61) }];
    for (const [i, body] of invalid.entries()) {
      expect((await post(body, `10.0.0.${i}`)).statusCode, JSON.stringify(body)).toBe(400);
    }
    expect(saved).toEqual([]);
  });

  it('e-mail repetido responde igual (não revela quem já está na lista)', async () => {
    const { saved, post } = setup();
    const a = await post(valid);
    const b = await post(valid, '2.2.2.2');
    expect([a.statusCode, b.statusCode]).toEqual([201, 201]);
    expect(saved).toHaveLength(1);
  });

  it('robô que preenche o campo escondido recebe "ok" mas não é gravado', async () => {
    const { saved, post } = setup();
    const res = await post({ ...valid, website: 'http://spam' });
    expect(res.statusCode).toBe(201);
    expect(saved).toEqual([]);
  });

  it('limite por IP: a partir do 4º envio no mesmo minuto → 429; depois de 1 minuto volta', async () => {
    const { post, advance } = setup();
    for (let i = 0; i < 3; i++) expect((await post({ ...valid, email: `a${i}@x.com` })).statusCode).toBe(201);
    expect((await post({ ...valid, email: 'a9@x.com' })).statusCode).toBe(429);
    expect((await post({ ...valid, email: 'b@x.com' }, '9.9.9.9')).statusCode).toBe(201);
    advance(61_000);
    expect((await post({ ...valid, email: 'c@x.com' })).statusCode).toBe(201);
  });

  it('outros métodos → 405', async () => {
    const { post } = setup();
    void post;
    const res = makeRes();
    await createLeadsHandler({ store: { save: async () => {} } })(makeReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });
});
