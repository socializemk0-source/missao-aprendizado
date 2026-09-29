// Questões autorais que esperam revisão (content/banco/autorais.json).
// Entram no banco pela migração 0007 com status 'revisao' e só chegam ao
// aluno quando um professor muda para 'ativa'.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTOES } from '../../content/trilha.js';
import type { Questao } from '../../content/types.js';
import banco from '../../content/banco/autorais.json';

type Item = Questao & { status: string };
const itens = banco as unknown as Item[];
const DISCIPLINAS = ['portugues', 'rlm', 'informatica', 'constitucional', 'administrativo'];
const ESTILOS = ['Cebraspe', 'FGV', 'FCC', 'Vunesp', 'Cesgranrio'];

describe('banco de questões autorais', () => {
  it('ids únicos e sem colidir com as questões da trilha', () => {
    const ids = itens.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    const trilha = new Set(QUESTOES.map((q) => q.id));
    expect(ids.filter((id) => trilha.has(id))).toEqual([]);
  });

  it('cada questão é jogável, autoral e entra em revisão', () => {
    for (const q of itens) {
      expect(DISCIPLINAS, q.id).toContain(q.disciplina);
      expect(q.alternativas.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.alternativas.length, q.id).toBeLessThanOrEqual(5);
      expect(new Set(q.alternativas).size, q.id).toBe(q.alternativas.length);
      expect(Number.isInteger(q.correta) && q.correta >= 0 && q.correta < q.alternativas.length, q.id).toBe(true);
      expect(q.enunciado.trim().length, q.id).toBeGreaterThan(10);
      expect(q.explicacao.trim().length, q.id).toBeGreaterThan(20);
      expect([1, 2, 3], q.id).toContain(q.dificuldade);
      expect(q.fonte.tipo, q.id).toBe('autoral');
      if (q.fonte.tipo === 'autoral' && q.fonte.estilo) expect(ESTILOS, q.id).toContain(q.fonte.estilo);
      expect(q.status, q.id).toBe('revisao');
      if (q.alternativas.join() === 'Certo,Errado') expect(q.explicacao.startsWith(q.alternativas[q.correta]!), q.id).toBe(true);
    }
  });

  it('a migração 0007 traz todas as questões do arquivo (rode scripts/banco-sql.mjs ao mudar o JSON)', () => {
    const sql = readFileSync('supabase/migrations/0007_v2_questoes_autorais.sql', 'utf8');
    expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
    expect(sql.match(/^ {2}\('/gm)).toHaveLength(itens.length);
    for (const q of itens) expect(sql, q.id).toContain(`('${q.id}', '${q.disciplina}'`);
  });
});

describe.runIf(process.env.PG_TEST === '1')('banco autoral no Postgres', async () => {
  const { postgresGame } = await import('../../server/game-pg.js');

  it('questão em revisão não aparece no catálogo nem pode ser respondida', async () => {
    const id = itens[0]!.id;
    expect((await postgresGame.questions.catalog()).some((c) => c.id === id)).toBe(false);
    expect((await postgresGame.questions.get([id])).has(id)).toBe(false);
  });
});
