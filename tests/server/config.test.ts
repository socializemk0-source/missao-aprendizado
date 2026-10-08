import { afterEach, describe, expect, it } from 'vitest';
import handler from '../../api/config/supabase.js';
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
});
