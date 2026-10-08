// Aprovação em lote (supabase/aprovacoes/*.sql): a versão gravada em cada
// linha tem que ser a do texto que está na mesma linha. Se não for, a questão
// do banco seria liberada com uma versão errada e a da trilha nunca sairia da fila.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTOES } from '../../content/trilha.js';
import lotes from '../../content/banco/lotes.json';
import { versaoDe } from '../../server/professor.js';

const DIR = 'supabase/aprovacoes';
const texto = (s: string) => s.slice(1, -1).replace(/''/g, "'");

// Cada linha do VALUES: ('id', 'versao', 'origem', 'enunciado', '[...]'::jsonb, correta, 'explicacao')
function linhas(sql: string) {
  const re = /^ {2}\(('(?:[^']|'')*'), ('(?:[^']|'')*'), ('(?:[^']|'')*'), ('(?:[^']|'')*'), ('(?:[^']|'')*')::jsonb, (\d+), ('(?:[^']|'')*')\)[,;]?$/gm;
  return [...sql.matchAll(re)].map((m) => ({
    id: texto(m[1]!), versao: texto(m[2]!), origem: texto(m[3]!), enunciado: texto(m[4]!),
    alternativas: JSON.parse(texto(m[5]!)) as string[], correta: Number(m[6]), explicacao: texto(m[7]!),
  }));
}

const banco = new Set(lotes.flatMap((l) => l.arquivos)
  .flatMap((f) => (JSON.parse(readFileSync(`content/banco/${f}`, 'utf8')) as { id: string }[]).map((q) => q.id)));
const trilha = new Set(QUESTOES.map((q) => q.id));

describe('aprovação em lote', () => {
  const arquivos = readdirSync(DIR).filter((f) => f.endsWith('.sql'));

  for (const arquivo of arquivos) {
    it(`${arquivo}: versão confere com o texto, ids únicos e existentes`, () => {
      const sql = readFileSync(`${DIR}/${arquivo}`, 'utf8');
      const rows = linhas(sql);
      const total = Number(/\((\d+): \d+ da trilha e \d+ do banco\)/.exec(sql)?.[1]);
      expect(rows.length).toBe(total);
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
      for (const r of rows) {
        expect(r.versao, r.id).toBe(versaoDe(r));
        expect(r.origem === 'trilha' ? trilha.has(r.id) : r.origem === 'banco' && banco.has(r.id), r.id).toBe(true);
      }
    });
  }

  it('08/10/2026: as 423 questões revisadas (96 da trilha e 327 do banco)', () => {
    const rows = linhas(readFileSync(`${DIR}/2026-10-08_aprovacao_revisada.sql`, 'utf8'));
    expect(rows.filter((r) => r.origem === 'trilha')).toHaveLength(96);
    expect(rows.filter((r) => r.origem === 'banco')).toHaveLength(327);
  });
});
