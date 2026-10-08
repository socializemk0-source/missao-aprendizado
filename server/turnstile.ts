// Confere no servidor o token do CAPTCHA (Cloudflare Turnstile). O token vale
// uma vez e por poucos minutos; a Cloudflare diz se é bom, de qual site saiu
// (hostname) e de qual formulário (action). Só a resposta da Cloudflare vale:
// nada do que a tela diz sobre o CAPTCHA é levado em conta.

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Sites de onde o token pode ter saído (TURNSTILE_HOSTNAMES, separados por vírgula).
// Os mesmos domínios cadastrados no widget da Cloudflare (docs/seguranca.md).
export const HOSTNAMES_PADRAO = ['aprovatico.com.br', 'www.aprovatico.com.br', 'missao-aprendizado.vercel.app'];

export type TurnstileResultado =
  | { ok: true }
  | { ok: false; motivo: 'sem-token' | 'recusado' | 'hostname' | 'action' | 'indisponivel' };

export interface VerifyOptions {
  remoteip?: string;
  hostnames?: string[];
  action?: string; // o formulário que pediu o token (ex.: "lead")
  send?: typeof fetch;
}

export async function verifyTurnstile(token: unknown, secret: string, opts: VerifyOptions = {}): Promise<TurnstileResultado> {
  if (typeof token !== 'string' || !token || token.length > 2048) return { ok: false, motivo: 'sem-token' };
  const form = new URLSearchParams({ secret, response: token });
  if (opts.remoteip && opts.remoteip !== 'desconhecido') form.set('remoteip', opts.remoteip);
  let data: { success?: unknown; hostname?: unknown; action?: unknown; 'error-codes'?: unknown };
  try {
    const res = await (opts.send ?? fetch)(SITEVERIFY, { method: 'POST', body: form, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return { ok: false, motivo: 'indisponivel' };
    data = (await res.json()) as typeof data;
  } catch {
    return { ok: false, motivo: 'indisponivel' };
  }
  if (data.success !== true) return { ok: false, motivo: 'recusado' };
  const hostnames = (opts.hostnames ?? HOSTNAMES_PADRAO).map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (typeof data.hostname !== 'string' || !hostnames.includes(data.hostname.toLowerCase())) return { ok: false, motivo: 'hostname' };
  if (opts.action && data.action !== opts.action) return { ok: false, motivo: 'action' };
  return { ok: true };
}
