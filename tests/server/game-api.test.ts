import { describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game.js';
import { questao } from '../../content/trilha.js';
import { memoryGameStore } from '../../server/game-memory.js';
import { LIMITES, memoryLimiter } from '../../server/limite.js';
import { memoryMarketing } from '../../server/marketing.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

function setup() {
  const store = memoryGameStore();
  const handler = createGameHandler({ verifyToken: fakeVerify, store });
  const call = async (method: string, action: string, extra: { query?: Record<string, string>; body?: unknown; token?: string } = {}) => {
    const res = makeRes();
    await handler(makeReq({ method, query: { action, ...(extra.query ?? {}) }, body: extra.body, token: extra.token ?? 'ok:u1' }), res);
    return res;
  };
  return { store, call };
}

describe('/api/game', () => {
  it('sem login → 401', async () => {
    const { call } = setup();
    expect((await call('GET', 'trilha', { token: 'forjado' })).statusCode).toBe(401);
  });

  it('trilha e fase: fase aberta vem sem gabarito; bloqueada → 403 com código', async () => {
    const { call } = setup();
    const trail = await call('GET', 'trilha');
    expect(trail.statusCode).toBe(200);
    expect(trail.body.capitulos).toHaveLength(11);
    expect(trail.body.progress).toMatchObject({ xp: 0, hearts: 5 });
    const ok = await call('GET', 'fase', { query: { id: 'fase-01-1' } });
    expect(ok.body.questoes[0]).not.toHaveProperty('correta');
    const blocked = await call('GET', 'fase', { query: { id: 'fase-01-2' } });
    expect([blocked.statusCode, blocked.body.code]).toEqual([403, 'FASE_BLOQUEADA']);
  });

  it('responder devolve gabarito, explicação e progresso; corpo inválido → 400', async () => {
    const { call } = setup();
    const q = 'pt-acent-1';
    const res = await call('POST', 'responder', { body: { questionId: q, choice: questao(q)!.correta, mode: 'trilha' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ correct: true, xpGanho: 10, progress: { xp: 10 } });
    for (const body of [{ questionId: q, choice: '1', mode: 'trilha' }, { questionId: q, choice: 1, mode: 'turbo' }, null]) {
      expect((await call('POST', 'responder', { body })).statusCode).toBe(400);
    }
  });

  it('sem vidas → 403 SEM_VIDAS com a hora da próxima vida', async () => {
    const { call } = setup();
    const q = 'pt-acent-1';
    const wrong = (questao(q)!.correta + 1) % 4;
    for (let i = 0; i < 5; i++) await call('POST', 'responder', { body: { questionId: q, choice: wrong, mode: 'trilha' } });
    const res = await call('POST', 'responder', { body: { questionId: q, choice: wrong, mode: 'trilha' } });
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('SEM_VIDAS');
    expect(typeof res.body.nextHeartAt).toBe('string');
  });

  it('ação desconhecida → 400; outros métodos → 405', async () => {
    const { call } = setup();
    expect((await call('GET', 'hackear')).statusCode).toBe(400);
    expect((await call('DELETE', 'trilha')).statusCode).toBe(405);
  });
});

describe('/api/game — simulado', () => {
  it('opções, iniciar (sem gabarito), entregar, ver; erros com código', async () => {
    const { call } = setup();
    const opts = await call('GET', 'simulados');
    expect(opts.body).toMatchObject({ limite: { plano: 'free', porDia: 1, usadosHoje: 0 }, aberto: null });
    expect((await call('POST', 'simulado-iniciar', { body: { nivel: 'x', disciplinas: ['rlm'], quantidade: 10 } })).statusCode).toBe(400);
    const start = await call('POST', 'simulado-iniciar', { body: { nivel: 'misto', disciplinas: ['portugues', 'rlm'], quantidade: 10, cronometro: true } });
    expect(start.statusCode).toBe(200);
    expect(start.body.questoes).toHaveLength(10);
    expect(start.body.questoes[0]).not.toHaveProperty('correta');
    const again = await call('POST', 'simulado-iniciar', { body: { nivel: 'misto', disciplinas: ['rlm'], quantidade: 5 } });
    expect([again.statusCode, again.body.code, again.body.id]).toEqual([409, 'SIMULADO_ABERTO', start.body.id]);
    const done = await call('POST', 'simulado-entregar', { body: { id: start.body.id, respostas: {} } });
    expect(done.body.resultado).toMatchObject({ total: 10, respondidas: 0, acertos: 0 });
    const view = await call('GET', 'simulado', { query: { id: start.body.id } });
    expect(view.body.estado).toBe('entregue');
    const limit = await call('POST', 'simulado-iniciar', { body: { nivel: 'misto', disciplinas: ['rlm'], quantidade: 5 } });
    expect([limit.statusCode, limit.body.code]).toEqual([403, 'LIMITE_SIMULADO']);
    expect((await call('GET', 'simulado', { query: { id: start.body.id }, token: 'ok:u2' })).statusCode).toBe(404);
    expect((await call('POST', 'simulado-entregar', { body: { id: start.body.id } })).statusCode).toBe(400);
  });
});

describe('/api/game — jogos', () => {
  it('resumo, iniciar (sem gabarito), jogar, terminar; erros com código', async () => {
    const { call } = setup();
    const hub = await call('GET', 'jogos');
    expect(hub.statusCode).toBe(200);
    expect(hub.body.jogos.map((j: { tipo: string }) => j.tipo)).toEqual(['radar', 'memoria', 'caca', 'cruzadinha']);
    expect((await call('POST', 'jogo-iniciar', { body: { tipo: 'xadrez' } })).body.code).toBe('ACAO_INVALIDA');
    const start = await call('POST', 'jogo-iniciar', { body: { tipo: 'radar', disciplina: 'rlm' } });
    expect(start.statusCode).toBe(200);
    expect(start.body.itens[0]).not.toHaveProperty('certo');
    expect(start.body.itens[0]).not.toHaveProperty('explicacao');
    const jogada = await call('POST', 'jogo-jogada', { body: { id: start.body.id, indice: 0, resposta: true } });
    expect(jogada.statusCode).toBe(200);
    expect(jogada.body).toHaveProperty('explicacao');
    expect((await call('POST', 'jogo-jogada', { body: { indice: 0 } })).statusCode).toBe(400);
    expect((await call('POST', 'jogo-jogada', { body: { id: start.body.id, indice: 0, resposta: true }, token: 'ok:u2' })).statusCode).toBe(404);
    const fim = await call('POST', 'jogo-terminar', { body: { id: start.body.id } });
    expect(fim.body).toMatchObject({ completo: false, xpGanho: 0 });
    const again = await call('POST', 'jogo-terminar', { body: { id: start.body.id } });
    expect([again.statusCode, again.body.code]).toEqual([409, 'JOGO_ENCERRADO']);
    expect((await call('POST', 'jogo-iniciar', { body: { tipo: 'cruzadinha' } })).body.pistas[0]).not.toHaveProperty('resposta');
  });
});

describe('/api/game — plano de estudos', () => {
  const perfil = { prova: 'INSS — Técnico', banca: 'Cebraspe', dataProva: null, minutosDia: 30, nivel: 'iniciante', disciplinas: ['portugues', 'rlm'] };

  it('antes do onboarding o plano vem "não configurado"; salvar valida e devolve o plano', async () => {
    const { call } = setup();
    expect((await call('GET', 'plano')).body).toEqual({ configurado: false });

    const bad = await call('POST', 'plano-salvar', { body: { ...perfil, minutosDia: 7 } });
    expect([bad.statusCode, bad.body.code]).toEqual([400, 'ACAO_INVALIDA']);
    expect(bad.body.error).toMatch(/tempo/);
    expect((await call('GET', 'plano')).body).toEqual({ configurado: false });

    const ok = await call('POST', 'plano-salvar', { body: perfil });
    expect(ok.statusCode).toBe(200);
    expect(ok.body).toMatchObject({ configurado: true, perfil: { prova: 'INSS — Técnico', minutosDia: 30 }, metaQuestoes: 10 });
    const plano = await call('GET', 'plano');
    expect(plano.body.tarefas.map((t: { tipo: string }) => t.tipo)).toEqual(['trilha', 'praticar']);
  });

  it('o plano é de quem está logado: outro aluno não vê', async () => {
    const { call } = setup();
    await call('POST', 'plano-salvar', { body: perfil });
    expect((await call('GET', 'plano', { token: 'ok:u2' })).body).toEqual({ configurado: false });
  });

  it('disciplinas trazem o domínio por assunto; revisar traz a agenda', async () => {
    const { call } = setup();
    const q = 'pt-acent-1';
    await call('POST', 'responder', { body: { questionId: q, choice: (questao(q)!.correta + 1) % 2, mode: 'trilha' } });
    const d = await call('GET', 'disciplinas');
    expect(d.body.assuntos.find((a: { assunto: string }) => a.assunto === 'Acentuação gráfica')).toMatchObject({ respondidas: 1, score: 0, situacao: 'fraco' });
    const r = await call('GET', 'revisar');
    expect(r.body.agenda).toMatchObject({ hoje: 1 });
  });
});

describe('/api/game — limite de chamadas', () => {
  it('por aluno: passou do limite do minuto → 429; outro aluno segue normal', async () => {
    const handler = createGameHandler({ verifyToken: fakeVerify, store: memoryGameStore(), limiter: memoryLimiter(() => new Date('2026-10-02T12:00:00Z')) });
    const call = async (token: string, ip = '1.1.1.1') => {
      const res = makeRes();
      await handler(makeReq({ method: 'GET', query: { action: 'progresso' }, token, headers: { 'x-real-ip': ip } }), res);
      return res;
    };
    for (let i = 0; i < LIMITES.jogoPorMinuto; i++) expect((await call('ok:u1')).statusCode).toBe(200);
    const blocked = await call('ok:u1');
    expect([blocked.statusCode, blocked.body.code]).toEqual([429, 'MUITAS_TENTATIVAS']);
    expect((await call('ok:u2', '2.2.2.2')).statusCode).toBe(200);
  });

  it('por IP, antes do login: tokens falsos em massa param no limite', async () => {
    const handler = createGameHandler({ verifyToken: fakeVerify, store: memoryGameStore(), limiter: memoryLimiter(() => new Date('2026-10-02T12:00:00Z')) });
    const statuses: number[] = [];
    for (let i = 0; i <= LIMITES.ipPorMinuto; i++) {
      const res = makeRes();
      await handler(makeReq({ method: 'GET', query: { action: 'progresso' }, token: `falso-${i}`, headers: { 'x-real-ip': '6.6.6.6' } }), res);
      statuses.push(res.statusCode);
    }
    expect(statuses.slice(0, -1).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('/api/game — medição (registro próprio)', () => {
  const perfil = { prova: 'INSS — Técnico', banca: 'Cebraspe', dataProva: null, minutosDia: 30, nivel: 'iniciante', disciplinas: ['portugues', 'rlm'] };

  async function setupMedicao(medicao = memoryMarketing()) {
    const store = memoryGameStore();
    const handler = createGameHandler({ verifyToken: fakeVerify, store, medicao });
    const call = async (action: string, body: unknown) => {
      const res = makeRes();
      await handler(makeReq({ method: 'POST', query: { action }, body, token: 'ok:u1' }), res);
      return res;
    };
    return { medicao, call };
  }

  it('terminar o onboarding registra OnboardingCompleted uma vez só, com o consentimento do aluno', async () => {
    const { medicao, call } = await setupMedicao();
    await medicao.salvarConsentimento('u1', true, new Date());
    await call('plano-salvar', perfil);
    await call('plano-salvar', perfil); // ajustar o plano depois não conta de novo
    const ev = medicao.eventos.filter((e) => e.nome === 'OnboardingCompleted');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ userId: 'u1', consentimento: true, envio: { meta_pixel: 'pendente' } });
  });

  it('concluir a 1ª fase registra FirstPhaseCompleted uma vez só', async () => {
    const { medicao, call } = await setupMedicao();
    const { fase } = await import('../../content/trilha.js');
    for (const q of fase('fase-01-1')!.questoes) await call('responder', { questionId: q, choice: questao(q)!.correta, mode: 'trilha' });
    for (const q of fase('fase-01-2')!.questoes) await call('responder', { questionId: q, choice: questao(q)!.correta, mode: 'trilha' });
    const ev = medicao.eventos.filter((e) => e.nome === 'FirstPhaseCompleted');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ userId: 'u1', consentimento: false, envio: { meta_pixel: 'sem_consentimento' } });
  });

  it('se a medição falhar, o estudo segue igual', async () => {
    const quebrada = memoryMarketing();
    quebrada.registrar = async () => { throw new Error('banco fora'); };
    quebrada.consentimento = async () => { throw new Error('banco fora'); };
    const { call } = await setupMedicao(quebrada);
    expect((await call('plano-salvar', perfil)).statusCode).toBe(200);
    const q = 'pt-acent-1';
    expect((await call('responder', { questionId: q, choice: questao(q)!.correta, mode: 'trilha' })).statusCode).toBe(200);
  });
});
