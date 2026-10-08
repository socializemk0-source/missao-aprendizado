// Camada única de segurança das rotas (server/seguranca.ts): cabeçalhos em
// TODA resposta (inclusive 4xx/5xx e erro não tratado), CORS por lista de
// origens sem "*" nem credenciais, preflight mínimo com cache de 1 dia e
// Cache-Control por rota. Confere também que toda rota de api/ usa a camada.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CABECALHOS_API, comSeguranca, origemPermitida, type OpcoesRota } from '../../server/seguranca.js';
import type { ApiRequest, ApiResponse } from '../../server/http.js';
import { makeReq, makeRes } from './helpers.js';

const PROD = { VERCEL_ENV: 'production' } as NodeJS.ProcessEnv;
const opcoes: OpcoesRota = { metodos: ['GET', 'POST'], headers: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Turnstile-Token'] };
const ok = async (_req: ApiRequest, res: ApiResponse) => res.status(200).json({ ok: true });

async function chamar(handler: (req: ApiRequest, res: ApiResponse) => unknown, req: Partial<ApiRequest>) {
  const res = makeRes();
  await handler(makeReq(req), res);
  return res;
}

function confereCabecalhos(headers: Record<string, string>, onde: string) {
  for (const [k, v] of Object.entries(CABECALHOS_API)) expect([onde, k, headers[k]]).toEqual([onde, k, v]);
  expect(headers['Access-Control-Allow-Origin'], onde).not.toBe('*');
  expect(headers['Access-Control-Allow-Credentials'], onde).toBeUndefined();
}

afterEach(() => vi.restoreAllMocks());

describe('cabeçalhos de segurança em toda resposta', () => {
  it('sucesso, 4xx, 5xx e erro não tratado levam os mesmos cabeçalhos e no-store', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const handlers = {
      '200': ok,
      '401': async (_q: ApiRequest, r: ApiResponse) => r.status(401).json({ error: 'x' }),
      '503': async (_q: ApiRequest, r: ApiResponse) => r.status(503).json({ error: 'x' }),
      'throw': async () => { throw new Error('falhou com dado sensível do pedido'); },
    };
    for (const [nome, h] of Object.entries(handlers)) {
      const res = await chamar(comSeguranca(h, opcoes, PROD), { method: 'GET' });
      confereCabecalhos(res.headers, nome);
      expect(res.headers['Cache-Control'], nome).toBe('no-store');
      expect(res.headers.Vary, nome).toBe('Origin');
    }
    const quebrou = await chamar(comSeguranca(handlers.throw, opcoes, PROD), { method: 'GET' });
    expect([quebrou.statusCode, quebrou.body]).toEqual([500, { error: 'Algo deu errado. Tente de novo.' }]);
  });

  it('o vercel.json manda para /api exatamente os mesmos cabeçalhos (vale também para erro da própria Vercel)', () => {
    type Regra = { source: string; headers: { key: string; value: string }[] };
    const regras = (JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: Regra[] }).headers;
    const daApi = regras.filter((r) => new RegExp(`^${r.source}$`).test('/api/game'));
    expect(daApi.map((r) => r.source)).toEqual(['/api/(.*)']); // a regra da página não vale para a API
    expect(Object.fromEntries(daApi[0]!.headers.map((h) => [h.key, h.value]))).toEqual(CABECALHOS_API);
  });
});

describe('CORS por lista de origens', () => {
  it('origens do app: devolve a própria origem (nunca "*"), sem credenciais', async () => {
    for (const origin of ['https://www.aprovatico.com.br', 'https://aprovatico.com.br']) {
      const res = await chamar(comSeguranca(ok, opcoes, PROD), { method: 'GET', headers: { origin, host: 'api.outro-host' } });
      expect([origin, res.statusCode, res.headers['Access-Control-Allow-Origin']]).toEqual([origin, 200, origin]);
      confereCabecalhos(res.headers, origin);
    }
  });

  it('origem de fora da lista → 403 sem CORS, e o handler nem roda', async () => {
    const rodou = vi.fn(ok);
    for (const origin of ['https://golpe.com', 'http://www.aprovatico.com.br', 'https://www.aprovatico.com.br.golpe.com', 'https://www.aprovatico.com.br:8443',
      'null', 'https://missao-aprendizado-abc-time.vercel.app', '*']) {
      const res = await chamar(comSeguranca(rodou, opcoes, PROD), { method: 'POST', headers: { origin, host: 'www.aprovatico.com.br' } });
      expect([origin, res.statusCode, res.body.code, res.headers['Access-Control-Allow-Origin']]).toEqual([origin, 403, 'origin_not_allowed', undefined]);
      confereCabecalhos(res.headers, origin);
    }
    expect(rodou).not.toHaveBeenCalled();
  });

  it('a própria página (mesmo host) passa sem CORS — inclusive por outro endereço do mesmo deploy', async () => {
    const res = await chamar(comSeguranca(ok, opcoes, PROD), { method: 'POST', headers: { origin: 'https://missao-aprendizado.vercel.app', host: 'missao-aprendizado.vercel.app' } });
    expect([res.statusCode, res.headers['Access-Control-Allow-Origin']]).toEqual([200, undefined]);
    const viaProxy = await chamar(comSeguranca(ok, opcoes, PROD), { method: 'POST', headers: { origin: 'https://www.aprovatico.com.br', 'x-forwarded-host': 'www.aprovatico.com.br' } });
    expect(viaProxy.statusCode).toBe(200);
  });

  it('sem Origin (servidor chamando, como o Mercado Pago) segue normal', async () => {
    expect((await chamar(comSeguranca(ok, { ...opcoes, cors: false }, PROD), { method: 'POST' })).statusCode).toBe(200);
  });

  it('prévia da Vercel: só o endereço da própria prévia', () => {
    const previa = { VERCEL_ENV: 'preview', VERCEL_URL: 'app-abc123-time.vercel.app', VERCEL_BRANCH_URL: 'app-git-x-time.vercel.app' } as NodeJS.ProcessEnv;
    expect(origemPermitida('https://app-abc123-time.vercel.app', previa)).toBe(true);
    expect(origemPermitida('https://app-git-x-time.vercel.app', previa)).toBe(true);
    expect(origemPermitida('https://outra-time.vercel.app', previa)).toBe(false);
    expect(origemPermitida('https://app-abc123-time.vercel.app', PROD)).toBe(false);
    expect(origemPermitida('https://www.aprovatico.com.br/caminho', PROD)).toBe(false);
  });

  it('rota só de servidor (webhook): origem de navegador nunca é liberada', async () => {
    const res = await chamar(comSeguranca(ok, { metodos: ['POST'], headers: ['Content-Type'], cors: false }, PROD), { method: 'POST', headers: { origin: 'https://www.aprovatico.com.br', host: 'api.x' } });
    expect([res.statusCode, res.headers['Access-Control-Allow-Origin']]).toEqual([403, undefined]);
  });
});

