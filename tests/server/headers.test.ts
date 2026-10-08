// Cabeçalhos de segurança que a Vercel manda em toda resposta (vercel.json).
// A CSP lista exatamente o que o app pode carregar; o script embutido do
// index.html (tema antes de desenhar) entra pelo hash — se alguém mudar o
// script sem atualizar o hash, este teste avisa (senão o navegador o bloqueia).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { versaoNoHtml } from '../../shared/versao.js';
import { describe, expect, it } from 'vitest';

type Rule = { source: string; headers: { key: string; value: string }[] };
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: Rule[]; rewrites: { source: string; destination: string }[] };
const html = readFileSync('index.html', 'utf8');

// Cabeçalhos que valem para um caminho (a regra mais abaixo vence, como na Vercel).
function headersFor(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rule of vercel.headers) {
    if (new RegExp(`^${rule.source.replace(/\(\.\*\)/g, '(.*)')}$`).test(path)) for (const h of rule.headers) out[h.key] = h.value;
  }
  return out;
}

const directive = (csp: string, name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';

describe('cabeçalhos de segurança', () => {
  it('toda página e toda rota da API recebem os cabeçalhos básicos', () => {
    for (const path of ['/', '/hoje', '/api/game', '/assets/index-abc.js']) {
      const h = headersFor(path);
      expect(h['X-Content-Type-Options'], path).toBe('nosniff');
      expect(h['X-Frame-Options'], path).toBe('DENY');
      expect(h['Referrer-Policy'], path).toBe('strict-origin-when-cross-origin');
      expect(h['Strict-Transport-Security'], path).toMatch(/max-age=\d{8,}/);
      expect(h['Permissions-Policy'], path).toContain('camera=()');
      expect(h['Content-Security-Policy'], path).toBeDefined();
    }
  });

  it('CSP: só o próprio site, o Supabase, o CAPTCHA e o pixel da Meta; nada de eval, objeto ou moldura de outro site', () => {
    const csp = headersFor('/hoje')['Content-Security-Policy']!;
    expect(directive(csp, 'default-src')).toBe("default-src 'self'");
    expect(directive(csp, 'script-src')).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://www.facebook.com");
    expect(directive(csp, 'script-src')).toContain('https://connect.facebook.net');
    expect(directive(csp, 'img-src')).toContain('https://www.facebook.com');
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    // Caminho alternativo do pixel (formulário numa moldura escondida): só o domínio da Meta.
    expect(directive(csp, 'form-action')).toBe("form-action 'self' https://www.facebook.com");
    expect(directive(csp, 'frame-src')).toBe('frame-src https://challenges.cloudflare.com https://www.facebook.com');
    // Servidores de nuvem que o pixel tenta usar (…on.aws, …run.app) seguem bloqueados.
    expect(csp).not.toMatch(/on\.aws|run\.app/);
  });

  it('o script embutido do index.html está liberado pelo hash certo', () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
    expect(scripts).toHaveLength(1);
    const hash = `'sha256-${createHash('sha256').update(scripts[0]!).digest('base64')}'`;
    expect(directive(headersFor('/')['Content-Security-Policy']!, 'script-src')).toContain(hash);
  });

  it('na página inicial, o script embutido antecipa a imagem principal do celular (LCP)', () => {
    const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!)[0]!;
    expect(script).toContain('/landing/hero-mobile.webp');
    expect(script).toContain("rel = 'preload'");
    expect(script).toContain('(max-width: 640px)');
  });

  it('a página "Sem conexão" (estática, com estilo e script embutidos) tem a regra própria', () => {
    const csp = headersFor('/offline.html')['Content-Security-Policy']!;
    expect(directive(csp, 'script-src')).toContain("'unsafe-inline'");
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self'");
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
  });

  it('API: CORS não é fixo no vercel.json (a camada de server/seguranca.ts decide por origem); nunca "*"', () => {
    for (const path of ['/api/me', '/api/game', '/api/pagamentos/webhook']) {
      const h = headersFor(path);
      expect(h['Access-Control-Allow-Origin'], path).toBeUndefined();
      expect(h['Access-Control-Allow-Credentials'], path).toBeUndefined();
      expect(h['Content-Security-Policy'], path).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    }
    for (const rule of vercel.headers) for (const h of rule.headers) expect(h.value, `${rule.source} ${h.key}`).not.toBe('*');
  });

  it('a página do app (index.html) é revalidada a cada acesso, para não servir versão velha', () => {
    for (const path of ['/', '/hoje', '/index.html']) expect(headersFor(path)['Cache-Control'], path).toBe('public, max-age=0, must-revalidate');
    for (const path of ['/', '/hoje', '/index.html']) {
      // Nada de cache longo para a página: nem max-age, nem s-maxage, nem immutable.
      expect(headersFor(path)['Cache-Control'], path).not.toMatch(/s-maxage|immutable|max-age=[1-9]/);
    }
    expect(headersFor('/api/me')['Cache-Control']).toBeUndefined();
  });

  it('arquivos do build (/assets/<nome>-<hash>): cache de 1 ano, imutável', () => {
    for (const path of ['/assets/index-D4rJrvOD.js', '/assets/index-Df-K7v7i.css', '/assets/Hoje-1mltXUjv.js']) {
      expect(headersFor(path)['Cache-Control'], path).toBe('public, max-age=31536000, immutable');
    }
    // Só o build escreve em /assets (com hash): nada de public/assets sem hash.
    expect(existsSync('public/assets')).toBe(false);
  });

  it('arquivo de /assets que não existe mais dá 404 (não a página do app, que quebraria o import)', () => {
    const vaiParaApp = (path: string) => vercel.rewrites.some((r) => new RegExp(`^${r.source}$`).test(path));
    expect(vaiParaApp('/hoje')).toBe(true);
    expect(vaiParaApp('/assets/Hoje-velho.js')).toBe(false);
    expect(vaiParaApp('/api/me')).toBe(false);
  });

  it('o index.html leva a versão do build (o HTML e o ETag mudam a cada deploy)', () => {
    const comVersao = versaoNoHtml(html, 'abc123def456');
    expect(comVersao).toContain('<meta name="app-version" content="abc123def456" />');
    expect(versaoNoHtml(comVersao, 'outra')).toContain('content="outra"');
    expect(versaoNoHtml(comVersao, 'outra').match(/app-version/g)).toHaveLength(1);
    expect(versaoNoHtml(html, '"><script>')).toContain('content="script"');
  });
});
