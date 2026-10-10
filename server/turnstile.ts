// CAPTCHA (Cloudflare Turnstile) conferido no servidor — o ÚNICO lugar que
// fala com a siteverify. Usado no cadastro e no "esqueci a senha"
// (api/auth.ts), na lista de contatos (api/leads.ts) e em toda ação de
// escrita do jogo (api/game.ts).
//
// Regras:
// - Só a resposta da Cloudflare vale: success, o site onde o token nasceu
//   (hostname, em lista fechada) e o formulário que o pediu (action).
// - Token vale UMA vez: a siteverify invalida o token na primeira consulta.
//   Nada aqui tenta de novo com o mesmo token; quem precisa repetir pede um
//   token novo à tela.
// - Erro de rede ou demora (3 s): cada uso decide de forma explícita
//   (POLITICA_REDE). Cadastro, senha, lista e escrita do jogo BLOQUEIAM.
// - Log: só { ok, hostname, action }. Nunca o token, o segredo ou o e-mail.

import type { ApiResponse } from './http.js';
import { log } from './log.js';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const TURNSTILE_TIMEOUT_MS = 3_000;

// Uso → action que o widget da tela manda (a Cloudflare devolve a mesma).
export const ACOES = { cadastro: 'signup', recuperar: 'recover', lead: 'lead', jogo: 'game' } as const;
export type UsoTurnstile = keyof typeof ACOES;

// Se a Cloudflare não responder: bloquear (falha fechada) ou liberar.
// Leituras não pedem CAPTCHA; se um dia pedirem, entram aqui como 'liberar'.
export const POLITICA_REDE: Record<UsoTurnstile, 'bloquear' | 'liberar'> = {
  cadastro: 'bloquear',
  recuperar: 'bloquear',
  lead: 'bloquear',
  jogo: 'bloquear',
};

// Sites aprovados: o domínio do app e, só nas prévias da Vercel, o endereço
// da própria prévia (VERCEL_URL e VERCEL_BRANCH_URL, que a Vercel preenche).
// TURNSTILE_HOSTNAMES acrescenta outros (separados por vírgula).
export const HOSTNAMES_PRODUCAO = ['aprovatico.com.br', 'www.aprovatico.com.br'];

export function hostnamesPermitidos(env: NodeJS.ProcessEnv = process.env): string[] {
  const extra = env.TURNSTILE_HOSTNAMES?.split(',') ?? [];
  const previa = env.VERCEL_ENV === 'preview' ? [env.VERCEL_URL, env.VERCEL_BRANCH_URL] : [];
  return [...new Set([...HOSTNAMES_PRODUCAO, ...previa, ...extra].map((h) => h?.trim().toLowerCase() ?? '').filter(Boolean))];
}

// Sem a chave secreta: em produção, recusa tudo (falha fechada); fora dela
// (desenvolvimento e testes), o CAPTCHA fica desligado.
export function turnstileObrigatorio(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY?.trim()) || env.VERCEL_ENV === 'production';
}

export type MotivoRecusa = 'sem-token' | 'recusado' | 'hostname' | 'action' | 'indisponivel' | 'sem-chave';

export interface TurnstileResultado {
  ok: boolean;
  hostname: string | null;
  action: string | null;
  motivo?: MotivoRecusa | 'desligado';
}

export interface VerifyOptions {
  uso: UsoTurnstile;
  remoteip?: string;
  env?: NodeJS.ProcessEnv;
  send?: typeof fetch;
}

export type VerifyTurnstile = (token: unknown, opts: VerifyOptions) => Promise<TurnstileResultado>;

function registrar(r: TurnstileResultado): TurnstileResultado {
  const linha = { ok: r.ok, hostname: r.hostname, action: r.action };
  if (r.ok) log.info('[turnstile]', linha);
  else log.aviso('[turnstile]', linha);
  return r;
}

export const verifyTurnstile: VerifyTurnstile = async (token, { uso, remoteip, env = process.env, send = fetch }) => {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (!turnstileObrigatorio(env)) return { ok: true, hostname: null, action: null, motivo: 'desligado' };
    log.erro('[turnstile] TURNSTILE_SECRET_KEY ausente em produção — recusando (falha fechada).');
    return registrar({ ok: false, hostname: null, action: null, motivo: 'sem-chave' });
  }
  if (typeof token !== 'string' || !token || token.length > 2048) return registrar({ ok: false, hostname: null, action: null, motivo: 'sem-token' });

  const form = new URLSearchParams({ secret, response: token });
  if (remoteip && remoteip !== 'desconhecido') form.set('remoteip', remoteip);
  let data: { success?: unknown; hostname?: unknown; action?: unknown };
  try {
    const res = await send(SITEVERIFY, { method: 'POST', body: form, signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`siteverify HTTP ${res.status}`);
    data = (await res.json()) as typeof data;
  } catch {
    // Sem resposta da Cloudflare: o uso decide. Não tenta de novo com o mesmo token.
    return registrar({ ok: POLITICA_REDE[uso] === 'liberar', hostname: null, action: null, motivo: 'indisponivel' });
  }

  const hostname = typeof data.hostname === 'string' ? data.hostname.toLowerCase() : null;
  const action = typeof data.action === 'string' ? data.action : null;
  if (data.success !== true) return registrar({ ok: false, hostname, action, motivo: 'recusado' });
  if (!hostname || !hostnamesPermitidos(env).includes(hostname)) return registrar({ ok: false, hostname, action, motivo: 'hostname' });
  if (action !== ACOES[uso]) return registrar({ ok: false, hostname, action, motivo: 'action' });
  return registrar({ ok: true, hostname, action });
};

// Resposta padrão para um CAPTCHA recusado. Devolve true se respondeu.
export function responderCaptcha(res: ApiResponse, r: TurnstileResultado): boolean {
  if (r.ok) return false;
  if (r.motivo === 'indisponivel' || r.motivo === 'sem-chave') {
    res.status(503).json({ error: 'Não deu para confirmar que você não é um robô agora. Tente de novo em instantes.', code: 'captcha_indisponivel' });
  } else {
    res.status(400).json({ error: 'Confirme que você não é um robô e tente de novo.', code: 'captcha_invalido' });
  }
  return true;
}
