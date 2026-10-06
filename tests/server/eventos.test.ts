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

describe('POST /api/eventos — registro próprio e origem', () => {
  const origem = { utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: 'cadastro_medio-adm_202610', utm_content: 'c001-cronograma-v1', fbclid: 'IwAR0abc', pagina: '/', em: '2026-10-05T10:00:00.000Z' };
  const pv = (eventId: string, pagina = '/') => ({ nome: 'PageView', eventId, dados: { pagina } });

  it('visitante sem aceite: o evento entra no registro próprio, marcado "sem consentimento", com a origem', async () => {
    const { store, post } = setup();
    const res = await post({ consentimento: null, origem, eventos: [pv('evento-0001')] });
    expect(res.body).toEqual({ pendentes: [] });
    expect(store.eventos).toHaveLength(1);
    expect(store.eventos[0]).toMatchObject({ nome: 'PageView', eventId: 'evento-0001', userId: null, consentimento: false, envio: { meta_pixel: 'sem_consentimento' }, dados: { pagina: '/' } });
    expect(store.eventos[0]!.origem).toMatchObject({ utm_source: 'meta', utm_content: 'c001-cronograma-v1', fbclid: 'IwAR0abc' });
  });

  it('com aceite, o evento fica marcado como enviado pelo navegador', async () => {
    const { store, post } = setup();
    await post({ consentimento: true, eventos: [{ nome: 'DemoQuestionAnswered', eventId: 'evento-0002', dados: { acertou: 'sim' } }] });
    expect(store.eventos[0]).toMatchObject({ consentimento: true, envio: { meta_pixel: 'navegador' }, dados: { acertou: 'sim' } });
  });

  it('só eventos e dados conhecidos; event_id repetido não duplica', async () => {
    const { store, post } = setup();
    await post({ eventos: [
      pv('evento-0003'), pv('evento-0003'),
      { nome: 'Purchase', eventId: 'evento-0004' }, // compra só pelo servidor (fase B)
      { nome: 'PageView', eventId: 'curto' },
      { nome: 'DemoQuestionAnswered', eventId: 'evento-0005', dados: { acertou: 'talvez' } },
      { nome: 'ViewContent', eventId: 'evento-0006', dados: { content_name: 'planos', extra: '<script>' } },
    ] });
    expect(store.eventos.map((e) => e.eventId)).toEqual(['evento-0003', 'evento-0006']);
    expect(store.eventos[1]!.dados).toEqual({ content_name: 'planos' });
  });

  it('InitiateCheckout: valor e moeda vêm da tabela de planos do servidor, não da tela', async () => {
    const { store, post } = setup();
    await post({ eventos: [{ nome: 'InitiateCheckout', eventId: 'evento-0007', dados: { plano: 'annual', valor: 1 } }] });
    expect(store.eventos[0]).toMatchObject({ valor: 239.9, moeda: 'BRL', dados: { plano: 'annual' } });
  });

  it('origem com caracteres estranhos é descartada', async () => {
    const { store, post } = setup();
    await post({ origem: { utm_source: '<script>alert(1)</script>' }, eventos: [pv('evento-0008')] });
    expect(store.eventos[0]!.origem).toBeNull();
  });

  it('cadastro novo: grava a primeira origem e um CompleteRegistration; com aceite, ele volta para o pixel uma vez só', async () => {
    const { store, post } = setup();
    const r1 = await post({ consentimento: true, origem, eventos: [pv('evento-0010', '/hoje')] }, 'ok:u1');
    expect(store.usuarios.get('u1')!.origem).toMatchObject({ utm_content: 'c001-cronograma-v1' });
    const cadastro = store.eventos.find((e) => e.nome === 'CompleteRegistration')!;
    expect(cadastro).toMatchObject({ userId: 'u1', consentimento: true });
    expect(cadastro.origem).toMatchObject({ utm_campaign: 'cadastro_medio-adm_202610' });
    expect(r1.body.pendentes).toEqual([{ nome: 'CompleteRegistration', eventId: cadastro.eventId, dados: {} }]);
    expect(cadastro.envio.meta_pixel).toBe('entregue_ao_navegador');
    // o PageView do aluno leva a origem do cadastro
    expect(store.eventos.find((e) => e.eventId === 'evento-0010')!.origem).toMatchObject({ utm_source: 'meta' });

    const r2 = await post({ consentimento: true, origem: { ...origem, utm_content: 'c999-outro' }, eventos: [pv('evento-0011', '/jogar')] }, 'ok:u1');
    expect(r2.body.pendentes).toEqual([]);
    expect(store.eventos.filter((e) => e.nome === 'CompleteRegistration')).toHaveLength(1);
    expect(store.usuarios.get('u1')!.origem!.utm_content).toBe('c001-cronograma-v1'); // a primeira origem não muda
  });

  it('cadastro sem aceite: CompleteRegistration fica só no registro próprio, nunca vai para o pixel', async () => {
    const { store, post } = setup();
    const r = await post({ consentimento: false }, 'ok:u1');
    expect(r.body.pendentes).toEqual([]);
    expect(store.eventos[0]).toMatchObject({ nome: 'CompleteRegistration', consentimento: false, envio: { meta_pixel: 'sem_consentimento' } });
    // aceitar depois não manda o que aconteceu antes do aceite
    expect((await post({ consentimento: true }, 'ok:u1')).body.pendentes).toEqual([]);
  });

  it('aluno antigo (perfil de mais de 2 dias): nem CompleteRegistration nem origem', async () => {
    const store = memoryMarketing({ perfisAntigos: ['u1'] });
    const handler = createEventosHandler({ verifyToken: fakeVerify, store, now: () => T0 });
    await handler(makeReq({ method: 'POST', body: { consentimento: true, origem }, token: 'ok:u1' }), makeRes());
    expect(store.eventos).toHaveLength(0);
    expect(store.usuarios.get('u1')!.origem).toBeUndefined();
  });

  it('revogou: eventos pendentes do servidor não vão mais para o pixel', async () => {
    const { store, post } = setup();
    await post({ consentimento: false }, 'ok:u1'); // escolha guardada antes
    await store.salvarConsentimento('u1', true, T0);
    store.eventos.length = 0;
    const { eventoDoAluno } = await import('../../server/marketing.js');
    await eventoDoAluno(store, 'u1', 'OnboardingCompleted', T0);
    expect((await post({ consentimento: false }, 'ok:u1')).body.pendentes).toEqual([]);
    expect(store.eventos.find((e) => e.nome === 'OnboardingCompleted')!.envio.meta_pixel).toBe('pendente');
  });

  it('erro ao gravar evento não derruba a resposta', async () => {
    const store = memoryMarketing();
    store.registrar = async () => { throw new Error('banco fora'); };
    const res = makeRes();
    await createEventosHandler({ verifyToken: fakeVerify, store })(makeReq({ method: 'POST', body: { eventos: [pv('evento-0020')] } }), res);
    expect(res.statusCode).toBe(200);
  });
});
