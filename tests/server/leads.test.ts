// POST /api/leads: validação (zod, campo a mais → 400), nome limpo antes de
// gravar, CAPTCHA conferido no servidor, limite por IP (3/hora) e por e-mail
// (3/dia), campo-isca calado, corpo grande, SQL/XSS e e-mail repetido.
import { describe, expect, it } from 'vitest';
import { LEAD_CORPO_MAX, captchaDoAmbiente, createLeadsHandler, type CaptchaConfig } from '../../api/leads.js';
import type { LeadStore } from '../../server/leads.js';
import { LIMITES } from '../../server/limite.js';
import type { verifyTurnstile } from '../../server/turnstile.js';
import { makeReq, makeRes } from './helpers.js';

type Lead = { email: string; name: string | null; source: string };

function setup(opts: { captcha?: CaptchaConfig; verify?: typeof verifyTurnstile; falhar?: boolean } = {}) {
  const saved: Lead[] = [];
  const tentativas: Lead[] = [];
  const store: LeadStore = {
    async save(lead) {
      if (opts.falhar) throw new Error('banco fora');
      tentativas.push(lead);
      if (!saved.some((s) => s.email === lead.email)) saved.push(lead);
    },
  };
  let now = Date.parse('2026-10-08T12:00:00Z');
  const tokens: unknown[] = [];
  const verify: typeof verifyTurnstile = opts.verify ?? (async (token) => {
    tokens.push(token);
    return token === 'tok-bom' ? { ok: true } : { ok: false, motivo: 'recusado' };
  });
  const handler = createLeadsHandler({ store, now: () => now, captcha: opts.captcha, verify });
  const post = async (body: unknown, ip = '1.1.1.1', headers: Record<string, string> = {}) => {
    const res = makeRes();
    await handler(makeReq({ method: 'POST', body, headers: { 'x-forwarded-for': ip, ...headers } }), res);
    return res;
  };
  return { saved, tentativas, tokens, post, advance: (ms: number) => (now += ms) };
}

