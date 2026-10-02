// Service worker do Aprova Tico (app instalável).
//
// Regras:
// - Nada da API (/api/*), nada de outros sites (Supabase, Mercado Pago…) e
//   nada que não seja GET passa por aqui: XP, PRO, pagamentos e questões vêm
//   sempre do servidor.
// - Telas: sempre da rede, então versão nova do site chega sozinha. Sem
//   internet, mostra a página "Sem conexão".
// - Arquivos do build (/assets/*, com hash no nome, nunca mudam): guardados
//   na primeira vez. Imagens do Tico e ícones: mostra o guardado e atualiza
//   por trás.
// - Nunca guarda erro nem a página do app que a Vercel devolve no lugar de
//   um arquivo que não existe mais.
//
// Mudou este arquivo? Troque VERSION: o app mostra "Atualizar" para quem já
// tem a versão anterior instalada.

const VERSION = 'v1';
const PREFIX = 'aprova-tico-';
const SHELL = `${PREFIX}shell-${VERSION}`;
const STATIC = `${PREFIX}static-${VERSION}`;
const ASSETS = `${PREFIX}assets`; // nomes com hash: servem para qualquer versão
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png'];
const MAX_ASSETS = 120;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL, STATIC, ASSETS];
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && !keep.includes(name)) await caches.delete(name);
    }
    // Deixa o navegador buscar a tela enquanto o service worker acorda.
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

// O aluno tocou em "Atualizar": a versão nova assume.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(page(event));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else if (/^\/(tico|landing|icons)\//.test(url.pathname) || url.pathname === '/favicon.svg') {
    event.respondWith(staleWhileRevalidate(event));
  }
});

// Só guarda resposta completa e certa (e nunca uma página HTML no lugar de
// um arquivo).
function cacheable(response) {
  if (!response || response.status !== 200 || response.type === 'opaque') return false;
  const type = response.headers.get('content-type') || '';
  return !type.includes('text/html');
}

async function page(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch (err) {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response)) {
    await cache.put(request, response.clone());
    trim(cache).catch(() => {});
  }
  return response;
}

async function staleWhileRevalidate(event) {
  const request = event.request;
  const cache = await caches.open(STATIC);
  // Também vale o que foi guardado na instalação (ícone da página "Sem conexão").
  const hit = (await cache.match(request)) || (await caches.match(request));
  const update = fetch(request).then(async (response) => {
    if (cacheable(response)) await cache.put(request, response.clone());
    return response;
  });
  if (hit) {
    event.waitUntil(update.catch(() => {}));
    return hit;
  }
  return update;
}

// Arquivos de versões antigas vão saindo (os mais antigos primeiro).
async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key);
}
