import { describe, expect, it } from 'vitest';
import { createLeadsHandler } from '../../api/leads.js';
import type { LeadStore } from '../../server/leads.js';
import { memoryMarketing } from '../../server/marketing.js';
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

describe('POST /api/leads — medição', () => {
  async function postCom(medicao: ReturnType<typeof memoryMarketing>, body: unknown) {
    const store: LeadStore = { async save() {} };
    const res = makeRes();
    await createLeadsHandler({ store, medicao })(makeReq({ method: 'POST', body, headers: { 'x-forwarded-for': '2.2.2.2' } }), res);
    return res;
  }

  it('registra o Lead com o mesmo event_id do pixel, a origem e o aceite dos cookies', async () => {
    const medicao = memoryMarketing();
    const res = await postCom(medicao, { ...valid, eventId: 'lead-evento-01', consentimentoCookies: true, origem: { utm_source: 'instagram', utm_medium: 'organico' } });
    expect(res.statusCode).toBe(201);
    expect(medicao.eventos).toHaveLength(1);
    expect(medicao.eventos[0]).toMatchObject({ nome: 'Lead', eventId: 'lead-evento-01', userId: null, consentimento: true, envio: { meta_pixel: 'navegador' }, origem: { utm_source: 'instagram' } });
  });

  it('sem aceite fica marcado; e-mail nunca vai para o registro de eventos', async () => {
    const medicao = memoryMarketing();
    await postCom(medicao, valid);
    expect(medicao.eventos[0]).toMatchObject({ nome: 'Lead', consentimento: false, envio: { meta_pixel: 'sem_consentimento' } });
    expect(JSON.stringify(medicao.eventos)).not.toContain('maria');
  });

  it('erro na medição não impede a inscrição', async () => {
    const medicao = memoryMarketing();
    medicao.registrar = async () => { throw new Error('banco fora'); };
    expect((await postCom(medicao, valid)).statusCode).toBe(201);
  });
});