const valid = { email: '  Maria@Email.COM ', name: 'Maria', consent: true, source: 'landing', website: '' };
let ipSeq = 0;
const novoIp = () => `10.1.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

describe('POST /api/leads — validação (zod)', () => {
  it('grava o e-mail com trim e em minúsculas, com o consentimento; resposta 200', async () => {
    const { saved, post } = setup();
    const res = await post(valid);
    expect([res.statusCode, res.body]).toEqual([200, { ok: true }]);
    expect(saved).toEqual([{ email: 'maria@email.com', name: 'Maria', source: 'landing' }]);
  });

  it('sem consentimento, e-mail inválido, campo longo ou campo a mais → 400 invalid_params e nada é gravado', async () => {
    const { saved, post } = setup();
    const invalid = [
      { ...valid, consent: false }, { ...valid, consent: 'sim' }, { ...valid, email: 'maria' }, { ...valid, email: 'maria@' },
      { ...valid, email: `${'a'.repeat(250)}@x.com` }, { ...valid, name: 'x'.repeat(61) }, { ...valid, source: 'outro-site' },
      { ...valid, isAdmin: true }, { ...valid, userId: 'u1' }, { ...valid, email: ['a@x.com'] }, { ...valid, name: 42 },
      { name: 'Sem e-mail', consent: true }, [valid], 'texto',
    ];
    for (const body of invalid) {
      const res = await post(body, novoIp());
      expect([JSON.stringify(body), res.statusCode, res.body.code]).toEqual([JSON.stringify(body), 400, 'invalid_params']);
    }
    expect(saved).toEqual([]);
  });

  it('mensagens em português para o aluno', async () => {
    const { post } = setup();
    expect((await post({ ...valid, email: 'x' }, novoIp())).body.error).toBe('Confira o e-mail digitado.');
    expect((await post({ ...valid, consent: false }, novoIp())).body.error).toBe('Marque a autorização para receber nossos e-mails.');
    expect((await post({ ...valid, name: 'n'.repeat(61) }, novoIp())).body.error).toBe('Nome longo demais.');
    expect((await post({ ...valid, extra: 1 }, novoIp())).body.error).toBe('Envio inválido.');
  });

  it('1000 caracteres em cada campo → 400, nada gravado', async () => {
    const { saved, post } = setup();
    const mil = 'a'.repeat(1000);
    for (const campo of ['email', 'name', 'source', 'website']) {
      const res = await post({ ...valid, [campo]: campo === 'email' ? `${mil}@x.com` : mil }, novoIp());
      // website cheio é o campo-isca: "ok" calado; os outros, 400.
      expect([campo, res.statusCode]).toEqual([campo, campo === 'website' ? 200 : 400]);
    }
    // O token do CAPTCHA pode ter até 2048 caracteres (limite da Cloudflare); passou disso, 400.
    expect((await post({ ...valid, captchaToken: 't'.repeat(2049) }, novoIp())).statusCode).toBe(400);
    expect(saved).toEqual([]);
  });

  it('payload gigante (> 10 KB) → 413, pelo cabeçalho ou pelo corpo', async () => {
    const { saved, post } = setup();
    const grande = { ...valid, name: 'x'.repeat(LEAD_CORPO_MAX + 1) };
    expect((await post(grande, novoIp())).statusCode).toBe(413);
    expect((await post(JSON.stringify(grande), novoIp())).statusCode).toBe(413);
    const pelo = await post(valid, novoIp(), { 'content-length': String(LEAD_CORPO_MAX + 1) });
    expect([pelo.statusCode, pelo.body.code]).toEqual([413, 'payload_too_large']);
    const lixo = Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [`k${i}`, 'v'.repeat(10)]));
    expect((await post({ ...valid, ...lixo }, novoIp())).statusCode).toBe(413);
    expect(saved).toEqual([]);
  });

  it('JSON quebrado → 400', async () => {
    const { post } = setup();
    expect((await post('{"email": ', novoIp())).statusCode).toBe(400);
  });
});

describe('POST /api/leads — SQL e XSS', () => {
  it('SQL no nome é gravado só como texto; sinais de HTML, controle e fórmula de planilha saem', async () => {
    const { saved, post } = setup();
    const casos: [string, string][] = [
      ["Robert'); DROP TABLE v2.leads;--", 'Robert); DROP TABLE v2.leads;--'],
      ['<script>alert(1)</script>', 'scriptalert(1)/script'],
      ['<img src=x onerror=alert(1)>', 'img src=x onerror=alert(1)'],
      ['=HYPERLINK("http://mal")', 'HYPERLINK(http://mal)'],
      ['+cmd|calc', 'cmd|calc'],
      ['Ana‮gnp.exe', 'Anagnp.exe'],
      ['  Ana\u0000 \u0007Souza  ', 'Ana Souza'],
      ['<>', ''],
    ];
    for (const [i, [nome]] of casos.entries()) {
      expect((await post({ ...valid, email: `n${i}@x.com`, name: nome }, novoIp())).statusCode).toBe(200);
    }
    expect(saved.map((s) => s.name)).toEqual(casos.map(([, limpo]) => limpo || null));
    for (const s of saved) expect(s.name ?? '').not.toMatch(/[<>"'`&\u0000-\u001f‪-‮]/);
  });

  it('SQL ou HTML no e-mail não passa do formato', async () => {
    const { saved, post } = setup();
    for (const email of ["x'; drop table v2.leads;--@x.com", '<script>@x.com', 'a@x.com<script>', 'a@x.com"onmouseover=alert(1)', "admin@x.com' or '1'='1", 'a b@x.com']) {
      expect([email, (await post({ ...valid, email }, novoIp())).statusCode]).toEqual([email, 400]);
    }
    expect(saved).toEqual([]);
  });
});

describe('POST /api/leads — e-mail repetido e campo-isca', () => {
  it('e-mail repetido responde igual (não revela quem já está na lista)', async () => {
    const { saved, post } = setup();
    const a = await post(valid, novoIp());
    const b = await post({ ...valid, email: 'MARIA@email.com' }, novoIp());
    expect([a.statusCode, a.body]).toEqual([b.statusCode, b.body]);
    expect(saved).toHaveLength(1);
  });

  it('robô que preenche o campo escondido recebe 200 "ok" (igual ao sucesso), nada é gravado e o CAPTCHA nem é chamado', async () => {
    const { saved, tokens, post } = setup({ captcha: { secret: 's', obrigatorio: true } });
    for (const website of ['http://spam', '  x  ', 123, { a: 1 }, ['x']]) {
      const res = await post({ ...valid, website, campoQueNaoExiste: 'x' }, novoIp());
      expect([JSON.stringify(website), res.statusCode, res.body]).toEqual([JSON.stringify(website), 200, { ok: true }]);
    }
    expect(saved).toEqual([]);
    expect(tokens).toEqual([]);
  });

  it('campo-isca só com espaços conta como vazio (gente que tropeçou no campo)', async () => {
    const { saved, post } = setup();
    expect((await post({ ...valid, website: '   ' }, novoIp())).statusCode).toBe(200);
    expect(saved).toHaveLength(1);
  });
});

