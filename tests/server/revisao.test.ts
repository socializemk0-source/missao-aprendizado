// Revisão espaçada: errou → revisa hoje; acertou a revisão → amanhã, depois
// em 7 dias, depois em 30; acertou a de 30 dias → sai da fila. Errou em
// qualquer ponto → volta para hoje.
import { describe, expect, it } from 'vitest';
import { REVISAO_DIAS, addDays, aposResposta, diasEntre } from '../../server/revisao.js';

const T = new Date('2026-10-01T15:00:00Z');
const HOJE = '2026-10-01';

describe('datas', () => {
  it('soma dias e conta dias entre duas datas (virada de mês e de ano)', () => {
    expect(addDays('2026-10-01', 1)).toBe('2026-10-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-01', 30)).toBe('2026-10-31');
    expect(diasEntre('2026-10-01', '2026-10-31')).toBe(30);
    expect(diasEntre('2026-10-02', '2026-10-01')).toBe(-1);
  });
});

describe('ciclo de revisão', () => {
  it('as etapas são hoje, amanhã, 7 e 30 dias', () => {
    expect(REVISAO_DIAS).toEqual([0, 1, 7, 30]);
  });

  it('acertar de primeira não entra na revisão; conta o acerto e a hora', () => {
    const s = aposResposta(undefined, 'q1', true, HOJE, T);
    expect(s).toEqual({
      questionId: 'q1', everCorrect: true, lastCorrect: true, timesWrong: 0, timesRight: 1,
      reviewStage: 0, reviewDue: null, lastAnsweredAt: T,
    });
  });

  it('errou → hoje; acertou → amanhã → 7 dias → 30 dias → sai da fila', () => {
    let s = aposResposta(undefined, 'q1', false, HOJE, T);
    expect(s).toMatchObject({ reviewStage: 0, reviewDue: HOJE, timesWrong: 1, timesRight: 0, lastCorrect: false });
    s = aposResposta(s, 'q1', true, HOJE, T);
    expect(s).toMatchObject({ reviewStage: 1, reviewDue: '2026-10-02', everCorrect: true });
    s = aposResposta(s, 'q1', true, '2026-10-02', T);
    expect(s).toMatchObject({ reviewStage: 2, reviewDue: '2026-10-09' });
    s = aposResposta(s, 'q1', true, '2026-10-09', T);
    expect(s).toMatchObject({ reviewStage: 3, reviewDue: '2026-11-08' });
    s = aposResposta(s, 'q1', true, '2026-11-08', T);
    expect(s).toMatchObject({ reviewStage: 4, reviewDue: null, timesRight: 4, timesWrong: 1 });
  });

  it('acertar antes do dia marcado não adianta a revisão (só conta o acerto)', () => {
    let s = aposResposta(undefined, 'q1', false, HOJE, T);
    s = aposResposta(s, 'q1', true, HOJE, T); // amanhã
    s = aposResposta(s, 'q1', true, HOJE, T); // de novo hoje, na prática
    expect(s).toMatchObject({ reviewStage: 1, reviewDue: '2026-10-02', timesRight: 2 });
  });

  it('errar em qualquer etapa volta para hoje', () => {
    let s = aposResposta(undefined, 'q1', false, HOJE, T);
    s = aposResposta(s, 'q1', true, HOJE, T);
    s = aposResposta(s, 'q1', true, '2026-10-02', T);
    s = aposResposta(s, 'q1', false, '2026-10-05', T);
    expect(s).toMatchObject({ reviewStage: 0, reviewDue: '2026-10-05', timesWrong: 2, lastCorrect: false, everCorrect: true });
  });

  it('quem acertou de primeira e depois errou entra na fila', () => {
    let s = aposResposta(undefined, 'q1', true, HOJE, T);
    s = aposResposta(s, 'q1', false, '2026-10-03', T);
    expect(s).toMatchObject({ reviewStage: 0, reviewDue: '2026-10-03' });
  });
});
