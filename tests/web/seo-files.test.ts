// Compartilhamento e busca: prévia do link (WhatsApp, Instagram, Google) e o
// que os buscadores podem ler. A imagem precisa de endereço completo.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SITE = 'https://www.aprovatico.com.br';
const html = readFileSync('index.html', 'utf8');
const meta = (attr: 'property' | 'name', key: string) =>
  new RegExp(`<meta ${attr}="${key}" content="([^"]+)"`).exec(html)?.[1];

describe('prévia do link', () => {
  it('tem título, descrição e imagem 1200x630 com endereço completo', () => {
    expect(meta('property', 'og:title')).toMatch(/Aprova Tico/);
    expect(meta('property', 'og:description')).toBeTruthy();
    expect(meta('property', 'og:locale')).toBe('pt_BR');
    expect(meta('property', 'og:image')).toBe(`${SITE}/og.jpg`);
    expect(meta('property', 'og:image:width')).toBe('1200');
    expect(meta('property', 'og:image:height')).toBe('630');
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
  });

  it('a imagem existe, é JPEG 1200x630 e é leve', () => {
    const buf = readFileSync('public/og.jpg');
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    // Procura o cabeçalho de tamanho (SOF0/SOF2) do JPEG.
    let size: { w: number; h: number } | null = null;
    for (let i = 2; i < buf.length - 9 && !size; ) {
      const marker = buf[i + 1]!;
      if (marker === 0xc0 || marker === 0xc2) size = { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      else i += 2 + buf.readUInt16BE(i + 2);
    }
    expect(size).toEqual({ w: 1200, h: 630 });
    expect(statSync('public/og.jpg').size).toBeLessThan(300_000);
  });
});

describe('buscadores', () => {
  it('robots.txt libera o site, fecha a API e aponta o sitemap', () => {
    const robots = readFileSync('public/robots.txt', 'utf8');
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Disallow: \/api\/$/m);
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  it('sitemap.xml lista só as páginas públicas', () => {
    expect(existsSync('public/sitemap.xml')).toBe(true);
    const urls = [...readFileSync('public/sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls).toEqual([`${SITE}/`, `${SITE}/cadastro`, `${SITE}/entrar`, `${SITE}/termos`, `${SITE}/privacidade`]);
  });
});
