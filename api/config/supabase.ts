// GET /api/config/supabase — URL e chave pública (anon) do Supabase para o
// navegador, a chave pública do CAPTCHA (Cloudflare Turnstile), se houver, e a
// versão do build. As chaves são feitas para serem públicas; a proteção real
// está no servidor (que valida o token de cada requisição) e no Supabase (RLS
// e CAPTCHA). Mesmo assim, é o "balcão" que entrega tudo de uma vez: tem
// limite por IP (LIMITES.configPorMinuto). A resposta de sucesso fica 5 min
// na CDN, então só os pedidos que chegam à Function contam no limite.

import { methodNotAllowed, type ApiRequest, type ApiResponse } from '../../server/http.js';
import { LIMITES, clientIp, limitar, postgresLimiter, type RateLimiter } from '../../server/limite.js';
import { log } from '../../server/log.js';
import { comSeguranca } from '../../server/seguranca.js';
import { versaoDoBuild } from '../../shared/versao.js';

export function createConfigHandler(deps: { limiter?: RateLimiter | null; env?: NodeJS.ProcessEnv } = {}) {
  const { limiter = null, env = process.env } = deps;
  return async function configHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    if (!(await limitar(limiter, res, `config:${clientIp(req)}`, LIMITES.configPorMinuto, 60, new Date(), 'rate_limited'))) return;
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseAnonKey = env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      log.erro('[config] SUPABASE_URL/SUPABASE_ANON_KEY não configuradas.');
      res.status(503).json({ error: 'Login indisponível no momento.', code: 'config_indisponivel' });
      return;
    }
    // Igual para todo mundo: pode ficar em cache (erro e 429 não: no-store da camada de segurança).
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.status(200).json({
      supabaseUrl, supabaseAnonKey, captchaSiteKey: env.TURNSTILE_SITE_KEY?.trim() || null,
      version: versaoDoBuild(env), // o app compara com a dele (src/lib/versao.ts)
    });
  };
}

export default comSeguranca(createConfigHandler({ limiter: postgresLimiter }), { metodos: ['GET'], headers: [] });
