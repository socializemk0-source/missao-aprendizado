// Variáveis secretas só nas Functions (api/ e server/). O Vite só embute no
// bundle o que começa com VITE_ (import.meta.env); o código do navegador
// (src/ e shared/) não lê process.env nem cita variável secreta.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SECRETAS = ['TURNSTILE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET', 'SQL_PASSWORD', 'SUPABASE_DB_URL', 'BACKUP_PASSPHRASE'];
const VITE_PERMITIDAS = ['VITE_EXIGIR_CONSENTIMENTO', 'VITE_APP_VERSION'];

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? arquivos(p) : /\.(ts|tsx|js|mjs)$/.test(p) ? [p] : [];
  });
}

describe('variáveis secretas', () => {
  it('o código do navegador (src/) e o compartilhado (shared/) não leem process.env nem citam segredo', () => {
    for (const arquivo of [...arquivos('src'), ...arquivos('shared')]) {
      const codigo = readFileSync(arquivo, 'utf8');
      expect([arquivo, /process\.env/.test(codigo)]).toEqual([arquivo, arquivo === 'shared/versao.ts' ? /process\.env/.test(codigo) : false]);
      for (const nome of SECRETAS) expect([arquivo, codigo.includes(nome)]).toEqual([arquivo, false]);
    }
  });

  it('só variáveis VITE_ conhecidas (nenhuma secreta) chegam ao bundle', () => {
    const usadas = new Set([...arquivos('src')].flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/import\.meta\.env\.(VITE_[A-Z_]+)/g)].map((m) => m[1]!)));
    expect([...usadas].filter((v) => !VITE_PERMITIDAS.includes(v))).toEqual([]);
    const exemplo = readFileSync('.env.example', 'utf8');
    expect([...exemplo.matchAll(/^(VITE_[A-Z_]+)=/gm)].map((m) => m[1]).filter((v) => !VITE_PERMITIDAS.includes(v!))).toEqual([]);
    const vite = readFileSync('vite.config.ts', 'utf8');
    expect(vite).not.toMatch(/envPrefix|define\s*:/); // nada de embutir outras variáveis
  });
});
