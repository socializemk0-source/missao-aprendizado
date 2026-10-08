// POST /api/auth?action=signup | recover — cadastro e "esqueci a senha"
// passam pelo servidor para o CAPTCHA ser conferido AQUI (server/turnstile.ts:
// site aprovado, formulário certo, token usado uma vez só).
//   signup  { name, email, password, captchaToken, redirectTo? }
//   recover { email, captchaToken, redirectTo? }
// Ordem: tamanho do corpo → limite por IP → zod → CAPTCHA → limite por
// e-mail → Supabase Auth. O login (senha e Google) continua direto no
// Supabase, que confere o CAPTCHA do login.
//
// Nunca vão para o log: senha, e-mail, token do CAPTCHA nem a chave.

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { header, jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { LIMITES, clientIp, limitar, postgresLimiter, type RateLimiter } from '../server/limite.js';
import { hostnamesPermitidos, responderCaptcha, verifyTurnstile, type VerifyTurnstile } from '../server/turnstile.js';
import { authErrorMessage, passwordProblem } from '../shared/auth-erros.js';
import { NOME_MAX, NOME_VALIDO } from '../shared/nome.js';

const CORPO_MAX = 10 * 1024;
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const captchaToken = z.string().max(2048).optional();
const redirectTo = z.string().max(300).optional();

const SCHEMAS = {
  signup: z.object({
    name: z.string().trim().min(1).max(NOME_MAX).regex(NOME_VALIDO),
    email,
    password: z.string().min(8).max(72), // 72: limite do bcrypt no Supabase
    captchaToken,
    redirectTo,
  }).strict(),
  recover: z.object({ email, captchaToken, redirectTo }).strict(),
} as const;
type Acao = keyof typeof SCHEMAS;

const CAMINHO: Record<Acao, string> = { signup: '/entrar', recover: '/redefinir-senha' };
const USO = { signup: 'cadastro', recover: 'recuperar' } as const;
const MENSAGEM: Record<string, string> = {
  name: "Digite seu nome (só letras, números, espaços e . ' - _ ( )).",
  email: 'Confira o e-mail digitado.',
  password: 'A senha precisa ter de 8 a 72 caracteres, com letras e números.',
};

// Para onde o link do e-mail leva: só o próprio app (site aprovado; localhost
// fora de produção) e só a tela certa. Nada de redirecionar para fora.
export function redirectPara(raw: string | undefined, acao: Acao, env: NodeJS.ProcessEnv = process.env): string | null {
  const caminho = CAMINHO[acao];
  if (raw === undefined) return `https://www.aprovatico.com.br${caminho}`;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  const local = env.VERCEL_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(u.hostname);
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) return null;
  if (!local && !hostnamesPermitidos(env).includes(u.hostname)) return null;
  if (u.pathname !== caminho || u.search || u.hash || u.username || u.password) return null;
  return `${u.origin}${caminho}`;
}

interface GoTrueErro { code?: unknown; error_code?: unknown; msg?: unknown; message?: unknown; error_description?: unknown }

