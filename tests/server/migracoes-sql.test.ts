// Migrações rodam no SQL Editor do Supabase, que lê "SELECT ... INTO x" como
// criação da tabela "x" e enfia um "ALTER TABLE x ENABLE ROW LEVEL SECURITY"
// no meio do bloco DO $$ ... $$ — o script quebra ("unterminated
// dollar-quoted string"). Dentro de blocos, use atribuição: x := (SELECT ...).
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = 'supabase/migrations';
const semComentarios = (sql: string) => sql.replace(/--.*$/gm, '');

describe('migrações', () => {
  it('nenhuma usa SELECT ... INTO (quebra no SQL Editor do Supabase)', () => {
    for (const arquivo of readdirSync(DIR).filter((f) => f.endsWith('.sql'))) {
      const comandos = semComentarios(readFileSync(`${DIR}/${arquivo}`, 'utf8')).split(';');
      for (const comando of comandos) {
        if (/\bINSERT\s+INTO\b/i.test(comando)) continue;
        expect(/\bSELECT\b[\s\S]*\bINTO\b/i.test(comando), `${arquivo}: "SELECT ... INTO" — use "x := (SELECT ...)"`).toBe(false);
      }
    }
  });
});
