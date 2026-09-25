import { afterEach, describe, expect, it } from 'vitest';
import handler from '../../api/config/supabase.js';
import { makeReq, makeRes } from './helpers.js';

const original = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };
afterEach(() => {
  process.env.SUPABASE_URL = original.url;
  process.env.SUPABASE_ANON_KEY = original.key;
});

describe('GET /api/config/supabase', () => {
  it('devolve a URL e a chave pública', () => {
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const res = makeRes();
    handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' });
  });

  it('sem configuração → 503, sem inventar valores', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    const res = makeRes();
    handler(makeReq(), res);
    expect(res.statusCode).toBe(503);
  });
});
