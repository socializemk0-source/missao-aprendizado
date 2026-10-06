import { afterEach, describe, expect, it } from 'vitest';
import handler from '../../api/config/supabase.js';
import { makeReq, makeRes } from './helpers.js';

const original = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY, captcha: process.env.TURNSTILE_SITE_KEY, pixel: process.env.META_PIXEL_ID };
afterEach(() => {
  if (original.pixel === undefined) delete process.env.META_PIXEL_ID;
  else process.env.META_PIXEL_ID = original.pixel;
  process.env.SUPABASE_URL = original.url;
  process.env.SUPABASE_ANON_KEY = original.key;
  if (original.captcha === undefined) delete process.env.TURNSTILE_SITE_KEY;
  else process.env.TURNSTILE_SITE_KEY = original.captcha;
});

describe('GET /api/config/supabase', () => {
  it('devolve a URL e a chave pública', () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const res = makeRes();
    handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon', captchaSiteKey: null, metaPixelId: null });
  });

  it('devolve a chave pública do CAPTCHA quando configurada', () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.TURNSTILE_SITE_KEY = ' 0x4AAA ';
    const res = makeRes();
    handler(makeReq(), res);
    expect(res.body.captchaSiteKey).toBe('0x4AAA');
  });

  it('devolve o id do pixel da Meta só se for número; o token da API de Conversões nunca sai', () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.META_CAPI_TOKEN = 'segredo-de-teste';
    process.env.META_PIXEL_ID = ' 1234567890 ';
    let res = makeRes();
    handler(makeReq(), res);
    expect(res.body.metaPixelId).toBe('1234567890');
    expect(JSON.stringify(res.body)).not.toContain('segredo-de-teste');
    process.env.META_PIXEL_ID = '<script>';
    res = makeRes();
    handler(makeReq(), res);
    expect(res.body.metaPixelId).toBeNull();
    delete process.env.META_CAPI_TOKEN;
  });

  it('sem configuração → 503, sem inventar valores', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    const res = makeRes();
    handler(makeReq(), res);
    expect(res.statusCode).toBe(503);
  });
});
