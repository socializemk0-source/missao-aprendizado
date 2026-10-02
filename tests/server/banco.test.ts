// Questões autorais que esperam revisão (content/banco/*.json).
// Entram no banco pelas migrações listadas em content/banco/lotes.json, com
// status 'revisao', e só chegam ao aluno quando um professor muda para 'ativa'.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTOES } from '../../content/trilha.js';
import type { Questao } from '../../content/types.js';
import lotes from '../../content/banco/lotes.json';

type Item = Questao & { status: string };
const porArquivo = new Map<string, Item[]>(
  lotes.flatMap((l) => l.arquivos).map((f) => [f, JSON.parse(readFileSync(`content/banco/${f}`, 'utf8')) as Item[]]),
);
const itens = [...porArquivo.values()].flat();
const DISCIPLINAS = ['portugues', 'rlm', 'informatica', 'constitucional', 'administrativo'];
const ESTILOS = ['Cebraspe', 'FGV', 'FCC', 'Vunesp', 'Cesgranrio'];

// Trincas de palavras (enunciado + alternativas), para achar questões quase iguais.
const trincas = (s: string) => {
  const w = s.toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return new Set(w.slice(2).map((_, i) => w.slice(i, i + 3).join(' ')));
};
const parecido = (a: Set<string>, b: Set<string>) => {
  let comum = 0;
  for (const t of a) if (b.has(t)) comum++;
  return comum / Math.max(1, Math.min(a.size, b.size));
};

describe('banco de questões autorais', () => {
  it('ids únicos em todos os lotes e sem colidir com as questões da trilha', () => {
    const ids = itens.map((q) => q.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const trilha = new Set(QUESTOES.map((q) => q.id));
    expect(ids.filter((id) => trilha.has(id))).toEqual([]);
  });

  it('cada questão é jogável, autoral e entra em revisão', () => {
    for (const q of itens) {
      expect(DISCIPLINAS, q.id).toContain(q.disciplina);
      expect(q.assunto.trim().length, q.id).toBeGreaterThan(2);
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
      // As alternativas são embaralhadas: a explicação não pode citar letra.
      expect(q.explicacao, q.id).not.toMatch(/\b(letra|alternativa|op[cç][aã]o) [A-E]\b/);
      // Nem a posição ("a terceira opção", "na última frase"): muda a cada embaralhamento.
      expect(q.explicacao, q.id).not.toMatch(/(?<!\p{L})(primeir|segund|terceir|quart|quint|[uú]ltim|pen[uú]ltim)[ao]s? (op[cç]|alternativ|frase|item)/iu);
    }
  });

  it('nenhuma questão é quase igual a outra (banco e trilha)', () => {
    const todas = [...QUESTOES, ...itens].map((q) => ({ id: q.id, t: trincas([q.enunciado, ...q.alternativas].join(' ')) }));
    const repetidas: string[] = [];
    for (let i = 0; i < todas.length; i++) {
      for (let j = i + 1; j < todas.length; j++) {
        if (todas[i]!.t.size >= 4 && parecido(todas[i]!.t, todas[j]!.t) > 0.8) repetidas.push(`${todas[i]!.id} ~ ${todas[j]!.id}`);
      }
    }
    expect(repetidas).toEqual([]);
  });

  it('a resposta certa não se concentra numa mesma letra', () => {
    for (const [arquivo, lista] of porArquivo) {
      const cinco = lista.filter((q) => q.alternativas.length === 5);
      if (cinco.length < 20) continue;
      const porLetra = [0, 1, 2, 3, 4].map((l) => cinco.filter((q) => q.correta === l).length);
      expect(Math.max(...porLetra) / cinco.length, `${arquivo}: ${porLetra.join(' ')}`).toBeLessThanOrEqual(0.3);
    }
  });

  it('cada lote tem sua migração com todas as questões (rode scripts/banco-sql.mjs ao mudar um JSON)', () => {
    for (const lote of lotes) {
      const sql = readFileSync(`supabase/migrations/${lote.migracao}`, 'utf8');
      const doLote = lote.arquivos.flatMap((f) => porArquivo.get(f)!);
      expect(sql, lote.migracao).toContain('ON CONFLICT (id) DO NOTHING');
      expect(sql.match(/^ {2}\('/gm), lote.migracao).toHaveLength(doLote.length);
      for (const q of doLote) expect(sql, q.id).toContain(`('${q.id}', '${q.disciplina}'`);
    }
  });

  it('a migração de sincronização leva o texto atual de cada questão (só as que ainda estão em revisão)', () => {
    const sql = readFileSync('supabase/migrations/0013_v2_banco_sincroniza.sql', 'utf8');
    expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
    expect(sql).toContain("WHERE v2.questions.status = 'revisao'");
    expect(sql.match(/^ {2}\('/gm)).toHaveLength(itens.length);
    const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
    for (const q of itens) {
      expect(sql, q.id).toContain(`(${lit(q.id)}, ${lit(q.disciplina)}, ${lit(q.assunto)}, ${lit(q.enunciado)}, ${lit(JSON.stringify(q.alternativas))}::jsonb, ${q.correta}, ${lit(q.explicacao)},`);
    }
  });
});

describe.runIf(process.env.PG_TEST === '1')('banco autoral no Postgres', async () => {
  const { postgresGame } = await import('../../server/game-pg.js');

  it('questão em revisão não aparece no catálogo nem pode ser respondida', async () => {
    const catalogo = await postgresGame.questions.catalog();
    for (const id of [itens[0]!.id, itens[itens.length - 1]!.id]) {
      expect(catalogo.some((c) => c.id === id), id).toBe(false);
      expect((await postgresGame.questions.get([id])).has(id), id).toBe(false);
    }
  });
});
