// Cross-tenant: os alunos A e B; A tenta ler e mexer no que é do B por
// /api/me e /api/game, mandando os ids do B na URL e no corpo. Esperado: o
// que é do B dá 404 (não 403 — não confirma que existe), user_id vindo da
// tela é ignorado, e nada do B muda ou aparece nas respostas para o A.
// Roda com o banco em memória sempre e com o Postgres de verdade (PG_TEST=1).
import { describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game.js';
import { createMeHandler } from '../../api/me.js';
import { questao } from '../../content/trilha.js';
import type { ContaStore } from '../../server/conta.js';
import type { GameStore } from '../../server/game.js';
import { memoryGameStore } from '../../server/game-memory.js';
import { memoryIdempotency, type IdempotencyStore } from '../../server/idempotencia.js';
import type { ProfileStore } from '../../server/profiles.js';
import { fakeVerify, makeReq, makeRes, memoryProfiles } from './helpers.js';

interface Stores { game: GameStore; profiles: ProfileStore; conta: ContaStore; idempotency: IdempotencyStore }

function cenario(nome: string, stores: () => Promise<Stores>) {
  describe(nome, () => {
    it('A não lê, não altera e não apaga nada do B; o que é do B dá 404', async () => {
      const s = await stores();
      const A = crypto.randomUUID();
      const B = crypto.randomUUID();
      const logins: string[] = [];
      const me = createMeHandler({ verifyToken: fakeVerify, profiles: s.profiles, conta: s.conta, removerLogin: async (id) => { logins.push(id); } });
      const game = createGameHandler({ verifyToken: fakeVerify, store: s.game, limiter: null, idempotency: s.idempotency });
      const daA: string[] = []; // tudo o que o A recebeu
      const chamar = (handler: typeof me) => async (
        quem: string, method: string, opts: { query?: Record<string, string>; body?: unknown; key?: string } = {},
      ) => {
        const res = makeRes();
        const headers = method === 'POST' ? { 'idempotency-key': opts.key ?? crypto.randomUUID() } : undefined;
        await handler(makeReq({ method, query: opts.query ?? {}, body: opts.body, token: `ok:${quem}`, headers }), res);
        if (quem === A) daA.push(JSON.stringify(res.body ?? null));
        return res;
      };
      const apiMe = chamar(me);
      const apiGame = chamar(game);
      const q = 'pt-acent-1';

      // ---- B estuda: perfil, resposta, simulado, rodada de jogo, plano.
      expect((await apiMe(B, 'PATCH', { body: { displayName: 'Beatriz', city: 'Recife' } })).statusCode).toBe(200);
      const chaveB = crypto.randomUUID();
      expect((await apiGame(B, 'POST', { query: { action: 'responder' }, body: { questionId: q, choice: questao(q)!.correta, mode: 'trilha' }, key: chaveB })).statusCode).toBe(200);
      const sim = await apiGame(B, 'POST', { query: { action: 'simulado-iniciar' }, body: { nivel: 'misto', disciplinas: ['portugues', 'rlm'], quantidade: 5 } });
      expect(sim.statusCode).toBe(200);
      const respostas = Object.fromEntries(sim.body.questoes.map((x: { id: string }) => [x.id, 0]));
      const jogo = await apiGame(B, 'POST', { query: { action: 'jogo-iniciar' }, body: { tipo: 'radar' } });
      expect(jogo.statusCode).toBe(200);
      const plano = { prova: 'TRT — Analista', banca: 'FCC', dataProva: null, minutosDia: 60, nivel: 'avancado', disciplinas: ['portugues'] };
      expect((await apiGame(B, 'POST', { query: { action: 'plano-salvar' }, body: plano })).statusCode).toBe(200);
      const xpB = (await apiGame(B, 'GET', { query: { action: 'progresso' } })).body.xp;

      // ---- A tenta o simulado e a rodada do B pelo id: 404, sem dizer que existe.
      const naoExiste = async (res: Awaited<ReturnType<typeof apiGame>>, code: string) => {
        expect([res.statusCode, res.body.code]).toEqual([404, code]);
      };
      await naoExiste(await apiGame(A, 'GET', { query: { action: 'simulado', id: sim.body.id } }), 'SIMULADO_INEXISTENTE');
      await naoExiste(await apiGame(A, 'POST', { query: { action: 'simulado-entregar' }, body: { id: sim.body.id, respostas } }), 'SIMULADO_INEXISTENTE');
      await naoExiste(await apiGame(A, 'POST', { query: { action: 'jogo-jogada' }, body: { id: jogo.body.id, indice: 0, resposta: true } }), 'JOGO_INEXISTENTE');
      await naoExiste(await apiGame(A, 'POST', { query: { action: 'jogo-terminar' }, body: { id: jogo.body.id } }), 'JOGO_INEXISTENTE');
      // Um id que não existe em conta nenhuma responde igualzinho.
      const inexistente = await apiGame(A, 'GET', { query: { action: 'simulado', id: crypto.randomUUID() } });
      expect(inexistente.body).toEqual((await apiGame(A, 'GET', { query: { action: 'simulado', id: sim.body.id } })).body);

      // ---- user_id do B na URL ou no corpo é ignorado: tudo vale para o A.
      for (const action of ['progresso', 'plano', 'simulados', 'jogos', 'revisar', 'missoes']) {
        const res = await apiGame(A, 'GET', { query: { action, userId: B, user_id: B } });
        expect([action, res.statusCode]).toEqual([action, 200]);
      }
      expect((await apiGame(A, 'GET', { query: { action: 'progresso', userId: B } })).body.xp).toBe(0);
      expect((await apiGame(A, 'GET', { query: { action: 'plano', user_id: B } })).body).toEqual({ configurado: false });
      expect((await apiGame(A, 'GET', { query: { action: 'simulados', userId: B } })).body.aberto).toBeNull();
      const resp = await apiGame(A, 'POST', { query: { action: 'responder' }, body: { questionId: q, choice: questao(q)!.correta, mode: 'trilha', userId: B, user_id: B } });
      expect(resp.body.progress.xp).toBe(10); // creditado ao A
      // A mesma Idempotency-Key do B, na conta do A, não devolve a resposta do B.
      const mesmaChave = await apiGame(A, 'POST', { query: { action: 'resgatar' }, body: { missionId: 'responder-10' }, key: chaveB });
      expect(mesmaChave.headers['Idempotent-Replayed']).toBeUndefined();

      const perfilA = await apiMe(A, 'GET', { query: { userId: B, user_id: B } });
      expect([perfilA.statusCode, perfilA.body.user.id]).toEqual([200, A]);
      const patch = await apiMe(A, 'PATCH', { query: { userId: B }, body: { userId: B, displayName: 'Invasor' } });
      expect(patch.statusCode).toBe(400); // userId não é campo editável
      expect((await apiMe(A, 'PATCH', { query: { userId: B }, body: { displayName: 'Ana' } })).body.profile.displayName).toBe('Ana');

      // ---- A apaga a conta mandando o id do B: some só a conta do A.
      const del = await apiMe(A, 'DELETE', { query: { userId: B }, body: { confirmar: 'EXCLUIR', userId: B, user_id: B } });
      expect(del.statusCode).toBe(200);
      expect(logins).toEqual([A]);

      // ---- Nada do B mudou, e nada do B chegou ao A.
      const perfilB = await apiMe(B, 'GET');
      expect(perfilB.body.profile).toMatchObject({ displayName: 'Beatriz', city: 'Recife' });
      expect((await apiGame(B, 'GET', { query: { action: 'progresso' } })).body.xp).toBe(xpB);
      expect((await apiGame(B, 'GET', { query: { action: 'simulado', id: sim.body.id } })).body.estado).toBe('aberto');
      expect((await apiGame(B, 'GET', { query: { action: 'plano' } })).body).toMatchObject({ configurado: true, perfil: { prova: 'TRT — Analista' } });
      expect((await apiGame(B, 'POST', { query: { action: 'jogo-jogada' }, body: { id: jogo.body.id, indice: 0, resposta: true } })).statusCode).toBe(200);
      const tudoDoA = daA.join('\n');
      for (const segredo of [B, sim.body.id, jogo.body.id, 'Beatriz', 'Recife', 'TRT', `${B}@teste.dev`]) {
        expect(tudoDoA).not.toContain(segredo);
      }
    });
  });
}

cenario('cross-tenant (banco em memória)', async () => {
  const game = memoryGameStore();
  const profiles = memoryProfiles();
  return {
    game, profiles, idempotency: memoryIdempotency(),
    conta: { async excluir(userId) { profiles.rows.delete(userId); game.users.delete(userId); } },
  };
});

if (process.env.PG_TEST === '1') {
  cenario('cross-tenant (Postgres)', async () => {
    const { postgresGame } = await import('../../server/game-pg.js');
    const { postgresProfiles } = await import('../../server/profiles.js');
    const { postgresConta } = await import('../../server/conta.js');
    const { postgresIdempotency } = await import('../../server/idempotencia.js');
    return { game: postgresGame, profiles: postgresProfiles, conta: postgresConta, idempotency: postgresIdempotency };
  });
}
