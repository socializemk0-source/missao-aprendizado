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
//   5. dá um requestId a cada pedido (header X-Request-Id; vai na frente de
//      cada linha de log do pedido — server/log.ts);
//   6. padroniza todo erro 5xx: { error: mensagem amigável, code, requestId }.
//      Nada de stack, SQL ou nome de tabela na resposta: mensagem que pareça
//      detalhe técnico é trocada pela genérica. O detalhe fica só no log,
//      com o mesmo requestId. Erro não tratado → 500 nesse formato.

import type { ApiRequest, ApiResponse } from './http.js';
import { header } from './http.js';
import { randomUUID } from 'node:crypto';
import { comRequestId, errorText, log } from './log.js';
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

export const ERRO_GENERICO = 'Algo deu errado do nosso lado. Tente de novo em instantes.';

// Cara de detalhe técnico (stack, SQL, tabela, driver): não vai para a tela.
const TECNICO = /\n\s*at |\bat .+:\d+:\d+|\b(select|insert|update|delete)\b[\s\S]*\b(from|into|set|where)\b|\b(v2|public|auth)\.[a-z_]+|relation "|column "|syntax error|violates|ECONN|ETIMEDOUT|postgres|drizzle|pg_|sqlstate|stack|TypeError|ReferenceError|undefined|null\b/i;

export function corpoDeErro5xx(body: unknown, requestId: string): { error: string; code: string; requestId: string } {
  const b = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const error = typeof b.error === 'string' && b.error.length <= 300 && !TECNICO.test(b.error) ? b.error : ERRO_GENERICO;
  const code = typeof b.code === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(b.code) ? b.code : 'erro_interno';
  return { error, code, requestId };
}

export function comSeguranca(handler: Handler, opcoes: OpcoesRota, env: NodeJS.ProcessEnv = process.env): Handler {
  const cors = opcoes.cors !== false;
  return function rotaSegura(req, res) {
    const requestId = randomUUID();
    return comRequestId(requestId, () => atender(req, res, requestId));
  };

  async function atender(req: ApiRequest, res: ApiResponse, requestId: string): Promise<void> {
    let respondeu = false;
    let status = 200;
    const resposta: ApiResponse = {
      status(code) { status = code; res.status(code); return resposta; },
      json(body) {
        respondeu = true;
        if (status < 500) return res.json(body);
        const corpo = corpoDeErro5xx(body, requestId);
        log.erro('[api] resposta', status, { code: corpo.code, metodo: req.method, acao: req.query.action });
        res.json(corpo);
      },
      setHeader(name, value) { res.setHeader(name, value); },
      end() { respondeu = true; if (res.end) res.end(); else res.json(null); },
    };

    for (const [k, v] of Object.entries(CABECALHOS_API)) res.setHeader(k, v);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Request-Id', requestId);
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
      // O detalhe (com stack) só no log; a tela recebe o corpo padrão.
      // Do stack, só as linhas "at ..." (a primeira repete a mensagem, que no Drizzle traz os parâmetros).
      const pilha = err instanceof Error ? (err.stack ?? '').split('\n').filter((l) => l.trim().startsWith('at ')).join('\n') : '';
      log.erro('[api] erro não tratado:', errorText(err), pilha);
      if (!respondeu) resposta.status(500).json({ code: 'erro_interno' });
    }
  }
}
