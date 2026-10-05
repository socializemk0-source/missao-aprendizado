// Revisão por professor no Postgres de verdade (PG_TEST=1): cadastro pelo
// e-mail (sem diferenciar maiúsculas), fila com as questões do banco em
// revisão, aprovação que libera a questão para o aluno e histórico gravado.
import { describe, expect, it } from 'vitest';

const run = process.env.PG_TEST === '1';

describe.runIf(run)('revisão por professor no Postgres', async () => {
  const { sql } = await import('drizzle-orm');
  const { db } = await import('../../server/db.js');
  const { postgresProfessor, filaDoRevisor, decidir, versaoDe } = await import('../../server/professor.js');

  it('professor cadastrado revisa as questões do banco da matéria dele; aprovar libera, corrigir guarda o pedido', async () => {
    const tag = `pgprof${Date.now()}`;
    const email = `${tag}@Teste.dev`;
    await db().execute(sql`insert into v2.revisores (email, nome, disciplinas) values (${email}, 'Profa. PG', ${sql.raw(`'{informatica}'`)})`);
    const nova = (id: string) => sql`
      insert into v2.questions (id, disciplina, assunto, enunciado, alternativas, correta, explicacao, fonte, dificuldade, status)
      values (${id}, 'informatica', 'Teste', ${`Enunciado ${id}`}, ${JSON.stringify(['A', 'B', 'C'])}::jsonb, 0, 'Explicação', ${JSON.stringify({ tipo: 'autoral' })}::jsonb, 1, 'revisao')`;
    await db().execute(nova(`${tag}-1`));
    await db().execute(nova(`${tag}-2`));

    expect(await postgresProfessor.revisor('nao-cadastrado@teste.dev')).toBeNull();
    const revisor = (await postgresProfessor.revisor(email.toLowerCase()))!;
    expect(revisor).toMatchObject({ nome: 'Profa. PG', disciplinas: ['informatica'] });

    const fila = await filaDoRevisor(postgresProfessor, revisor);
    expect(fila.every((q) => q.disciplina === 'informatica')).toBe(true);
    const q1 = fila.find((q) => q.id === `${tag}-1`)!;
    const q2 = fila.find((q) => q.id === `${tag}-2`)!;
    expect(q1).toMatchObject({ origem: 'banco', situacao: 'pendente', alternativas: ['A', 'B', 'C'] });
    expect(fila.some((q) => q.origem === 'trilha')).toBe(true);

    const quem = { userId: `${tag}-user`, email: revisor.email };
    await decidir(postgresProfessor, revisor, quem, { questionId: q1.id, versao: versaoDe(q1), acao: 'aprovar', nota: null });
    await decidir(postgresProfessor, revisor, quem, { questionId: q2.id, versao: versaoDe(q2), acao: 'corrigir', nota: 'Falta a fonte da definição.' });

    const status = await db().execute(sql`select id, status from v2.questions where id like ${`${tag}-%`} order by id`);
    expect((status as unknown as { rows: unknown[] }).rows).toEqual([{ id: `${tag}-1`, status: 'ativa' }, { id: `${tag}-2`, status: 'revisao' }]);

    const depois = await filaDoRevisor(postgresProfessor, revisor);
    expect(depois.map((q) => q.id)).not.toContain(q1.id);
    expect(depois.find((q) => q.id === q2.id)).toMatchObject({ situacao: 'correcao', pedido: { nota: 'Falta a fonte da definição.' } });

    // Aprovar de novo a que já saiu da revisão não passa.
    await expect(decidir(postgresProfessor, revisor, quem, { questionId: q1.id, versao: versaoDe(q1), acao: 'aprovar', nota: null }))
      .rejects.toMatchObject({ status: 404 });
  });
});
