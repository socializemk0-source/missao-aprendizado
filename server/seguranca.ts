// Camada única de toda rota da API (cada api/*.ts exporta
// `comSeguranca(handler, { ... })`; tests/server/seguranca.test.ts confere
// que nenhuma ficou de fora). Antes de o handler rodar, ela:
//   1. põe os cabeçalhos de segurança — inclusive em 4xx/5xx e em erro não
//      tratado (os da página vêm do vercel.json; o vercel.json repete estes
//      mesmos valores para /api, e o teste garante que são iguais);
//   2. põe Cache-Control: no-store (resposta por aluno; a rota pode trocar
//      quando a resposta é pública, como /api/config/supabase);
//   3. CORS por lista de origens (o app e, nas prévias, o endereço da
//      própria prévia). Nunca "*", nunca Access-Control-Allow-Credentials
//      (o login vai no header Authorization, não em cookie). Pedido da
//      própria página (Origin com o mesmo host do pedido) → segue, sem CORS.
//      Origem de fora da lista → 403. Sem Origin (servidor chamando, ex.:
//      Mercado Pago) → segue;
//   4. responde o preflight (OPTIONS): só os métodos e headers da rota,
//      cache de 1 dia;
//   5. pega erro não tratado → 500 { error } com os mesmos cabeçalhos.

import type { ApiRequest, ApiResponse } from './http.js';
import { header } from './http.js';
import { errorText } from './log.js';
import { hostnamesPermitidos } from './turnstile.js';

// Para respostas JSON da API: nada pode ser carregado nem emoldurado.
export const CABECALHOS_API: Record<string, string> = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export const PREFLIGHT_MAX_AGE = '86400';

export type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type HeaderPedido = 'Authorization' | 'Content-Type' | 'Idempotency-Key' | 'X-Turnstile-Token';

export interface OpcoesRota {
  metodos: Metodo[];
  headers: HeaderPedido[]; // headers que a tela manda (além dos simples)
  cors?: boolean; // false: rota chamada só por servidor (webhook) — nunca libera CORS
}

// Origens aceitas: https:// + os sites aprovados (os mesmos do CAPTCHA:
// aprovatico.com.br, www e, nas prévias, o endereço da própria prévia).
export function origemPermitida(origin: string, env: NodeJS.ProcessEnv = process.env): boolean {
  let u: URL;
  try { u = new URL(origin); } catch { return false; }
  if (u.origin !== origin) return false; // sem caminho, usuário etc.
  return u.protocol === 'https:' && !u.port && hostnamesPermitidos(env).includes(u.hostname);
}

// A própria página chamando a API (mesmo host; na Vercel, sempre https). No
// navegador, Origin e Host são do próprio navegador (a página não forja).
function mesmaOrigem(origin: string, req: ApiRequest, env: NodeJS.ProcessEnv): boolean {
  const host = header(req, 'x-forwarded-host') ?? header(req, 'host');
  let u: URL;
  try { u = new URL(origin); } catch { return false; }
  if (env.VERCEL_ENV && u.protocol !== 'https:') return false;
  return Boolean(host) && u.host === host;
}

type Handler = (req: ApiRequest, res: ApiResponse) => Promise<void> | void;

export function comSeguranca(handler: Handler, opcoes: OpcoesRota, env: NodeJS.ProcessEnv = process.env): Handler {
  const cors = opcoes.cors !== false;
  return async function rotaSegura(req, res) {
    let respondeu = false;
    const resposta: ApiResponse = {
      status(code) { res.status(code); return resposta; },
      json(body) { respondeu = true; res.json(body); },
      setHeader(name, value) { res.setHeader(name, value); },
      end() { respondeu = true; if (res.end) res.end(); else res.json(null); },
    };

    for (const [k, v] of Object.entries(CABECALHOS_API)) res.setHeader(k, v);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');

    const origin = header(req, 'origin');
    if (origin !== undefined && !mesmaOrigem(origin, req, env)) {
      if (!cors || !origemPermitida(origin, env)) {
        resposta.status(403).json({ error: 'Origem não permitida.', code: 'origin_not_allowed' });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    if (req.method === 'OPTIONS') {
      if (!cors || origin === undefined) {
        res.setHeader('Allow', opcoes.metodos.join(', '));
        resposta.status(405).json({ error: 'Método não permitido.' });
        return;
      }
      const pedido = header(req, 'access-control-request-method');
      if (!pedido || !opcoes.metodos.includes(pedido as Metodo)) {
        resposta.status(403).json({ error: 'Método não permitido.', code: 'origin_not_allowed' });
        return;
      }
      res.setHeader('Access-Control-Allow-Methods', opcoes.metodos.join(', '));
      res.setHeader('Access-Control-Allow-Headers', opcoes.headers.join(', '));
      res.setHeader('Access-Control-Max-Age', PREFLIGHT_MAX_AGE);
      resposta.status(204).end!();
      return;
    }

    try {
      await handler(req, resposta);
    } catch (err) {
      console.error('[api] erro não tratado:', errorText(err));
      if (!respondeu) resposta.status(500).json({ error: 'Algo deu errado. Tente de novo.' });
    }
  };
}
