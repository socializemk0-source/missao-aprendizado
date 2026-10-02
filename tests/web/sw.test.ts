// Service worker (public/sw.js): roda o arquivo de verdade numa caixa de
// areia, com cache e rede falsos. Regras que protegem o aluno:
// - nada da API (/api/*), nada de outro site e nada que não seja GET passa
//   pelo cache: XP, PRO, pagamentos e questões sempre vêm do servidor;
// - telas sempre da rede (versão nova chega sozinha); sem internet, a
//   página "Sem conexão";
// - arquivos com hash (/assets/*) ficam guardados; a página do app que a
//   Vercel devolve no lugar de um arquivo que não existe nunca é guardada.
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

const ORIGIN = 'https://app.test';
const code = readFileSync('public/sw.js', 'utf8');

type Handler = (event: unknown) => void;
const TYPES: Record<string, string> = { html: 'text/html', png: 'image/png', webp: 'image/webp', js: 'text/javascript' };
const keyOf = (r: string | { url: string }) => new URL(typeof r === 'string' ? r : r.url, ORIGIN).href;

class FakeCache {
  store = new Map<string, Response>();
  async match(r: string | { url: string }) { return this.store.get(keyOf(r))?.clone(); }
  async put(r: string | { url: string }, res: Response) { this.store.set(keyOf(r), res); }
  async add(r: string) {
    const res = await env.fetch(new Request(keyOf(r)));
    if (!res.ok) throw new Error(`falhou: ${r}`);
    await this.put(r, res);
  }
  async addAll(list: string[]) { for (const r of list) await this.add(r); }
  async keys() { return [...this.store.keys()].map((url) => new Request(url)); }
  async delete(r: string | { url: string }) { return this.store.delete(keyOf(r)); }
}

let env: {
  handlers: Record<string, Handler[]>;
  caches: Map<string, FakeCache>;
  fetch: Mock<(req: Request) => Promise<Response>>;
  self: Record<string, unknown>;
};

function load() {
  const caches = new Map<string, FakeCache>();
  const handlers: Record<string, Handler[]> = {};
  const self = {
    location: { origin: ORIGIN, href: `${ORIGIN}/sw.js` },
    addEventListener: (type: string, fn: Handler) => { (handlers[type] ??= []).push(fn); },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
    registration: { navigationPreload: { enable: vi.fn(async () => {}) } },
  };
  const cacheStorage = {
    open: async (name: string) => { if (!caches.has(name)) caches.set(name, new FakeCache()); return caches.get(name)!; },
    keys: async () => [...caches.keys()],
    delete: async (name: string) => caches.delete(name),
    match: async (r: string | { url: string }) => {
      for (const c of caches.values()) { const hit = await c.match(r); if (hit) return hit; }
      return undefined;
    },
  };
  // Rede falsa: arquivos de public/ quando existem; senão, um texto que diz o caminho.
  const fetch = vi.fn(async (req: Request): Promise<Response> => {
    const path = new URL(req.url).pathname;
    const file = `public${path}`;
    if (path !== '/' && existsSync(file)) return new Response(new Uint8Array(readFileSync(file)), { headers: { 'content-type': TYPES[path.split('.').pop()!] ?? 'application/octet-stream' } });
    return page(`rede: ${path}`);
  });
  env = { handlers, caches, fetch, self };
  runInNewContext(code, { self, caches: cacheStorage, fetch: (r: Request) => env.fetch(r), URL, Request, Response, console });
}

function page(body: string, type = 'text/html', status = 200) {
  return new Response(body, { status, headers: { 'content-type': type } });
}

// Dispara um evento e espera tudo que ele pediu (waitUntil / respondWith).
async function fire(type: string, extra: Record<string, unknown> = {}) {
  const waits: Promise<unknown>[] = [];
  const box: { response?: Promise<Response> } = {};
  const event = {
    ...extra,
    waitUntil: (p: Promise<unknown>) => { waits.push(p); },
    respondWith: (p: Promise<Response> | Response) => { box.response = Promise.resolve(p); },
  };
  for (const fn of env.handlers[type] ?? []) fn(event);
  const res = box.response ? await box.response : undefined;
  await Promise.all(waits);
  return res;
}

function get(path: string, init: { mode?: string; method?: string; origin?: string } = {}) {
  const request = { url: `${init.origin ?? ORIGIN}${path}`, method: init.method ?? 'GET', mode: init.mode ?? 'cors' };
  return fire('fetch', { request, preloadResponse: Promise.resolve(undefined) });
}

const offline = () => env.fetch.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
const cacheNames = () => [...env.caches.keys()];

beforeEach(async () => {
  load();
  await fire('install');
  await fire('activate');
  env.fetch.mockClear();
});

