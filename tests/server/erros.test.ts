// Erro 5xx padronizado (server/seguranca.ts): { error amigável, code,
// requestId }, sem stack, SQL nem nome de tabela; o detalhe vai para o log
// com o mesmo requestId.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameHandler } from '../../api/game.js';
import { memoryGameStore } from '../../server/game-memory.js';
import type { ApiRequest, ApiResponse } from '../../server/http.js';
import { log } from '../../server/log.js';
import { ERRO_GENERICO, comSeguranca, corpoDeErro5xx } from '../../server/seguranca.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const opcoes = { metodos: ['GET', 'POST'] as const, headers: ['Authorization', 'Content-Type'] as const };
const rota = (h: (req: ApiRequest, res: ApiResponse) => unknown) => comSeguranca(h as never, { metodos: [...opcoes.metodos], headers: [...opcoes.headers] }, { VERCEL_ENV: 'production' });
const ERRO_SQL = Object.assign(new Error('Failed query: select "xp" from "v2"."user_stats" where "user_id" = $1\nparams: aluno@teste.dev'), {
  // Como no Drizzle: a 1ª linha do stack repete a mensagem inteira, com os parâmetros.
  stack: 'Error: Failed query: select "xp" from "v2"."user_stats" where "user_id" = $1\nparams: aluno@teste.dev\n    at PgSession.query (/var/task/node_modules/drizzle-orm/pg-core/session.js:42:11)',
});

async function chamar(h: (req: ApiRequest, res: ApiResponse) => unknown, req: Partial<ApiRequest> = { method: 'GET' }) {
  const res = makeRes();
  await h(makeReq(req), res);
  return res;
}

afterEach(() => vi.restoreAllMocks());

describe('erro 5xx padronizado', () => {
  it('erro não tratado: corpo padrão com requestId; nada de stack, SQL ou tabela; detalhe no log com o mesmo id', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await chamar(rota(async () => { throw ERRO_SQL; }));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: ERRO_GENERICO, code: 'erro_interno', requestId: expect.stringMatching(UUID) });
    expect(res.headers['X-Request-Id']).toBe(res.body.requestId);
    const corpo = JSON.stringify(res.body);
    for (const proibido of ['select', 'v2', 'user_stats', 'drizzle', 'at ', 'aluno@teste.dev', 'Failed query']) expect(corpo).not.toContain(proibido);
    const linhas = erro.mock.calls.map((c) => c.map(String).join(' '));
    expect(linhas.some((l) => l.startsWith(`[req:${res.body.requestId}]`) && l.includes('user_stats'))).toBe(true);
    expect(linhas.join('\n')).not.toContain('aluno@teste.dev'); // os parâmetros (dados do aluno) não vão nem para o log
  });

  it('500 respondido pela rota: mensagem amigável e código ficam; mensagem com cara de detalhe técnico é trocada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const amigavel = await chamar(rota(async (_q, r) => r.status(503).json({ error: 'A correção por IA não está disponível agora.', code: 'IA_DESLIGADA' })));
    expect(amigavel.body).toEqual({ error: 'A correção por IA não está disponível agora.', code: 'IA_DESLIGADA', requestId: amigavel.headers['X-Request-Id'] });
    for (const vazamento of [
      'relation "v2.user_stats" does not exist', 'duplicate key value violates unique constraint "profiles_pkey"',
      'select * from public.users', 'connect ECONNREFUSED 10.0.0.1:5432', "TypeError: Cannot read properties of undefined (reading 'xp')",
      'Error\n    at Object.<anonymous> (/var/task/api/game.js:10:5)', 'x'.repeat(301),
    ]) {
      const res = await chamar(rota(async (_q, r) => r.status(500).json({ error: vazamento, code: 'qualquer coisa com espaço', detalhe: vazamento, stack: vazamento })));
      expect([vazamento.slice(0, 30), res.body]).toEqual([vazamento.slice(0, 30), { error: ERRO_GENERICO, code: 'erro_interno', requestId: res.headers['X-Request-Id'] }]);
    }
  });

  it('4xx não muda (só ganha o header X-Request-Id)', async () => {
    const res = await chamar(rota(async (_q, r) => r.status(400).json({ error: 'Envio inválido.', code: 'invalid_params' })));
    expect(res.body).toEqual({ error: 'Envio inválido.', code: 'invalid_params' });
    expect(res.headers['X-Request-Id']).toMatch(UUID);
  });

  it('cada pedido tem o seu requestId, inclusive em pedidos simultâneos, e os logs de cada um levam o dele', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const h = rota(async (req, r) => {
      await new Promise((ok) => setTimeout(ok, Number(req.query.espera)));
      log.erro('[teste] dentro do pedido', req.query.n);
      r.status(500).json({ code: 'erro_interno' });
    });
    const [a, b] = await Promise.all([chamar(h, { method: 'GET', query: { n: 'A', espera: '20' } }), chamar(h, { method: 'GET', query: { n: 'B', espera: '1' } })]);
    expect(a.body.requestId).not.toBe(b.body.requestId);
    const linhas = erro.mock.calls.filter((c) => c[1] === '[teste] dentro do pedido');
    expect(linhas.find((c) => c[2] === 'A')![0]).toBe(`[req:${a.body.requestId}]`);
    expect(linhas.find((c) => c[2] === 'B')![0]).toBe(`[req:${b.body.requestId}]`);
  });

  it('rota de verdade (/api/game) com o banco falhando: corpo padrão, sem SQL', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = memoryGameStore();
    store.withUser = (async () => { throw ERRO_SQL; }) as typeof store.withUser;
    const game = rota(createGameHandler({ verifyToken: fakeVerify, store, limiter: null }));
    const res = await chamar(game, { method: 'GET', query: { action: 'progresso' }, headers: { authorization: 'Bearer ok:u1' } });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String), code: 'erro_interno', requestId: res.headers['X-Request-Id'] });
    expect(JSON.stringify(res.body)).not.toMatch(/select|v2|user_stats|drizzle/i);
  });

  it('corpoDeErro5xx: corpo vazio ou estranho vira o padrão', () => {
    for (const body of [undefined, null, 'texto', 42, [], { error: 42 }]) {
      expect(corpoDeErro5xx(body, 'id-1')).toEqual({ error: ERRO_GENERICO, code: 'erro_interno', requestId: 'id-1' });
    }
  });
});
