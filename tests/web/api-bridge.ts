// Liga o fetch do navegador (jsdom) aos handlers de verdade de api/*.ts,
// com stores em memória. Assim os testes de tela exercitam as regras do
// servidor, sem mock de resposta escrito à mão.

import { vi } from 'vitest';
import type { ApiRequest, ApiResponse } from '../../server/http.js';

type Handler = (req: ApiRequest, res: ApiResponse) => Promise<void> | void;

export function bridgeApi(routes: Record<string, Handler>) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const handler = routes[url.pathname];
    if (!handler) return new Response(JSON.stringify({ error: 'Rota inexistente.' }), { status: 404 });
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((v, k) => { headers[k] = v; });
    const body = typeof init.body === 'string' ? init.body : undefined;
    const method = init.method ?? 'GET';
    calls.push({ path: url.pathname + url.search, method, body: body ? JSON.parse(body) : undefined });
    let status = 200;
    let payload: unknown;
    await handler(
      { method, headers, query: Object.fromEntries(url.searchParams), body },
      {
        status(code) { status = code; return this; },
        json(b) { payload = b; },
        setHeader() {},
      },
    );
    return new Response(JSON.stringify(payload ?? {}), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}
