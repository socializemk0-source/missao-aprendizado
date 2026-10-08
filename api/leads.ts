// POST /api/leads — entra na lista de contatos da página inicial.
// Público (sem login), então, nesta ordem:
//   1. corpo de até 10 KB;
//   2. limite por IP (3 envios por hora);
//   3. campo-isca para robôs: preenchido → "ok" calado, nada é gravado;
//   4. corpo validado com zod (e-mail, consentimento, tamanhos; campo a mais → 400);
//   5. CAPTCHA (Turnstile) conferido no servidor: success, site e formulário;
//   6. limite por e-mail (3 por dia);
//   7. nome limpo antes de gravar (vai para e-mail/CRM/painel: server/sanitize.ts).
// E-mail repetido responde igual a um novo (não revela quem já está na lista).

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { header, jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { postgresLeads, type LeadStore } from '../server/leads.js';
import { errorText } from '../server/log.js';
import { LIMITES, clientIp, limitar, memoryLimiter, postgresLimiter, type RateLimiter } from '../server/limite.js';
import { textoLimpo } from '../server/sanitize.js';
import { HOSTNAMES_PADRAO, verifyTurnstile } from '../server/turnstile.js';
import { NOME_MAX } from '../shared/nome.js';

export const LEAD_CORPO_MAX = 10 * 1024;
const TOO_MANY = 'too_many_leads';

const leadSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  name: z.string().trim().max(NOME_MAX).optional(),
  consent: z.literal(true),
  source: z.enum(['landing', 'landing-final']).optional(),
  website: z.string().max(200).optional(), // campo-isca (vazio para gente)
  captchaToken: z.string().max(2048).optional(),
}).strict();

const MENSAGEM: Record<string, string> = {
  email: 'Confira o e-mail digitado.',
  name: 'Nome longo demais.',
  consent: 'Marque a autorização para receber nossos e-mails.',
};

export interface CaptchaConfig {
  secret: string | null;
  obrigatorio: boolean; // em produção: sem a chave secreta, recusa (não deixa passar sem CAPTCHA)
  hostnames?: string[];
}

export function captchaDoAmbiente(env: NodeJS.ProcessEnv = process.env): CaptchaConfig {
  const secret = env.TURNSTILE_SECRET_KEY?.trim() || null;
  const hostnames = env.TURNSTILE_HOSTNAMES?.split(',').map((h) => h.trim()).filter(Boolean);
  return { secret, obrigatorio: Boolean(secret) || env.VERCEL_ENV === 'production', hostnames: hostnames?.length ? hostnames : HOSTNAMES_PADRAO };
}

export function createLeadsHandler({
  store, now = Date.now, limiter, captcha = { secret: null, obrigatorio: false }, verify = verifyTurnstile,
}: {
  store: LeadStore; now?: () => number; limiter?: RateLimiter | null; captcha?: CaptchaConfig; verify?: typeof verifyTurnstile;
}) {
  // Conta no banco (vale entre instâncias) e também em memória (se o banco falhar).
  const memoria = memoryLimiter(() => new Date(now()));
  const contador: RateLimiter = {
    async hit(key, limit, windowSec, when) {
      const local = await memoria.hit(key, limit, windowSec, when);
      let banco = true;
      if (limiter) {
        try { banco = await limiter.hit(key, limit, windowSec, when); } catch (err) {
          console.warn('[leads] contador indisponível, usando só a memória:', errorText(err));
        }
      }
      return local && banco;
    },
  };

  return async function leadsHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    const tamanho = Number(header(req, 'content-length') ?? 0);
    const tamanhoCorpo = typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body ?? null).length;
    if (tamanho > LEAD_CORPO_MAX || tamanhoCorpo > LEAD_CORPO_MAX) {
      res.status(413).json({ error: 'Envio grande demais.', code: 'payload_too_large' });
      return;
    }

    const agora = new Date(now());
    const ip = clientIp(req);
    if (!(await limitar(contador, res, `leads-ip:${ip}`, LIMITES.leadsPorIpHora, 3600, agora, TOO_MANY))) return;

    const body = jsonBody(req);
    if (!body) {
      res.status(400).json({ error: 'Envio inválido.', code: 'invalid_params' });
      return;
    }
    // Campo escondido na página: gente não preenche, robô preenche. Resposta
    // igual à de sucesso, sem gravar nada (não dá pista ao robô).
    const isca = body.website;
    if ((typeof isca === 'string' && isca.trim()) || (isca !== undefined && isca !== null && typeof isca !== 'string')) {
      res.status(200).json({ ok: true });
      return;
    }

    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      const campo = parsed.error.issues[0]?.path[0];
      res.status(400).json({ error: (typeof campo === 'string' && MENSAGEM[campo]) || 'Envio inválido.', code: 'invalid_params' });
      return;
    }
    const lead = parsed.data;

    if (captcha.obrigatorio) {
      if (!captcha.secret) {
        console.error('[leads] TURNSTILE_SECRET_KEY não configurada em produção — recusando (fail-closed).');
        res.status(503).json({ error: 'O cadastro na lista está indisponível agora. Tente mais tarde.', code: 'captcha_indisponivel' });
        return;
      }
      const r = await verify(lead.captchaToken, captcha.secret, { remoteip: ip, hostnames: captcha.hostnames, action: 'lead' });
      if (!r.ok) {
        console.warn('[leads] CAPTCHA recusado', { motivo: r.motivo }); // sem token, e-mail nem IP no log
        res.status(r.motivo === 'indisponivel' ? 503 : 400).json({
          error: r.motivo === 'indisponivel' ? 'Não deu para confirmar que você não é um robô. Tente de novo.' : 'Confirme que você não é um robô e tente de novo.',
          code: r.motivo === 'indisponivel' ? 'captcha_indisponivel' : 'captcha_invalido',
        });
        return;
      }
    }

    // O e-mail entra na chave só como hash (a tabela de limites não guarda e-mail).
    const emailHash = createHash('sha256').update(lead.email).digest('hex').slice(0, 32);
    if (!(await limitar(contador, res, `leads-email:${emailHash}`, LIMITES.leadsPorEmailDia, 86_400, agora, TOO_MANY))) return;

    try {
      await store.save({ email: lead.email, name: lead.name ? textoLimpo(lead.name, NOME_MAX) || null : null, source: lead.source ?? 'landing' });
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[leads] erro ao salvar:', errorText(err));
      res.status(500).json({ error: 'Não foi possível salvar agora. Tente de novo.' });
    }
  };
}

export default createLeadsHandler({ store: postgresLeads, limiter: postgresLimiter, captcha: captchaDoAmbiente() });