describe('POST /api/leads — limite', () => {
  it(`flood de um IP: ${LIMITES.leadsPorIpHora} por hora, depois 429 too_many_leads com Retry-After; outro IP segue; depois de 1 hora volta`, async () => {
    const { post, advance, saved } = setup();
    for (let i = 0; i < LIMITES.leadsPorIpHora; i++) expect((await post({ ...valid, email: `a${i}@x.com` })).statusCode).toBe(200);
    for (let i = 0; i < 50; i++) {
      const res = await post({ ...valid, email: `flood${i}@x.com` });
      expect([res.statusCode, res.body.code]).toEqual([429, 'too_many_leads']);
    }
    const bloqueado = await post({ ...valid, email: 'b@x.com' });
    expect(Number(bloqueado.headers['Retry-After'])).toBeGreaterThan(0);
    expect((await post({ ...valid, email: 'b@x.com' }, '9.9.9.9')).statusCode).toBe(200);
    advance(3_600_000);
    expect((await post({ ...valid, email: 'c@x.com' })).statusCode).toBe(200);
    expect(saved).toHaveLength(LIMITES.leadsPorIpHora + 2);
  });

  it('envios que o robô faz com lixo também contam no limite do IP', async () => {
    const { post } = setup();
    for (let i = 0; i < LIMITES.leadsPorIpHora; i++) await post({ lixo: true }, '7.7.7.7');
    expect((await post(valid, '7.7.7.7')).body.code).toBe('too_many_leads');
  });

  it(`mesmo e-mail: ${LIMITES.leadsPorEmailDia} por dia (de IPs diferentes), depois 429; no dia seguinte volta`, async () => {
    const { post, advance } = setup();
    for (let i = 0; i < LIMITES.leadsPorEmailDia; i++) expect((await post(valid, novoIp())).statusCode).toBe(200);
    const res = await post({ ...valid, email: 'maria@EMAIL.com ' }, novoIp());
    expect([res.statusCode, res.body.code]).toEqual([429, 'too_many_leads']);
    advance(86_400_000);
    expect((await post(valid, novoIp())).statusCode).toBe(200);
  });
});

describe('POST /api/leads — CAPTCHA (Turnstile)', () => {
  const captcha = { secret: 'segredo', obrigatorio: true };

  it('sem token ou token recusado → 400 captcha_invalido; nada gravado', async () => {
    const { saved, post, tokens } = setup({ captcha });
    for (const extra of [{}, { captchaToken: 'tok-ruim' }]) {
      const res = await post({ ...valid, ...extra }, novoIp());
      expect([res.statusCode, res.body.code]).toEqual([400, 'captcha_invalido']);
    }
    expect(tokens).toEqual([undefined, 'tok-ruim']);
    expect(saved).toEqual([]);
  });

  it('token aceito → grava; o token não é gravado', async () => {
    const { saved, post } = setup({ captcha });
    expect((await post({ ...valid, captchaToken: 'tok-bom' }, novoIp())).statusCode).toBe(200);
    expect(saved).toEqual([{ email: 'maria@email.com', name: 'Maria', source: 'landing' }]);
  });

  it('Cloudflare fora do ar → 503 captcha_indisponivel (não deixa passar)', async () => {
    const { saved, post } = setup({ captcha, verify: async () => ({ ok: false, motivo: 'indisponivel' }) });
    const res = await post({ ...valid, captchaToken: 'tok' }, novoIp());
    expect([res.statusCode, res.body.code]).toEqual([503, 'captcha_indisponivel']);
    expect(saved).toEqual([]);
  });

  it('produção sem a chave secreta → 503 (fail-closed)', async () => {
    const cfg = captchaDoAmbiente({ VERCEL_ENV: 'production' });
    expect(cfg).toMatchObject({ secret: null, obrigatorio: true });
    const { saved, post } = setup({ captcha: cfg });
    expect((await post({ ...valid, captchaToken: 'tok-bom' }, novoIp())).statusCode).toBe(503);
    expect(saved).toEqual([]);
    expect(captchaDoAmbiente({})).toMatchObject({ obrigatorio: false });
    expect(captchaDoAmbiente({ TURNSTILE_SECRET_KEY: 'x', TURNSTILE_HOSTNAMES: 'a.com, b.com' })).toEqual({ secret: 'x', obrigatorio: true, hostnames: ['a.com', 'b.com'] });
  });
});

describe('POST /api/leads — outros casos', () => {
  it('outros métodos → 405', async () => {
    const res = makeRes();
    await createLeadsHandler({ store: { save: async () => {} } })(makeReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });

  it('erro do banco → 500 sem detalhes', async () => {
    const { post } = setup({ falhar: true });
    const res = await post(valid, novoIp());
    expect([res.statusCode, res.body]).toEqual([500, { error: 'Não foi possível salvar agora. Tente de novo.' }]);
  });
});
