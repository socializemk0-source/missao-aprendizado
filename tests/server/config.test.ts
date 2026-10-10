import { afterEach, describe, expect, it } from 'vitest';
import { createConfigHandler } from '../../api/config/supabase.js';
import { memoryLimiter } from '../../server/limite.js';

const handler = createConfigHandler({ limiter: null });
import { versaoDoBuild } from '../../shared/versao.js';
import { makeReq, makeRes } from './helpers.js';

const original = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY, captcha: process.env.TURNSTILE_SITE_KEY, sha: process.env.VERCEL_GIT_COMMIT_SHA };
afterEach(() => {
  process.env.SUPABASE_URL = original.url;
  process.env.SUPABASE_ANON_KEY = original.key;
  if (original.captcha === undefined) delete process.env.TURNSTILE_SITE_KEY;
  else process.env.TURNSTILE_SITE_KEY = original.captcha;
  if (original.sha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
  else process.env.VERCEL_GIT_COMMIT_SHA = original.sha;
});

describe('GET /api/config/supabase', async () => {
  it('devolve a URL e a chave pública', async () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon', captchaSiteKey: null, version: 'dev' });
  });

  it('devolve a chave pública do CAPTCHA quando configurada', async () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.TURNSTILE_SITE_KEY = ' 0x4AAA ';
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.body.captchaSiteKey).toBe('0x4AAA');
  });

  it('sem configuração → 503, sem inventar valores', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(503);
  });

  it('version: o commit publicado (12 primeiros caracteres), igual ao embutido no bundle', async () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.VERCEL_GIT_COMMIT_SHA = '0123456789abcdef0123456789abcdef01234567';
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.body.version).toBe('0123456789ab');
    expect(versaoDoBuild(process.env)).toBe(res.body.version);
  });

  it('limite por IP: passou de 60 por minuto → 429 rate_limited; outro IP segue', async () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const comLimite = createConfigHandler({ limiter: memoryLimiter(() => new Date('2026-10-08T12:00:00Z')) });
    const pedir = async (ip: string) => {
      const res = makeRes();
      await comLimite(makeReq({ headers: { 'x-real-ip': ip } }), res);
      return res;
    };
    for (let i = 0; i < 60; i++) expect((await pedir('7.7.7.7')).statusCode).toBe(200);
    const bloqueado = await pedir('7.7.7.7');
    expect([bloqueado.statusCode, bloqueado.body.code]).toEqual([429, 'rate_limited']);
    expect(bloqueado.headers['Cache-Control']).toBeUndefined(); // o no-store vem da camada de segurança; o handler não põe cache público
    expect((await pedir('8.8.8.8')).statusCode).toBe(200);
  });
});