export function createAuthHandler(deps: {
  env?: NodeJS.ProcessEnv; send?: typeof fetch; limiter?: RateLimiter | null; turnstile?: VerifyTurnstile; now?: () => Date;
} = {}) {
  const { env = process.env, send = fetch, limiter = null, turnstile = verifyTurnstile, now = () => new Date() } = deps;

  return async function authHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
    res.setHeader('Cache-Control', 'no-store');
    const acao = req.query.action;
    if (acao !== 'signup' && acao !== 'recover') return res.status(400).json({ error: 'Ação inválida.', code: 'unknown_action' });

    const tamanho = Math.max(Number(header(req, 'content-length') ?? 0), typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body ?? null).length);
    if (tamanho > CORPO_MAX) return res.status(413).json({ error: 'Envio grande demais.', code: 'payload_too_large' });

    const agora = now();
    const ip = clientIp(req);
    if (!(await limitar(limiter, res, `auth-ip:${ip}`, LIMITES.authPorIpHora, 3600, agora, 'rate_limited'))) return;

    const parsed = SCHEMAS[acao].safeParse(jsonBody(req));
    if (!parsed.success) {
      const campo = parsed.error.issues[0]?.path[0];
      return res.status(400).json({ error: (typeof campo === 'string' && MENSAGEM[campo]) || 'Envio inválido.', code: 'invalid_params' });
    }
    const dados = parsed.data;
    if (acao === 'signup') {
      const problema = passwordProblem((dados as z.output<typeof SCHEMAS.signup>).password);
      if (problema) return res.status(400).json({ error: problema, code: 'invalid_params' });
    }
    const redirect = redirectPara(dados.redirectTo, acao, env);
    if (!redirect) return res.status(400).json({ error: 'Envio inválido.', code: 'invalid_params' });

    // Sem configuração, para antes de gastar o token do CAPTCHA.
    const url = env.SUPABASE_URL?.replace(/\/$/, '');
    const chave = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !chave) {
      console.error('[auth] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes — cadastro e "esqueci a senha" recusados.');
      return res.status(503).json({ error: 'Não foi possível concluir agora. Tente de novo mais tarde.', code: 'auth_indisponivel' });
    }

    // CAPTCHA: token usado uma vez; sem resposta da Cloudflare, bloqueia.
    if (responderCaptcha(res, await turnstile(dados.captchaToken, { uso: USO[acao], remoteip: ip, env }))) return;

    const emailHash = createHash('sha256').update(dados.email).digest('hex').slice(0, 32);
    if (!(await limitar(limiter, res, `auth-email:${emailHash}`, LIMITES.authPorEmailHora, 3600, agora, 'rate_limited'))) return;

    // SERVICE_ROLE — por que é seguro: a chave de administrador vai SÓ para o
    // Supabase Auth, e só para que ele não peça o CAPTCHA de novo (o token já
    // foi gasto e conferido acima; a Cloudflare não aceita o mesmo token duas
    // vezes). O corpo é montado aqui, com só e-mail, senha e nome (validados);
    // nenhum campo de administrador (confirmar e-mail, papel, metadados do
    // app) sai do que o navegador mandou. Não há conta "dona" a filtrar: o
    // pedido cria ou recupera a conta do próprio e-mail digitado, e o link só
    // chega a quem tem acesso a esse e-mail. O redirect é de lista fechada.
    const corpo = acao === 'signup'
      ? { email: dados.email, password: (dados as z.output<typeof SCHEMAS.signup>).password, data: { name: (dados as z.output<typeof SCHEMAS.signup>).name } }
      : { email: dados.email };
    let resposta: Response;
    try {
      resposta = await send(`${url}/auth/v1/${acao}?redirect_to=${encodeURIComponent(redirect)}`, {
        method: 'POST',
        headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      // Só o tipo do erro: a mensagem poderia trazer dados do pedido.
      console.error(`[auth] ${acao}: Supabase Auth sem resposta:`, err instanceof Error ? err.name : 'erro');
      return res.status(502).json({ error: 'Não foi possível concluir agora. Tente de novo.', code: 'auth_indisponivel' });
    }
    const payload = (await resposta.json().catch(() => ({}))) as GoTrueErro & { user?: { identities?: unknown[] }; identities?: unknown[]; access_token?: unknown };

    if (!resposta.ok) {
      const codigo = typeof payload.error_code === 'string' ? payload.error_code : typeof payload.code === 'string' ? payload.code : null;
      console.warn(`[auth] ${acao}: Supabase Auth recusou`, { status: resposta.status, code: codigo });
      if (resposta.status === 429) return res.status(429).json({ error: authErrorMessage('rate limit'), code: 'rate_limited' });
      if (resposta.status >= 500) return res.status(502).json({ error: 'Não foi possível concluir agora. Tente de novo.', code: 'auth_indisponivel' });
      const texto = [payload.msg, payload.message, payload.error_description, codigo?.replace(/_/g, ' ')].find((t) => typeof t === 'string' && t) as string | undefined;
      return res.status(400).json({ error: authErrorMessage(texto ?? ''), code: codigo ?? 'auth_erro' });
    }

    if (acao === 'recover') return res.status(200).json({ ok: true }); // igual com ou sem conta
    // E-mail já cadastrado: o Supabase devolve um usuário sem identidades.
    const identidades = payload.user?.identities ?? payload.identities;
    if (Array.isArray(identidades) && identidades.length === 0) {
      return res.status(409).json({ error: authErrorMessage('User already registered'), code: 'user_already_exists' });
    }
    // Nunca devolve tokens de sessão: quem confirmar o e-mail entra pela tela de login.
    return res.status(200).json({ ok: true, confirmar: !payload.access_token });
  };
}

export default createAuthHandler({ limiter: postgresLimiter });
