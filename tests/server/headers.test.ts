// Cabeçalhos de segurança que a Vercel manda em toda resposta (vercel.json).
// A CSP lista exatamente o que o app pode carregar; o script embutido do
// index.html (tema antes de desenhar) entra pelo hash — se alguém mudar o
// script sem atualizar o hash, este teste avisa (senão o navegador o bloqueia).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Rule = { source: string; headers: { key: string; value: string }[] };
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: Rule[] };
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
  });

  it('o script embutido do index.html está liberado pelo hash certo', () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
    expect(scripts).toHaveLength(1);
    const hash = `'sha256-${createHash('sha256').update(scripts[0]!).digest('base64')}'`;
    expect(directive(headersFor('/')['Content-Security-Policy']!, 'script-src')).toContain(hash);
  });

  it('a página "Sem conexão" (estática, com estilo e script embutidos) tem a regra própria', () => {
    const csp = headersFor('/offline.html')['Content-Security-Policy']!;
    expect(directive(csp, 'script-src')).toContain("'unsafe-inline'");
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self'");
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
  });
});
