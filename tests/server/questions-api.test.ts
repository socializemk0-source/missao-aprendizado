import { describe, expect, it } from 'vitest';
import { createAnswerHandler } from '../../api/answer.js';
import { createQuestionsHandler } from '../../api/questions.js';
import type { Question } from '../../server/questions.js';
import { fakeVerify, makeReq, makeRes, memoryQuestions } from './helpers.js';

const base: Question = {
  id: 'rl-001',
  subject: 'raciocinio_logico',
  topic: 'Porcentagem',
  level: 'medio',
  difficulty: 1,
  statement: 'Em um simulado de 40 questões, você acertou 30. Qual foi o percentual?',
  options: ['60%', '70%', '75%', '80%'],
  correctIndex: 2,
  explanation: '30 ÷ 40 = 0,75, ou seja, 75%.',
  origin: 'propria',
  style: 'FGV',
  status: 'publicada',
};

function setup() {
  const store = memoryQuestions([
    base,
    { ...base, id: 'rl-002', statement: 'Outra questão de raciocínio lógico publicada.' },
    { ...base, id: 'port-001', subject: 'portugues', statement: 'Uma questão de português publicada aqui.' },
    { ...base, id: 'rl-rascunho', status: 'rascunho', statement: 'Questão ainda em revisão pelo professor.' },
  ]);
  return {
    list: createQuestionsHandler({ verifyToken: fakeVerify, questions: store }),
    answer: createAnswerHandler({ verifyToken: fakeVerify, questions: store }),
  };
}

describe('GET /api/questions', () => {
  it('sem login → 401', async () => {
    const res = makeRes();
    await setup().list(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('entrega só questões publicadas e NUNCA o gabarito ou a explicação', async () => {
    const res = makeRes();
    await setup().list(makeReq({ token: 'ok:u1' }), res);
    expect(res.statusCode).toBe(200);
    const ids = res.body.questions.map((q: { id: string }) => q.id).sort();
    expect(ids).toEqual(['port-001', 'rl-001', 'rl-002']);
    for (const q of res.body.questions) {
      expect(q).not.toHaveProperty('correctIndex');
      expect(q).not.toHaveProperty('explanation');
      expect(q.options).toHaveLength(4);
    }
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('filtra por matéria e respeita o limite', async () => {
    const { list } = setup();
    const res = makeRes();
    await list(makeReq({ token: 'ok:u1', query: { subject: 'raciocinio_logico', limit: '1' } }), res);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].subject).toBe('raciocinio_logico');
  });

  it('matéria desconhecida ou limite inválido → 400', async () => {
    const { list } = setup();
    for (const query of [{ subject: 'astrologia' }, { limit: '0' }, { limit: '999' }, { limit: 'dez' }]) {
      const res = makeRes();
      await list(makeReq({ token: 'ok:u1', query }), res);
      expect(res.statusCode, JSON.stringify(query)).toBe(400);
    }
  });

  it('outros métodos → 405', async () => {
    const res = makeRes();
    await setup().list(makeReq({ method: 'POST', token: 'ok:u1' }), res);
    expect(res.statusCode).toBe(405);
  });
});

describe('POST /api/answer', () => {
  const post = async (body: unknown, token: string | null = 'ok:u1') => {
    const res = makeRes();
    await setup().answer(makeReq({ method: 'POST', body, ...(token ? { token } : {}) }), res);
    return res;
  };

  it('sem login → 401', async () => {
    expect((await post({ questionId: 'rl-001', choice: 2 }, null)).statusCode).toBe(401);
  });

  it('resposta certa: o servidor confere e devolve a explicação', async () => {
    const res = await post({ questionId: 'rl-001', choice: 2 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ correct: true, correctIndex: 2, explanation: base.explanation, legalBasis: null });
  });

  it('resposta errada: mostra qual era a certa', async () => {
    const res = await post({ questionId: 'rl-001', choice: 0 });
    expect(res.body).toMatchObject({ correct: false, correctIndex: 2 });
  });

  it('questão em rascunho ou inexistente → 404 (não vaza o gabarito)', async () => {
    expect((await post({ questionId: 'rl-rascunho', choice: 2 })).statusCode).toBe(404);
    expect((await post({ questionId: 'nao-existe', choice: 0 })).statusCode).toBe(404);
  });

  it('alternativa fora da questão ou corpo inválido → 400', async () => {
    for (const body of [{ questionId: 'rl-001', choice: 4 }, { questionId: 'rl-001', choice: -1 }, { questionId: 'rl-001', choice: '2' }, { choice: 1 }, 'x']) {
      expect((await post(body)).statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it('outros métodos → 405', async () => {
    const res = makeRes();
    await setup().answer(makeReq({ method: 'GET', token: 'ok:u1' }), res);
    expect(res.statusCode).toBe(405);
  });
});
