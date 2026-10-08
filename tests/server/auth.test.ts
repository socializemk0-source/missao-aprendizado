// POST /api/auth (cadastro e "esqueci a senha"): CAPTCHA conferido no
// servidor antes do Supabase; a chave de administrador só vai para o Supabase
// Auth, com corpo montado aqui; redirect de lista fechada; limites; nada de
// senha, e-mail ou token no log.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthHandler, redirectPara } from '../../api/auth.js';
import { memoryLimiter } from '../../server/limite.js';
import type { VerifyTurnstile } from '../../server/turnstile.js';
import { makeReq, makeRes } from './helpers.js';

const env = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'chave-admin-secreta', VERCEL_ENV: 'production' } as NodeJS.ProcessEnv;
const SENHA = 'senhaForte123';
const cadastro = { name: 'Maria Souza', email: ' Maria@Teste.DEV ', password: SENHA, captchaToken: 'tok-bom', redirectTo: 'https://www.aprovatico.com.br/entrar' };
const recuperar = { email: 'maria@teste.dev', captchaToken: 'tok-bom', redirectTo: 'https://aprovatico.com.br/redefinir-senha' };

function setup(opts: { supabase?: (url: string, init: RequestInit) => Response; captcha?: VerifyTurnstile; env?: NodeJS.ProcessEnv } = {}) {
  const chamadas: { url: string; init: RequestInit; corpo: unknown }[] = [];
  const send = (async (url: string, init: RequestInit) => {
    chamadas.push({ url, init, corpo: JSON.parse(String(init.body)) });
    return opts.supabase?.(url, init) ?? new Response(JSON.stringify({ id: 'u1', identities: [{}] }), { status: 200 });
  }) as unknown as typeof fetch;
  const tokens: unknown[] = [];
  const captcha: VerifyTurnstile = opts.captcha ?? (async (token, o) => {
    tokens.push([token, o.uso]);
    return token === 'tok-bom'
      ? { ok: true, hostname: 'www.aprovatico.com.br', action: o.uso === 'cadastro' ? 'signup' : 'recover' }
      : { ok: false, hostname: null, action: null, motivo: 'recusado' };
  });
  const handler = createAuthHandler({ env: opts.env ?? env, send, turnstile: captcha, limiter: memoryLimiter(() => new Date('2026-10-08T12:00:00Z')) });
  const post = async (action: string, body: unknown, ip = '1.1.1.1') => {
    const res = makeRes();
    await handler(makeReq({ method: 'POST', query: { action }, body, headers: { 'x-real-ip': ip } }), res);
    return res;
  };
  return { post, chamadas, tokens };
}

afterEach(() => vi.restoreAllMocks());

