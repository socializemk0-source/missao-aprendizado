// Simulado e dificuldade real no Postgres de verdade (PG_TEST=1).
import { describe, expect, it } from 'vitest';
import { questao } from '../../content/trilha.js';

const run = process.env.PG_TEST === '1';

describe.runIf(run)('simulado no Postgres', async () => {
  const { postgresGame } = await import('../../server/game-pg.js');
  const { answer, getReviewSession } = await import('../../server/game.js');
  const { startSimulado, deliverSimulado, getSimuladoOptions } = await import('../../server/simulado.js');
  const { db } = await import('../../server/db.js');
  const { questions } = await import('../../server/schema.js');
  const { eq } = await import('drizzle-orm');
  const id = (s: string) => `pg-sim-${Date.now()}-${s}`;
  const input = { nivel: 'misto' as const, disciplinas: ['portugues' as const, 'rlm' as const], banca: null, quantidade: 5, cronometro: false };

  it('inicia, entrega uma vez só (cliques simultâneos), conta estatística e manda erros para a revisão', async () => {
    const u = id('a');
    const s = await startSimulado(postgresGame, u, input);
    const ids = s.questoes.map((q) => q.id);
    const respostas = Object.fromEntries(ids.map((q, i) => [q, i === 0 ? (questao(q)!.correta + 1) % questao(q)!.alternativas.length : questao(q)!.correta]));
    const [a, b] = await Promise.all([deliverSimulado(postgresGame, u, s.id, respostas), deliverSimulado(postgresGame, u, s.id, respostas)]);
    expect(a.resultado.acertos).toBe(4);
    expect(b.progress.xp).toBe(a.progress.xp);
    expect(a.progress.xp).toBe(40);
    const stats = await postgresGame.questionStats(ids);
    expect(stats.get(ids[0]!)!.respostas).toBeGreaterThanOrEqual(1);
    expect((await getReviewSession(postgresGame, u)).questoes.map((q) => q.id)).toContain(ids[0]);
    await expect(startSimulado(postgresGame, u, input)).rejects.toMatchObject({ code: 'LIMITE_SIMULADO' });
    const opts = await getSimuladoOptions(postgresGame, u);
    expect(opts.historico[0]).toMatchObject({ id: s.id, acertos: 4, total: 5 });
  });

  it('questão do banco (v2.questions) entra no catálogo e é respondida na revisão', async () => {
    const qid = id('q');
    await db().insert(questions).values({
      id: qid, disciplina: 'rlm', assunto: 'Lógica', enunciado: 'Questão importada de teste.', alternativas: ['Certo', 'Errado'],
      correta: 1, explicacao: 'Errado. Explicação de teste.', fonte: { tipo: 'oficial', banca: 'FGV', orgao: 'TJ', cargo: 'Analista', ano: 2025 }, dificuldade: 3,
    });
    const found = await postgresGame.questions.get([qid, 'pt-acent-1']);
    expect(found.get(qid)!.correta).toBe(1);
    expect(found.get('pt-acent-1')).toBeTruthy();
    const u = id('b');
    await expect(answer(postgresGame, u, { questionId: qid, choice: 1, mode: 'revisar' })).rejects.toMatchObject({ code: 'QUESTAO_INEXISTENTE' });
    await db().update(questions).set({ status: 'anulada' }).where(eq(questions.id, qid));
    expect((await postgresGame.questions.get([qid])).has(qid)).toBe(false);
  });
});