describe('preflight (OPTIONS)', () => {
  const preflight = (origin: string, metodo: string, o: OpcoesRota = opcoes) =>
    chamar(comSeguranca(vi.fn(ok), o, PROD), { method: 'OPTIONS', headers: { origin, host: 'api.x', 'access-control-request-method': metodo } });

  it('origem do app: 204, só os métodos e headers da rota, cache de 1 dia, sem credenciais', async () => {
    const res = await preflight('https://www.aprovatico.com.br', 'POST');
    expect(res.statusCode).toBe(204);
    expect(res.headers).toMatchObject({
      'Access-Control-Allow-Origin': 'https://www.aprovatico.com.br',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key, X-Turnstile-Token',
      'Access-Control-Max-Age': '86400',
    });
    expect(res.headers['Access-Control-Allow-Credentials']).toBeUndefined();
    confereCabecalhos(res.headers, 'preflight');
  });

  it('método fora da rota, origem de fora ou rota sem CORS → recusa', async () => {
    expect((await preflight('https://www.aprovatico.com.br', 'DELETE')).statusCode).toBe(403);
    expect((await preflight('https://golpe.com', 'POST')).statusCode).toBe(403);
    expect((await preflight('https://www.aprovatico.com.br', 'POST', { ...opcoes, cors: false })).statusCode).toBe(403);
  });
});

// ---------------------------------------------------------------- Toda rota de api/ usa a camada
function rotas(dir = 'api'): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? rotas(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('toda rota de api/', () => {
  it('exporta comSeguranca(...) e responde com os cabeçalhos mesmo num método inválido', async () => {
    const arquivos = rotas();
    expect(arquivos.length).toBeGreaterThanOrEqual(9);
    for (const arquivo of arquivos) {
      expect(readFileSync(arquivo, 'utf8'), arquivo).toMatch(/export default comSeguranca\(/);
      const mod = (await import(`../../${arquivo}`)) as { default: (req: ApiRequest, res: ApiResponse) => Promise<void> };
      const res = await chamar(mod.default, { method: 'PUT' });
      expect([arquivo, res.statusCode]).toEqual([arquivo, 405]);
      confereCabecalhos(res.headers, arquivo);
      expect(res.headers['Cache-Control'], arquivo).toBe('no-store');
    }
  });

  it('/api/me e /api/game: no-store também nos erros; /api/config/supabase: público por 5 min', async () => {
    for (const arquivo of ['api/me.ts', 'api/game.ts']) {
      const mod = (await import(`../../${arquivo}`)) as { default: (req: ApiRequest, res: ApiResponse) => Promise<void> };
      const semLogin = await chamar(mod.default, { method: 'GET', query: { action: 'progresso' } });
      expect([arquivo, semLogin.statusCode, semLogin.headers['Cache-Control']]).toEqual([arquivo, 401, 'no-store']);
    }
    const config = (await import('../../api/config/supabase.js')).default;
    const antes = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };
    try {
      delete process.env.SUPABASE_URL;
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect((await chamar(config, { method: 'GET' })).headers['Cache-Control']).toBe('no-store'); // 503 não fica em cache
      process.env.SUPABASE_URL = 'https://proj.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'anon';
      const res = await chamar(config, { method: 'GET' });
      expect([res.statusCode, res.headers['Cache-Control']]).toEqual([200, 'public, max-age=300, stale-while-revalidate=60']);
      confereCabecalhos(res.headers, 'config');
    } finally {
      if (antes.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = antes.url;
      if (antes.key === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = antes.key;
    }
  });
});