describe('service worker', () => {
  it('na instalação guarda a página "Sem conexão" e o que ela usa', async () => {
    const offlineHtml = readFileSync('public/offline.html', 'utf8');
    const used = [...offlineHtml.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => `${ORIGIN}${m[1]}`);
    const saved = (await Promise.all([...env.caches.values()].map((c) => c.keys()))).flat().map((r) => r.url);
    expect(saved).toContain(`${ORIGIN}/offline.html`);
    for (const u of used) expect(saved).toContain(u);
  });

  it('não mexe na API, em outros sites nem em envios (POST)', async () => {
    expect(await get('/api/me')).toBeUndefined();
    expect(await get('/api/pagamentos?action=verificar')).toBeUndefined();
    expect(await get('/jogar', { method: 'POST', mode: 'navigate' })).toBeUndefined();
    expect(await get('/v1/payments', { origin: 'https://api.mercadopago.com' })).toBeUndefined();
    expect(await get('/auth/v1/user', { origin: 'https://abc.supabase.co' })).toBeUndefined();
    expect(env.fetch).not.toHaveBeenCalled();
  });

  it('telas vêm sempre da rede e não são guardadas', async () => {
    const res = await get('/jogar', { mode: 'navigate' });
    expect(await res!.text()).toBe('rede: /jogar');
    const again = await get('/jogar', { mode: 'navigate' });
    expect(await again!.text()).toBe('rede: /jogar');
    expect(env.fetch).toHaveBeenCalledTimes(2);
  });

  it('sem internet, qualquer tela mostra "Sem conexão"', async () => {
    offline();
    const res = await get('/simulados', { mode: 'navigate' });
    expect(await res!.text()).toContain('Sem conexão');
  });

  it('usa a resposta antecipada do navegador quando existe', async () => {
    const res = await fire('fetch', {
      request: { url: `${ORIGIN}/perfil`, method: 'GET', mode: 'navigate' },
      preloadResponse: Promise.resolve(page('antecipada')),
    });
    expect(await res!.text()).toBe('antecipada');
    expect(env.fetch).not.toHaveBeenCalled();
  });

  it('arquivos do build (/assets) ficam guardados depois da primeira vez', async () => {
    env.fetch.mockImplementation(async () => page('js', 'text/javascript'));
    await get('/assets/index-abc123.js');
    offline();
    const res = await get('/assets/index-abc123.js');
    expect(await res!.text()).toBe('js');
    expect(env.fetch).toHaveBeenCalledTimes(1);
  });

  it('não guarda a página do app que a Vercel devolve no lugar de um arquivo que sumiu', async () => {
    env.fetch.mockImplementation(async () => page('<!doctype html>', 'text/html'));
    await get('/assets/velho-999.js');
    env.fetch.mockImplementation(async () => page('js novo', 'text/javascript'));
    const res = await get('/assets/velho-999.js');
    expect(await res!.text()).toBe('js novo');
  });

  it('não guarda respostas de erro', async () => {
    env.fetch.mockImplementation(async () => page('x', 'text/javascript', 404));
    await get('/assets/a-1.js');
    env.fetch.mockImplementation(async () => page('ok', 'text/javascript'));
    expect(await (await get('/assets/a-1.js'))!.text()).toBe('ok');
  });

  it('imagens do Tico: mostra a guardada e atualiza por trás; sem internet, continua aparecendo', async () => {
    env.fetch.mockImplementation(async () => page('v1', 'image/webp'));
    expect(await (await get('/tico/acenando.webp'))!.text()).toBe('v1');
    env.fetch.mockImplementation(async () => page('v2', 'image/webp'));
    expect(await (await get('/tico/acenando.webp'))!.text()).toBe('v1');
    expect(await (await get('/tico/acenando.webp'))!.text()).toBe('v2');
    offline();
    expect(await (await get('/tico/acenando.webp'))!.text()).toBe('v2');
  });

  it('sem internet, o ícone da página "Sem conexão" aparece mesmo que nunca tenha sido pedido antes', async () => {
    offline();
    const res = await get('/icons/icon-192.png');
    expect(res!.status).toBe(200);
    expect(res!.headers.get('content-type')).toBe('image/png');
  });

  it('ao ativar uma versão nova, apaga os caches antigos do app (e só os dele)', async () => {
    const before = cacheNames();
    env.caches.set('aprova-tico-shell-v0', new FakeCache());
    env.caches.set('outra-coisa', new FakeCache());
    await fire('activate');
    expect(cacheNames().sort()).toEqual([...before, 'outra-coisa'].sort());
    expect(env.self.clients).toMatchObject({ claim: expect.any(Function) });
  });

  it('só troca de versão quando o aluno pede (botão "Atualizar")', async () => {
    const skip = env.self.skipWaiting as Mock;
    await fire('message', { data: { type: 'OUTRA' } });
    expect(skip).not.toHaveBeenCalled();
    await fire('message', { data: { type: 'SKIP_WAITING' } });
    expect(skip).toHaveBeenCalledTimes(1);
  });
});
