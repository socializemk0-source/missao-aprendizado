// App instalável (PWA): manifesto, ícones, página sem conexão e o que a
// Vercel precisa servir. Se algo aqui faltar, o celular não oferece
// "Instalar o app" ou o app instalado fica preso numa versão velha.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

// Largura e altura do cabeçalho de um PNG.
function pngSize(path: string): { w: number; h: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

type Icon = { src: string; sizes: string; type: string; purpose?: string };
const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
  name: string; short_name: string; id: string; start_url: string; scope: string; display: string;
  lang: string; theme_color: string; background_color: string; icons: Icon[];
  shortcuts?: { name: string; url: string; icons?: Icon[] }[];
};

describe('manifesto do app', () => {
  it('tem nome, abre em tela cheia e começa dentro do app', () => {
    expect(manifest.name).toBe('Aprova Tico');
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('pt-BR');
    expect(manifest.scope).toBe('/');
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toMatch(/^\/jogar/);
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('ícones de 192 e 512 (e um adaptável do Android) existem com o tamanho certo', () => {
    const any = manifest.icons.filter((i) => (i.purpose ?? 'any') === 'any');
    expect(any.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512']);
    expect(manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true);
    const all = [...manifest.icons, ...(manifest.shortcuts ?? []).flatMap((s) => s.icons ?? [])];
    for (const icon of all) {
      expect(icon.type).toBe('image/png');
      const [w, h] = icon.sizes.split('x').map(Number);
      expect(pngSize(`public${icon.src}`)).toEqual({ w, h });
    }
  });

  it('atalhos levam a telas que existem no app', () => {
    const routes = read('src/app/nav.ts');
    for (const s of manifest.shortcuts ?? []) expect(routes).toContain(`'${s.url}'`);
  });
});

describe('index.html', () => {
  const html = read('index.html');
  it('liga o manifesto e o ícone do iPhone', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Aprova Tico" />');
    expect(pngSize('public/icons/apple-touch-icon.png')).toEqual({ w: 180, h: 180 });
  });
});

describe('página sem conexão', () => {
  const html = read('public/offline.html');
  it('existe, é em português e não depende de nada de fora', () => {
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('Sem conexão');
    expect(html).toContain('Tentar de novo');
    // Tudo que ela usa está guardado no aparelho junto com ela.
    expect(html).not.toMatch(/(src|href)="https?:/);
    for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) expect(existsSync(`public${m[1]}`)).toBe(true);
  });
});

describe('vercel.json', () => {
  const config = JSON.parse(read('vercel.json')) as { headers?: { source: string; headers: { key: string; value: string }[] }[] };
  const headerFor = (source: string, key: string) =>
    config.headers?.find((h) => h.source === source)?.headers.find((h) => h.key === key)?.value;

  it('o service worker e o manifesto nunca ficam presos em cache', () => {
    expect(headerFor('/sw.js', 'Cache-Control')).toMatch(/no-cache|max-age=0/);
    expect(headerFor('/manifest.webmanifest', 'Cache-Control')).toMatch(/no-cache|max-age=0/);
  });
});
