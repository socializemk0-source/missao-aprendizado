// /api/game em lista fechada: ação desconhecida, parâmetros fora do tipo,
// replay da mesma Idempotency-Key, pedidos em paralelo, sem token e token de
// outra conta mexendo no que não é dela. Rotas de verdade, banco em memória.
import { describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game.js';
import { DISCIPLINAS, QUESTOES, fase, questao } from '../../content/trilha.js';
import { ACTIONS } from '../../server/actions.js';
import { studyDay } from '../../server/game.js';
import { memoryGameStore } from '../../server/game-memory.js';
import { memoryIdempotency } from '../../server/idempotencia.js';
import { LIMITES, memoryLimiter } from '../../server/limite.js';
import { XP_FIRST_CORRECT, XP_PHASE_BONUS } from '../../shared/game.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

const right = (id: string) => questao(id)!.correta;
const Q = 'pt-acent-1';
const FASE1 = fase('fase-01-1')!.questoes;

function setup(opts: { clock?: () => Date; limiter?: boolean } = {}) {
  const store = memoryGameStore({ clock: opts.clock });
  const idempotency = memoryIdempotency();
  const handler = createGameHandler({
    verifyToken: fakeVerify, store, idempotency,
    limiter: opts.limiter ? memoryLimiter(() => new Date('2026-10-02T12:00:00Z')) : null,
  });
  const call = async (method: string, action: string, extra: { query?: Record<string, string>; body?: unknown; token?: string | null; key?: string | null } = {}) => {
    const res = makeRes();
    const key = extra.key === undefined ? (method === 'POST' ? crypto.randomUUID() : null) : extra.key;
    await handler(makeReq({
      method, query: { action, ...(extra.query ?? {}) }, body: extra.body,
      token: extra.token === null ? undefined : extra.token ?? 'ok:u1',
      headers: key ? { 'idempotency-key': key } : {},
    }), res);
    return res;
  };
  const xp = async (token = 'ok:u1') => (await call('GET', 'progresso', { token })).body.xp as number;
  return { store, idempotency, call, xp };
}

describe('ações em lista fechada', () => {
  it('ação fora da lista → 400 unknown_action (inclusive nomes de propriedades do JavaScript)', async () => {
    const { call } = setup();
    for (const action of ['hackear', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'getProgress', 'answer', '', 'RESPONDER', 'responder ']) {
      for (const method of ['GET', 'POST']) {
        const res = await call(method, action, { body: {} });
        expect([action, res.statusCode, res.body.code]).toEqual([action, 400, 'unknown_action']);
      }
    }
  });

  it('ação desconhecida não chega a consultar o token nem o banco', async () => {
    let verificou = false;
    const handler = createGameHandler({
      verifyToken: async () => { verificou = true; return null; }, store: memoryGameStore(), limiter: null,
    });
    const res = makeRes();
    await handler(makeReq({ method: 'GET', query: { action: 'drop' }, token: 'ok:u1' }), res);
    expect([res.statusCode, res.body.code, verificou]).toEqual([400, 'unknown_action', false]);
  });

  it('ação conhecida no método errado → 405 com Allow', async () => {
    const { call } = setup();
    const a = await call('POST', 'trilha', { body: {} });
    expect([a.statusCode, a.headers.Allow]).toEqual([405, 'GET']);
    const b = await call('GET', 'responder', { query: { questionId: Q, choice: '0', mode: 'trilha' } });
    expect([b.statusCode, b.headers.Allow]).toEqual([405, 'POST']);
  });

  it('toda ação da lista exige login e todo POST exige Idempotency-Key', () => {
    for (const [nome, spec] of Object.entries(ACTIONS)) {
      expect([nome, spec.authRequired]).toEqual([nome, true]);
      expect([nome, spec.idempotent]).toEqual([nome, spec.method === 'POST']);
    }
  });

  it('nenhuma questão tem mais alternativas do que o schema aceita', () => {
    expect(Math.max(...QUESTOES.map((q) => q.alternativas.length))).toBeLessThanOrEqual(5);
  });
});

describe('parâmetros tipados', () => {
  it('responder: tipo, limites e enum errados → 400 invalid_params, sem gravar nada', async () => {
    const { call, store } = setup();
    const ruins: unknown[] = [
      { questionId: Q, choice: '1', mode: 'trilha' },
      { questionId: Q, choice: 1.5, mode: 'trilha' },
      { questionId: Q, choice: -1, mode: 'trilha' },
      { questionId: Q, choice: 5, mode: 'trilha' },
      { questionId: Q, choice: 0, mode: 'turbo' },
      { questionId: Q, choice: 0, mode: 'simulado' },
      { questionId: "x'; drop table v2.user_stats; --", choice: 0, mode: 'trilha' },
      { questionId: 'A'.repeat(65), choice: 0, mode: 'trilha' },
      { questionId: ['pt-acent-1'], choice: 0, mode: 'trilha' },
      { choice: 0, mode: 'trilha' },
      [Q, 0, 'trilha'],
      'nada',
    ];
    for (const body of ruins) {
      const res = await call('POST', 'responder', { body });
      expect([JSON.stringify(body), res.statusCode, res.body.code]).toEqual([JSON.stringify(body), 400, 'invalid_params']);
      expect(res.body.error).toBe('Envio inválido.');
    }
    expect(store.users.get('u1')?.answers ?? []).toHaveLength(0);
  });

  it('GET: id de fase fora da lista, disciplina fora do enum e id de simulado que não é uuid → 400', async () => {
    const { call } = setup();
    for (const [action, query] of [
      ['fase', { id: 'fase-99-9' }], ['fase', {}], ['pratica', { disciplina: 'astrologia' }],
      ['simulado', { id: '1 or 1=1' }], ['simulado', { id: '123' }],
    ] as const) {
      const res = await call('GET', action, { query });
      expect([action, res.statusCode, res.body.code]).toEqual([action, 400, 'invalid_params']);
    }
    expect((await call('GET', 'pratica', { query: { disciplina: DISCIPLINAS[0]!.id } })).statusCode).toBe(200);
  });

  it('simulado e jogos: quantidade fora da lista, banca fora do enum, jogada fora do formato → 400', async () => {
    const { call } = setup();
    for (const body of [
      { nivel: 'misto', disciplinas: ['rlm'], quantidade: 7 },
      { nivel: 'misto', disciplinas: ['rlm'], quantidade: 5, banca: 'Banca Inventada' },
      { nivel: 'misto', disciplinas: [], quantidade: 5 },
      { nivel: 'impossivel', disciplinas: ['rlm'], quantidade: 5 },
    ]) expect((await call('POST', 'simulado-iniciar', { body })).body.code).toBe('invalid_params');
    const start = await call('POST', 'jogo-iniciar', { body: { tipo: 'radar' } });
    for (const body of [
      { id: start.body.id, indice: 99, resposta: true },
      { id: start.body.id, indice: 0, resposta: 'sim' },
      { id: 'nao-e-uuid', indice: 0, resposta: true },
      { id: start.body.id, cartas: ['c0'] },
    ]) expect((await call('POST', 'jogo-jogada', { body })).body.code).toBe('invalid_params');
  });

  it('plano: a mensagem do campo errado vem em português', async () => {
    const { call } = setup();
    const res = await call('POST', 'plano-salvar', { body: { prova: 'INSS', minutosDia: 30, nivel: 'genio', disciplinas: ['rlm'] } });
    expect([res.statusCode, res.body.code, res.body.error]).toEqual([400, 'invalid_params', 'Escolha seu nível.']);
  });

  it('campos que a tela não pode mandar (xp, score, acertos, streak, horário) são descartados', async () => {
    const { call, xp } = setup();
    const res = await call('POST', 'responder', {
      body: { questionId: Q, choice: right(Q), mode: 'trilha', xp: 9999, xpGanho: 9999, score: 9999, acertos: 50, streak: 300, timestamp: '2020-01-01T00:00:00Z', now: 0 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.xpGanho).toBe(XP_FIRST_CORRECT);
    expect(res.body.progress.streak).toBe(1);
    expect(await xp()).toBe(XP_FIRST_CORRECT);
  });

  it('jogo-terminar ignora placar mandado pela tela (Memória: quem conta as jogadas é o servidor)', async () => {
    const { call } = setup();
    const start = await call('POST', 'jogo-iniciar', { body: { tipo: 'memoria' } });
    const fim = await call('POST', 'jogo-terminar', { body: { id: start.body.id, jogadas: 6, pontos: 1, xp: 500, completo: true } });
    expect(fim.body).toMatchObject({ completo: false, pontos: null, xpGanho: 0 });
  });

  it('a hora é a do servidor: o dia da resposta vem do relógio do banco, não do aparelho', async () => {
    const agora = new Date('2026-03-10T02:30:00Z'); // 23:30 do dia 9 em Brasília
    const { call, store } = setup({ clock: () => agora });
    await call('POST', 'responder', { body: { questionId: Q, choice: right(Q), mode: 'trilha', day: '2030-01-01' } });
    expect(store.users.get('u1')!.answers[0]!.day).toBe(studyDay(agora));
    expect(studyDay(agora)).toBe('2026-03-09');
  });
});

describe('idempotência e anti-replay', () => {
  it('sem Idempotency-Key (ou chave que não é uuid) → 400 idempotency_key_required', async () => {
    const { call, xp } = setup();
    for (const key of [null, 'abc', '12345', "'; drop table --"]) {
      const res = await call('POST', 'responder', { body: { questionId: Q, choice: right(Q), mode: 'trilha' }, key });
      expect([res.statusCode, res.body.code]).toEqual([400, 'idempotency_key_required']);
    }
    expect(await xp()).toBe(0);
  });

  it('replay da mesma chave devolve a mesma resposta, sem creditar XP de novo', async () => {
    const { call, xp, store } = setup();
    const key = crypto.randomUUID();
    const body = { questionId: Q, choice: right(Q), mode: 'trilha' };
    const first = await call('POST', 'responder', { body, key });
    expect(first.body.xpGanho).toBe(XP_FIRST_CORRECT);
    for (let i = 0; i < 3; i++) {
      const again = await call('POST', 'responder', { body, key: key.toUpperCase() });
      expect(again.statusCode).toBe(200);
      expect(again.body).toEqual(first.body);
      expect(again.headers['Idempotent-Replayed']).toBe('true');
    }
    expect(await xp()).toBe(XP_FIRST_CORRECT);
    expect(store.users.get('u1')!.answers).toHaveLength(1);
  });

  it('mesma chave com outro pedido → 422 idempotency_conflict', async () => {
    const { call } = setup();
    const key = crypto.randomUUID();
    await call('POST', 'responder', { body: { questionId: Q, choice: right(Q), mode: 'trilha' }, key });
    const other = await call('POST', 'responder', { body: { questionId: Q, choice: (right(Q) + 1) % 2, mode: 'trilha' }, key });
    expect([other.statusCode, other.body.code]).toEqual([422, 'idempotency_conflict']);
  });

  it('replay de missão resgatada: mesma resposta, XP da missão uma vez só', async () => {
    const { call, xp } = setup();
    for (const q of FASE1) await call('POST', 'responder', { body: { questionId: q, choice: right(q), mode: 'trilha' } });
    const antes = await xp();
    const key = crypto.randomUUID();
    const a = await call('POST', 'resgatar', { body: { missionId: 'concluir-fase' }, key });
    const b = await call('POST', 'resgatar', { body: { missionId: 'concluir-fase' }, key });
    expect(a.statusCode).toBe(200);
    expect(b.body).toEqual(a.body);
    expect(await xp()).toBe(antes + a.body.xpGanho);
    // Chave nova = tentativa nova: a regra da missão (uma por dia) responde.
    expect((await call('POST', 'resgatar', { body: { missionId: 'concluir-fase' } })).body.code).toBe('MISSAO_RESGATADA');
  });

  it('a chave é de cada aluno: a mesma chave em outra conta não devolve a resposta da primeira', async () => {
    const { call } = setup();
    const key = crypto.randomUUID();
    const body = { questionId: Q, choice: right(Q), mode: 'trilha' };
    const u1 = await call('POST', 'responder', { body, key });
    const u2 = await call('POST', 'responder', { body, key, token: 'ok:u2' });
    expect(u2.headers['Idempotent-Replayed']).toBeUndefined();
    expect(u2.body.progress.xp).toBe(XP_FIRST_CORRECT);
    expect(u1.body.progress.xp).toBe(XP_FIRST_CORRECT);
  });

  it('a chave vale 24 horas', async () => {
    let agora = new Date('2026-10-02T12:00:00Z');
    const { call, xp } = setup({ clock: () => agora });
    const key = crypto.randomUUID();
    const body = { questionId: Q, choice: right(Q), mode: 'trilha' };
    await call('POST', 'responder', { body, key });
    agora = new Date(agora.getTime() + 23 * 3600_000);
    expect((await call('POST', 'responder', { body, key })).headers['Idempotent-Replayed']).toBe('true');
    agora = new Date(agora.getTime() + 2 * 3600_000);
    expect((await call('POST', 'responder', { body, key })).headers['Idempotent-Replayed']).toBeUndefined();
    expect(await xp()).toBe(XP_FIRST_CORRECT); // a regra do jogo também não paga a mesma questão duas vezes
  });

  it('erro do servidor libera a chave para tentar de novo', async () => {
    const { call, store, xp } = setup();
    const original = store.withUser.bind(store);
    let falhar = true;
    store.withUser = (async (userId: string, fn: never) => {
      if (falhar) { falhar = false; throw new Error('banco fora do ar'); }
      return original(userId, fn);
    }) as typeof store.withUser;
    const key = crypto.randomUUID();
    const body = { questionId: Q, choice: right(Q), mode: 'trilha' };
    expect((await call('POST', 'responder', { body, key })).statusCode).toBe(500);
    const retry = await call('POST', 'responder', { body, key });
    expect([retry.statusCode, retry.body.xpGanho]).toEqual([200, XP_FIRST_CORRECT]);
    expect(await xp()).toBe(XP_FIRST_CORRECT);
  });
});

describe('concorrência: 20 pedidos em paralelo da mesma conta', () => {
  it('20 respostas certas (chaves diferentes) às questões de uma fase: XP = tentativas que valem', async () => {
    const { call, xp } = setup();
    const pedidos = Array.from({ length: 20 }, (_, i) => FASE1[i % FASE1.length]!);
    const results = await Promise.all(pedidos.map((q) => call('POST', 'responder', { body: { questionId: q, choice: right(q), mode: 'trilha' } })));
    expect(results.every((r) => r.statusCode === 200)).toBe(true);
    const esperado = FASE1.length * XP_FIRST_CORRECT + XP_PHASE_BONUS; // 1ª resposta certa de cada questão + bônus da fase
    expect(results.reduce((s, r) => s + r.body.xpGanho, 0)).toBe(esperado);
    expect(await xp()).toBe(esperado);
  });

  it('20 envios com a MESMA chave: credita uma vez; os outros repetem a resposta ou esperam', async () => {
    const { call, xp, store } = setup();
    const key = crypto.randomUUID();
    const body = { questionId: Q, choice: right(Q), mode: 'trilha' };
    const results = await Promise.all(Array.from({ length: 20 }, () => call('POST', 'responder', { body, key })));
    const ok = results.filter((r) => r.statusCode === 200);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.statusCode === 200 || r.body.code === 'idempotency_in_progress')).toBe(true);
    expect(ok.every((r) => r.body.xpGanho === XP_FIRST_CORRECT)).toBe(true); // repetições trazem a mesma resposta
    expect(await xp()).toBe(XP_FIRST_CORRECT);
    expect(store.users.get('u1')!.answers).toHaveLength(1);
  });

  it('20 resgates da mesma missão em paralelo: um só paga', async () => {
    const { call, xp } = setup();
    for (const q of FASE1) await call('POST', 'responder', { body: { questionId: q, choice: right(q), mode: 'trilha' } });
    const antes = await xp();
    const results = await Promise.all(Array.from({ length: 20 }, () => call('POST', 'resgatar', { body: { missionId: 'concluir-fase' } })));
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect(results.filter((r) => r.body.code === 'MISSAO_RESGATADA')).toHaveLength(19);
    expect(await xp()).toBe(antes + 25);
  });
});

describe('login e dono do recurso', () => {
  it('sem token (ou token inválido) → 401 em leitura e em escrita', async () => {
    const { call } = setup();
    for (const token of [null, 'forjado']) {
      expect((await call('GET', 'trilha', { token })).statusCode).toBe(401);
      expect((await call('POST', 'responder', { body: { questionId: Q, choice: 0, mode: 'trilha' }, token })).statusCode).toBe(401);
    }
  });

  it('o id do aluno vem só do token: user_id no corpo ou na URL é ignorado', async () => {
    const { call, xp } = setup();
    await call('POST', 'responder', { body: { questionId: Q, choice: right(Q), mode: 'trilha', userId: 'u2', user_id: 'u2' }, query: { userId: 'u2' } });
    expect(await xp('ok:u1')).toBe(XP_FIRST_CORRECT);
    expect(await xp('ok:u2')).toBe(0);
  });

  it('token de outra conta não vê nem mexe no simulado e na rodada de jogo alheios', async () => {
    const { call, store } = setup();
    const sim = await call('POST', 'simulado-iniciar', { body: { nivel: 'misto', disciplinas: ['portugues', 'rlm'], quantidade: 5 } });
    expect(sim.statusCode).toBe(200);
    const respostas = Object.fromEntries(sim.body.questoes.map((q: { id: string }) => [q.id, 0]));
    expect((await call('GET', 'simulado', { query: { id: sim.body.id }, token: 'ok:u2' })).statusCode).toBe(404);
    const roubo = await call('POST', 'simulado-entregar', { body: { id: sim.body.id, respostas }, token: 'ok:u2' });
    expect([roubo.statusCode, roubo.body.code]).toEqual([404, 'SIMULADO_INEXISTENTE']);
    expect(store.users.get('u1')!.simulados[0]!.finishedAt).toBeNull();

    const jogo = await call('POST', 'jogo-iniciar', { body: { tipo: 'radar' } });
    for (const [action, body] of [['jogo-jogada', { id: jogo.body.id, indice: 0, resposta: true }], ['jogo-terminar', { id: jogo.body.id }]] as const) {
      const res = await call('POST', action, { body, token: 'ok:u2' });
      expect([action, res.statusCode, res.body.code]).toEqual([action, 404, 'JOGO_INEXISTENTE']);
    }
    expect(store.users.get('u1')!.rounds[0]!.finishedAt).toBeNull();
    // O dono continua jogando normalmente.
    expect((await call('POST', 'jogo-terminar', { body: { id: jogo.body.id } })).statusCode).toBe(200);
  });
});

describe('limite por aluno, por tipo de ação', () => {
  it(`respostas: ${LIMITES.jogoRespostaPorMinuto}/min → 429 rate_limited com Retry-After; leitura segue no seu balde`, async () => {
    const { call } = setup({ limiter: true });
    for (let i = 0; i < LIMITES.jogoRespostaPorMinuto; i++) {
      expect((await call('POST', 'responder', { body: { questionId: Q, choice: right(Q), mode: 'revisar' } })).statusCode).not.toBe(429);
    }
    const blocked = await call('POST', 'responder', { body: { questionId: Q, choice: right(Q), mode: 'trilha' } });
    expect([blocked.statusCode, blocked.body.code]).toEqual([429, 'rate_limited']);
    expect(Number(blocked.headers['Retry-After'])).toBeGreaterThan(0);
    expect((await call('GET', 'trilha')).statusCode).toBe(200);
    expect((await call('POST', 'responder', { body: { questionId: Q, choice: right(Q), mode: 'trilha' }, token: 'ok:u2' })).statusCode).toBe(200);
  });
});

describe('CAPTCHA em toda ação de escrita', () => {
  function comCaptcha(resposta: 'ok' | 'indisponivel' = 'ok') {
    const store = memoryGameStore();
    const vistos: unknown[] = [];
    const handler = createGameHandler({
      verifyToken: fakeVerify, store, limiter: null, idempotency: memoryIdempotency(),
      turnstile: async (token, o) => {
        vistos.push([token, o.uso]);
        if (resposta === 'indisponivel') return { ok: false, hostname: null, action: null, motivo: 'indisponivel' };
        // Cada token vale uma vez (como a siteverify).
        const usado = vistos.filter((v) => (v as unknown[])[0] === token).length > 1;
        return typeof token === 'string' && token.startsWith('tok-') && !usado
          ? { ok: true, hostname: 'www.aprovatico.com.br', action: 'game' }
          : { ok: false, hostname: null, action: null, motivo: 'recusado' };
      },
    });
    const call = async (method: string, action: string, body?: unknown, extra: { key?: string; token?: string } = {}) => {
      const res = makeRes();
      const headers: Record<string, string> = {};
      if (method === 'POST') headers['idempotency-key'] = extra.key ?? crypto.randomUUID();
      if (extra.token) headers['x-turnstile-token'] = extra.token;
      await handler(makeReq({ method, query: { action }, body, token: 'ok:u1', headers }), res);
      return res;
    };
    return { call, vistos, store };
  }
  const body = { questionId: Q, choice: right(Q), mode: 'trilha' };

  it('toda ação POST da lista exige o token; leituras não pedem', async () => {
    const { call, vistos, store } = comCaptcha();
    const id = crypto.randomUUID();
    const validos: Record<string, unknown> = {
      responder: body,
      resgatar: { missionId: 'responder-10' },
      'simulado-iniciar': { nivel: 'misto', disciplinas: ['rlm'], quantidade: 5 },
      'simulado-entregar': { id, respostas: {} },
      'jogo-iniciar': { tipo: 'radar' },
      'jogo-jogada': { id, indice: 0, resposta: true },
      'jogo-terminar': { id },
      'plano-salvar': { prova: 'INSS', minutosDia: 30, nivel: 'iniciante', disciplinas: ['rlm'] },
    };
    const escritas = Object.entries(ACTIONS).filter(([, spec]) => spec.method === 'POST').map(([nome]) => nome);
    expect(Object.keys(validos).sort()).toEqual(escritas.sort());
    for (const [nome, corpo] of Object.entries(validos)) {
      const res = await call('POST', nome, corpo);
      expect([nome, res.statusCode, res.body.code]).toEqual([nome, 400, 'captcha_invalido']);
    }
    expect(vistos).toHaveLength(escritas.length);
    expect(vistos.every((v) => (v as unknown[])[1] === 'jogo')).toBe(true);
    expect(store.users.get('u1')?.simulados ?? []).toHaveLength(0);
    for (const action of ['trilha', 'progresso', 'missoes', 'jogos']) expect((await call('GET', action)).statusCode).toBe(200);
    expect(vistos).toHaveLength(escritas.length); // leituras não chamaram a verificação
  });

  it('com token: passa; o mesmo token de novo (outra tentativa) é recusado e nada é creditado', async () => {
    const { call, store } = comCaptcha();
    expect((await call('POST', 'responder', body, { token: 'tok-1' })).statusCode).toBe(200);
    const reuso = await call('POST', 'responder', { ...body, mode: 'revisar' }, { token: 'tok-1' });
    expect([reuso.statusCode, reuso.body.code]).toEqual([400, 'captcha_invalido']);
    expect(store.users.get('u1')!.answers).toHaveLength(1);
  });

  it('replay da mesma Idempotency-Key devolve a resposta guardada sem gastar token', async () => {
    const { call, vistos } = comCaptcha();
    const key = crypto.randomUUID();
    const a = await call('POST', 'responder', body, { key, token: 'tok-a' });
    const b = await call('POST', 'responder', body, { key });
    expect(b.body).toEqual(a.body);
    expect(b.headers['Idempotent-Replayed']).toBe('true');
    expect(vistos).toHaveLength(1);
  });

  it('CAPTCHA recusado libera a chave: a tela tenta de novo com um token NOVO e passa', async () => {
    const { call } = comCaptcha();
    const key = crypto.randomUUID();
    expect((await call('POST', 'responder', body, { key, token: 'ruim' })).body.code).toBe('captcha_invalido');
    const de_novo = await call('POST', 'responder', body, { key, token: 'tok-novo' });
    expect([de_novo.statusCode, de_novo.body.xpGanho]).toEqual([200, XP_FIRST_CORRECT]);
  });

  it('Cloudflare fora do ar: escrita bloqueada (503), leitura segue', async () => {
    const { call, store } = comCaptcha('indisponivel');
    const res = await call('POST', 'responder', body, { token: 'tok-1' });
    expect([res.statusCode, res.body.code]).toEqual([503, 'captcha_indisponivel']);
    expect(store.users.get('u1')?.answers ?? []).toHaveLength(0);
    expect((await call('GET', 'progresso')).statusCode).toBe(200);
  });
});
