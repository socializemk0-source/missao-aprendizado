// Conteúdo é código: estes testes impedem que uma questão quebrada chegue
// ao aluno (id repetido, gabarito fora das alternativas, fase vazia...).
import { describe, expect, it } from 'vitest';
import { CAPITULOS_GRATIS, DISCIPLINAS, FASES, QUESTOES, TRILHA, fase, faseDaQuestao, questao } from '../../content/trilha.js';

describe('conteúdo da trilha', () => {
  it('ids de questões, fases e capítulos são únicos', () => {
    const unique = (list: string[]) => expect(new Set(list).size).toBe(list.length);
    unique(QUESTOES.map((q) => q.id));
    unique(FASES.map((f) => f.id));
    unique(TRILHA.map((c) => c.id));
  });

  it('toda fase aponta para questões que existem, e toda questão está em exatamente uma fase', () => {
    const usadas = FASES.flatMap((f) => f.questoes);
    for (const id of usadas) expect(questao(id), id).toBeDefined();
    expect(new Set(usadas).size).toBe(usadas.length);
    expect([...usadas].sort()).toEqual(QUESTOES.map((q) => q.id).sort());
  });

  it('cada questão é jogável: 2 a 5 alternativas distintas, gabarito válido, explicação e fonte', () => {
    for (const q of QUESTOES) {
      expect(q.alternativas.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.alternativas.length, q.id).toBeLessThanOrEqual(5);
      expect(new Set(q.alternativas).size, q.id).toBe(q.alternativas.length);
      expect(Number.isInteger(q.correta) && q.correta >= 0 && q.correta < q.alternativas.length, q.id).toBe(true);
      expect(q.enunciado.trim().length, q.id).toBeGreaterThan(10);
      expect(q.explicacao.trim().length, q.id).toBeGreaterThan(20);
      if (q.fonte.tipo === 'oficial') {
        expect(q.fonte.orgao && q.fonte.cargo && q.fonte.ano >= 1990, q.id).toBeTruthy();
      }
    }
  });

  it('questão "Certo/Errado" tem explicação que começa pelo gabarito', () => {
    for (const q of QUESTOES.filter((x) => x.alternativas.join() === 'Certo,Errado')) {
      expect(q.explicacao.startsWith(q.alternativas[q.correta]!), q.id).toBe(true);
    }
  });

  it('a disciplina do capítulo bate com a das questões; toda disciplina aparece', () => {
    for (const f of FASES) for (const id of f.questoes) expect(questao(id)!.disciplina, id).toBe(f.capitulo.disciplina);
    expect(new Set(TRILHA.map((c) => c.disciplina))).toEqual(new Set(DISCIPLINAS.map((d) => d.id)));
  });

  it('ordem e consultas', () => {
    expect(FASES.map((f) => f.ordem)).toEqual(FASES.map((_, i) => i));
    expect(fase('fase-01-2')?.capituloIndex).toBe(0);
    expect(faseDaQuestao('adm-atr-4')?.id).toBe('fase-10-2');
    expect(CAPITULOS_GRATIS).toBeLessThan(TRILHA.length);
  });
});