describe('POST /api/auth — cadastro', () => {
  it('confere o CAPTCHA (formulário "signup") e só então chama o Supabase com a chave de admin, corpo montado aqui', async () => {
    const { post, chamadas, tokens } = setup();
    const res = await post('signup', cadastro);
    expect([res.statusCode, res.body]).toEqual([200, { ok: true, confirmar: true }]);
    expect(tokens).toEqual([['tok-bom', 'cadastro']]);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]!.url).toBe(`https://proj.supabase.co/auth/v1/signup?redirect_to=${encodeURIComponent('https://www.aprovatico.com.br/entrar')}`);
    // Chave nova (sb_secret_… ou outra que não é JWT): só no apikey.
    expect(chamadas[0]!.init.headers).toEqual({ apikey: 'chave-admin-secreta', 'Content-Type': 'application/json' });
    expect(chamadas[0]!.corpo).toEqual({ email: 'maria@teste.dev', password: SENHA, data: { name: 'Maria Souza' } });
  });

  it('CAPTCHA recusado ou Cloudflare fora → nada vai para o Supabase', async () => {
    const a = setup();
    for (const body of [{ ...cadastro, captchaToken: 'tok-ruim' }, { ...cadastro, captchaToken: undefined }]) {
      const res = await a.post('signup', body);
      expect([res.statusCode, res.body.code]).toEqual([400, 'captcha_invalido']);
    }
    expect(a.chamadas).toHaveLength(0);
    const b = setup({ captcha: async () => ({ ok: false, hostname: null, action: null, motivo: 'indisponivel' }) });
    expect((await b.post('signup', cadastro)).body.code).toBe('captcha_indisponivel');
    expect(b.chamadas).toHaveLength(0);
  });

  it('campos de administrador mandados pela tela são recusados (email_confirm, role, app_metadata...)', async () => {
    const { post, chamadas } = setup();
    for (const extra of [{ email_confirm: true }, { role: 'service_role' }, { app_metadata: { plano: 'pro' } }, { data: { pro: true } }]) {
      expect((await post('signup', { ...cadastro, ...extra })).statusCode).toBe(400);
    }
    expect(chamadas).toHaveLength(0);
  });

  it('valida nome, e-mail e senha (mesma regra da tela)', async () => {
    const { post, chamadas } = setup();
    for (const body of [
      { ...cadastro, name: '' }, { ...cadastro, name: '<script>' }, { ...cadastro, email: 'x' },
      { ...cadastro, password: 'curta1' }, { ...cadastro, password: 'semnumeros' }, { ...cadastro, password: `a1${'x'.repeat(80)}` },
    ]) {
      const res = await post('signup', body);
      expect([JSON.stringify(body), res.statusCode, res.body.code]).toEqual([JSON.stringify(body), 400, 'invalid_params']);
    }
    expect(chamadas).toHaveLength(0);
  });

  it('redirect só para o próprio app e a tela certa', () => {
    expect(redirectPara(undefined, 'signup', env)).toBe('https://www.aprovatico.com.br/entrar');
    for (const ruim of ['https://golpe.com/entrar', 'https://www.aprovatico.com.br/outra', 'https://www.aprovatico.com.br/entrar?x=1', 'http://www.aprovatico.com.br/entrar',
      'https://www.aprovatico.com.br.golpe.com/entrar', 'javascript:alert(1)', 'http://localhost:5173/entrar', 'https://user@www.aprovatico.com.br/entrar']) {
      expect([ruim, redirectPara(ruim, 'signup', env)]).toEqual([ruim, null]);
    }
    expect(redirectPara('https://www.aprovatico.com.br/redefinir-senha', 'recover', env)).toBe('https://www.aprovatico.com.br/redefinir-senha');
    expect(redirectPara('http://localhost:5173/entrar', 'signup', {})).toBe('http://localhost:5173/entrar');
    const previa = { VERCEL_ENV: 'preview', VERCEL_URL: 'app-abc-time.vercel.app' };
    expect(redirectPara('https://app-abc-time.vercel.app/entrar', 'signup', previa)).toBe('https://app-abc-time.vercel.app/entrar');
  });

  it('e-mail já cadastrado (usuário sem identidades) → 409 em português', async () => {
    const { post } = setup({ supabase: () => new Response(JSON.stringify({ id: 'x', identities: [] }), { status: 200 }) });
    const res = await post('signup', cadastro);
    expect([res.statusCode, res.body.code]).toEqual([409, 'user_already_exists']);
    expect(res.body.error).toMatch(/já tem conta/);
  });

  it('erros do Supabase viram mensagens em português; nunca devolve tokens de sessão', async () => {
    const fraca = setup({ supabase: () => new Response(JSON.stringify({ code: 422, error_code: 'weak_password', msg: 'Password should be at least 8 characters.' }), { status: 422 }) });
    expect((await fraca.post('signup', cadastro)).body).toEqual({ error: 'A senha precisa ter pelo menos 8 caracteres, com letras e números.', code: 'weak_password' });
    const muitas = setup({ supabase: () => new Response(JSON.stringify({ error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' }), { status: 429 }) });
    expect((await muitas.post('signup', cadastro)).body.code).toBe('rate_limited');
    const fora = setup({ supabase: () => new Response('{}', { status: 500 }) });
    expect((await fora.post('signup', cadastro)).statusCode).toBe(502);
    const sessao = setup({ supabase: () => new Response(JSON.stringify({ access_token: 'jwt-secreto', refresh_token: 'r', user: { identities: [{}] } }), { status: 200 }) });
    const res = await sessao.post('signup', cadastro);
    expect(res.body).toEqual({ ok: true, confirmar: false });
  });

  it('sem a chave de admin → 503, sem gastar o token do CAPTCHA', async () => {
    const { post, chamadas, tokens } = setup({ env: { SUPABASE_URL: 'https://proj.supabase.co', VERCEL_ENV: 'production' } });
    const res = await post('signup', cadastro);
    expect([res.statusCode, res.body.code]).toEqual([503, 'auth_indisponivel']);
    expect(chamadas).toHaveLength(0);
    expect(tokens).toHaveLength(0);
  });

  it('log: nunca senha, e-mail, token do CAPTCHA nem a chave', async () => {
    const logs = [vi.spyOn(console, 'warn').mockImplementation(() => {}), vi.spyOn(console, 'error').mockImplementation(() => {}), vi.spyOn(console, 'info').mockImplementation(() => {})];
    const { post } = setup({ supabase: () => new Response(JSON.stringify({ error_code: 'weak_password', msg: `bad ${SENHA}` }), { status: 422 }) });
    await post('signup', cadastro);
    await setup({ supabase: () => { throw new Error(`falhou ${SENHA}`); } }).post('signup', cadastro);
    const tudo = JSON.stringify(logs.flatMap((l) => l.mock.calls));
    for (const segredo of [SENHA, 'maria@teste.dev', 'tok-bom', 'chave-admin-secreta']) expect(tudo).not.toContain(segredo);
  });
});

describe('POST /api/auth — esqueci a senha', () => {
  it('formulário "recover"; resposta igual exista ou não a conta', async () => {
    const { post, chamadas, tokens } = setup({ supabase: () => new Response('{}', { status: 200 }) });
    const res = await post('recover', recuperar);
    expect([res.statusCode, res.body]).toEqual([200, { ok: true }]);
    expect(tokens).toEqual([['tok-bom', 'recuperar']]);
    expect(chamadas[0]!.url).toBe(`https://proj.supabase.co/auth/v1/recover?redirect_to=${encodeURIComponent('https://aprovatico.com.br/redefinir-senha')}`);
    expect(chamadas[0]!.corpo).toEqual({ email: 'maria@teste.dev' });
  });

  it('limite: 3 pedidos por hora para o mesmo e-mail; 10 por hora por IP → 429 rate_limited', async () => {
    const { post } = setup({ supabase: () => new Response('{}', { status: 200 }) });
    for (let i = 0; i < 3; i++) expect((await post('recover', recuperar, `2.2.2.${i}`)).statusCode).toBe(200);
    expect((await post('recover', recuperar, '2.2.2.9')).body.code).toBe('rate_limited');
    for (let i = 0; i < 10; i++) await post('recover', { ...recuperar, email: `x${i}@teste.dev` }, '3.3.3.3');
    const ip = await post('recover', { ...recuperar, email: 'outra@teste.dev' }, '3.3.3.3');
    expect([ip.statusCode, ip.body.code]).toEqual([429, 'rate_limited']);
  });
});

describe('POST /api/auth — outros casos', () => {
  it('ação desconhecida → 400; GET → 405; corpo grande → 413', async () => {
    const { post } = setup();
    expect((await post('login', {})).body.code).toBe('unknown_action');
    expect((await post('signup', { ...cadastro, name: 'x'.repeat(11_000) })).statusCode).toBe(413);
    const res = makeRes();
    await createAuthHandler({ env })(makeReq({ method: 'GET', query: { action: 'signup' } }), res);
    expect(res.statusCode).toBe(405);
  });
});
