import { describe, expect, it } from 'vitest';
import { loadBank, SUBJECTS, upsertStatement, validateBank, validateQuestion, type Question } from '../../server/questions.js';

const propria: Question = {
  id: 'rl-teste-001',
  subject: 'raciocinio_logico',
  topic: 'Porcentagem',
  level: 'medio',
  difficulty: 1,
  statement: 'Em um simulado de 40 questões, você acertou 30. Qual foi o percentual de acertos?',
  options: ['60%', '70%', '75%', '80%'],
  correctIndex: 2,
  explanation: '30 ÷ 40 = 0,75, ou seja, 75%.',
  origin: 'propria',
  style: 'FGV',
  status: 'rascunho',
};

const oficial: Question = {
  ...propria,
  id: 'rl-oficial-001',
  style: undefined,
  origin: 'oficial',
  banca: 'FGV',
  examYear: 2023,
  orgao: 'Órgão X',
  cargo: 'Técnico',
  sourceUrl: 'https://exemplo.org/prova.pdf',
  authorizationNote: 'Autorização por e-mail da banca em 01/10/2026, protocolo 123.',
};

describe('validateQuestion', () => {
  it('aceita questão própria e questão oficial completa', () => {
    expect(validateQuestion(propria)).toEqual([]);
    expect(validateQuestion(oficial)).toEqual([]);
  });

  it('questão oficial sem autorização da banca é recusada', () => {
    expect(validateQuestion({ ...oficial, authorizationNote: undefined }).join(' ')).toMatch(/autoriza/i);
  });

  it('questão oficial sem banca, ano, órgão, cargo ou link é recusada', () => {
    for (const campo of ['banca', 'examYear', 'orgao', 'cargo', 'sourceUrl'] as const) {
      const q = { ...oficial, [campo]: undefined };
      expect(validateQuestion(q), campo).not.toEqual([]);
    }
  });

  it('questão própria não pode fingir ser de prova oficial', () => {
    expect(validateQuestion({ ...propria, banca: 'FGV', examYear: 2022 })).not.toEqual([]);
  });

  it('recusa gabarito fora das alternativas, alternativas repetidas e matéria desconhecida', () => {
    expect(validateQuestion({ ...propria, correctIndex: 4 })).not.toEqual([]);
    expect(validateQuestion({ ...propria, options: ['10%', '10%', '20%'] })).not.toEqual([]);
    expect(validateQuestion({ ...propria, options: ['só uma'], correctIndex: 0 })).not.toEqual([]);
    expect(validateQuestion({ ...propria, subject: 'astrologia' })).not.toEqual([]);
    expect(validateQuestion({ ...propria, id: 'Com Espaço' })).not.toEqual([]);
    expect(validateQuestion(null)).not.toEqual([]);
  });

  it('duas opções só no formato Certo/Errado', () => {
    expect(validateQuestion({ ...propria, options: ['Certo', 'Errado'], correctIndex: 0 })).toEqual([]);
    expect(validateQuestion({ ...propria, options: ['Sim', 'Não'], correctIndex: 0 })).not.toEqual([]);
  });

  it('validateBank acusa id repetido', () => {
    expect(validateBank([propria, propria]).join(' ')).toMatch(/repetid/i);
  });
});

describe('banco de questões em content/questoes', () => {
  const bank = loadBank();

  it('todas as questões são válidas e os ids não se repetem', () => {
    expect(validateBank(bank)).toEqual([]);
  });

  it('tem pelo menos 5 questões de cada matéria do nível médio', () => {
    for (const subject of Object.keys(SUBJECTS)) {
      expect(bank.filter((q) => q.subject === subject).length, subject).toBeGreaterThanOrEqual(5);
    }
  });

  it('nenhuma questão oficial entra sem autorização (hoje todas são próprias)', () => {
    expect(bank.filter((q) => q.origin === 'oficial' && !q.authorizationNote)).toEqual([]);
  });

  it('o gabarito não fica sempre na mesma letra', () => {
    const multipla = bank.filter((q) => q.options.length > 2);
    const letras = new Set(multipla.map((q) => q.correctIndex));
    expect(letras.size).toBeGreaterThanOrEqual(4);
  });
});

describe('upsertStatement', () => {
  it('gera SQL parametrizado (sem texto da questão dentro do SQL)', () => {
    const { text, values } = upsertStatement(propria);
    expect(text).toMatch(/INSERT INTO v2\.questions/);
    expect(text).toMatch(/ON CONFLICT \(id\) DO UPDATE/);
    expect(text).not.toContain(propria.statement);
    expect(values).toContain(propria.statement);
    expect(values).toContain(JSON.stringify(propria.options));
  });
});
