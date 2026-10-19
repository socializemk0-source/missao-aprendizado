// Questões autorais que esperam revisão (content/banco/*.json).
// Entram no banco pelas migrações listadas em content/banco/lotes.json, com
// status 'revisao', e só chegam ao aluno quando um professor muda para 'ativa'.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTOES } from '../../content/trilha.js';
import type { Questao } from '../../content/types.js';
import lotes from '../../content/banco/lotes.json';
import provas from '../../content/banco/provas-oficiais.json';

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

  it('cada questão é jogável, tem origem limpa e entra com o status certo', () => {
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
      expect(['autoral', 'oficial'], q.id).toContain(q.fonte.tipo);
      if (q.fonte.tipo === 'autoral' && q.fonte.estilo) expect(ESTILOS, q.id).toContain(q.fonte.estilo);
      // Oficial entra já liberada (decisão do dono, 19/10/2026): o gabarito é o
      // definitivo da banca, conferido no teste abaixo. Autoral espera o professor.
      expect(q.status, q.id).toBe(q.fonte.tipo === 'oficial' ? 'ativa' : 'revisao');
      if (q.alternativas.join() === 'Certo,Errado') expect(q.explicacao.startsWith(q.alternativas[q.correta]!), q.id).toBe(true);
      // As alternativas são embaralhadas: a explicação não pode citar letra.
      expect(q.explicacao, q.id).not.toMatch(/\b(letra|alternativa|op[cç][aã]o) [A-E]\b/);
      // Nem a posição ("a terceira opção", "na última frase"): muda a cada embaralhamento.
      expect(q.explicacao, q.id).not.toMatch(/(?<!\p{L})(primeir|segund|terceir|quart|quint|[uú]ltim|pen[uú]ltim)[ao]s? (op[cç]|alternativ|frase|item)/iu);
    }
  });

  // Regra 6: questão oficial só com a prova e o gabarito definitivo publicados
  // pela banca (content/banco/provas-oficiais.json). O gabarito de cada item é
  // conferido aqui contra o definitivo; item anulado (X) não entra.
  it('questão oficial: igual à prova registrada e com o gabarito definitivo da banca', () => {
    type Registro = { banca: string; orgao: string; cargo: string; ano: number; formato: 'certo-errado' | 'multipla-escolha'; provaUrl: string; gabaritoUrl: string; gabaritoDescricao?: string; gabaritoDefinitivo: string };
    const registro = provas as Record<string, Registro>;
    for (const [id, p] of Object.entries(registro)) {
      expect(ESTILOS, id).toContain(p.banca);
      expect(p.provaUrl, id).toMatch(/^https:\/\//);
      expect(p.gabaritoUrl, id).toMatch(/^https:\/\//);
      // O arquivo diz que é o definitivo no nome ou, quando a banca publica com
      // nome embaralhado, na descrição da página do concurso.
      expect(`${p.gabaritoUrl} ${p.gabaritoDescricao ?? ''}`, id).toMatch(/DEFINITIVO/i);
      expect(p.gabaritoDefinitivo, id).toMatch(p.formato === 'certo-errado' ? /^[CEX]+$/ : /^[A-EX]+$/);
    }
    const oficiais = itens.filter((q) => q.fonte.tipo === 'oficial');
    expect(oficiais.length).toBeGreaterThan(0);
    const vistos = new Set<string>();
    for (const q of oficiais) {
      const f = q.fonte as { banca: string; orgao: string; cargo: string; ano: number; prova: string; item: number };
      const p = registro[f.prova];
      expect(p, `${q.id}: prova ${f.prova} sem registro`).toBeDefined();
      expect([f.banca, f.orgao, f.cargo, f.ano], q.id).toEqual([p!.banca, p!.orgao, p!.cargo, p!.ano]);
      expect(Number.isInteger(f.item) && f.item >= 1 && f.item <= p!.gabaritoDefinitivo.length, q.id).toBe(true);
      const gabarito = p!.gabaritoDefinitivo[f.item - 1];
      expect(gabarito, `${q.id}: item anulado não entra`).not.toBe('X');
      if (p!.formato === 'certo-errado') {
        expect(q.alternativas, q.id).toEqual(['Certo', 'Errado']);
        expect(q.alternativas[q.correta], `${q.id}: gabarito definitivo é ${gabarito}`).toBe(gabarito === 'C' ? 'Certo' : 'Errado');
      } else {
        // As alternativas ficam na ordem da prova: a certa é a letra do gabarito.
        expect(q.correta, `${q.id}: gabarito definitivo é ${gabarito}`).toBe(gabarito!.charCodeAt(0) - 65);
      }
      expect(vistos.has(`${f.prova}:${f.item}`), `${q.id}: item repetido`).toBe(false);
      vistos.add(`${f.prova}:${f.item}`);
    }
  });

  it('nenhuma questão é quase igual a outra (banco e trilha)', () => {
    // Item oficial pode lembrar uma autoral que ensina a mesma regra (ex.: a
    // Súmula 473): esse par é permitido. Autoral × autoral e oficial × oficial, não.
    // Na oficial, compara só o item (o último bloco): vários itens dividem o mesmo texto de apoio.
    const item = (q: Questao) => (q.fonte.tipo === 'oficial' ? q.enunciado.split(/\n\s*\n/).pop()! : q.enunciado);
    // Itens da mesma prova podem começar igual (o teste acima já impede o mesmo item duas vezes).
    const prova = (q: Questao) => (q.fonte.tipo === 'oficial' ? q.fonte.prova ?? null : null);
    const todas = [...QUESTOES, ...itens].map((q) => ({ id: q.id, oficial: q.fonte.tipo === 'oficial', prova: prova(q), t: trincas([item(q), ...q.alternativas].join(' ')) }));
    const repetidas: string[] = [];
    for (let i = 0; i < todas.length; i++) {
      for (let j = i + 1; j < todas.length; j++) {
        if (todas[i]!.oficial !== todas[j]!.oficial) continue;
        if (todas[i]!.prova && todas[i]!.prova === todas[j]!.prova) continue;
        if (todas[i]!.t.size >= 4 && parecido(todas[i]!.t, todas[j]!.t) > 0.8) repetidas.push(`${todas[i]!.id} ~ ${todas[j]!.id}`);
      }
    }
    expect(repetidas).toEqual([]);
  });

  it('a resposta certa não se concentra numa mesma letra', () => {
    // Só nas autorais: nas oficiais, a letra certa é a da prova.
    for (const [arquivo, lista] of porArquivo) {
      const cinco = lista.filter((q) => q.alternativas.length === 5 && q.fonte.tipo === 'autoral');
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

describe.runIf(process.env.PG_TEST === '1')('banco no Postgres', async () => {
  const { postgresGame } = await import('../../server/game-pg.js');

  it('questão em revisão não aparece no catálogo nem pode ser respondida', async () => {
    const catalogo = await postgresGame.questions.catalog();
    const autorais = itens.filter((q) => q.fonte.tipo === 'autoral');
    for (const id of [autorais[0]!.id, autorais[autorais.length - 1]!.id]) {
      expect(catalogo.some((c) => c.id === id), id).toBe(false);
      expect((await postgresGame.questions.get([id])).has(id), id).toBe(false);
    }
  });

  it('questão oficial (já ativa) aparece no catálogo e pode ser respondida', async () => {
    const catalogo = await postgresGame.questions.catalog();
    const oficiais = itens.filter((q) => q.fonte.tipo === 'oficial');
    for (const id of [oficiais[0]!.id, oficiais[oficiais.length - 1]!.id]) {
      expect(catalogo.some((c) => c.id === id), id).toBe(true);
      expect((await postgresGame.questions.get([id])).has(id), id).toBe(true);
    }
  });
});

describe('liberação das oficiais', () => {
  it('migração 0020 libera as oficiais que já estavam no banco como revisão', () => {
    const sql = readFileSync('supabase/migrations/0020_v2_oficiais_ativas.sql', 'utf8');
    expect(sql).toMatch(/update v2\.questions\s+set status = 'ativa'/i);
    expect(sql).toMatch(/fonte->>'tipo' = 'oficial'/);
    expect(sql).toMatch(/status = 'revisao'/);
  });

  it('a sincronização também corrige o texto das oficiais já liberadas', () => {
    const sql = readFileSync('supabase/migrations/0013_v2_banco_sincroniza.sql', 'utf8');
    expect(sql).toMatch(/WHERE v2\.questions\.status = 'revisao' OR v2\.questions\.fonte->>'tipo' = 'oficial';/);
  });
});
