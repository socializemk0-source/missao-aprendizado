// Plano de estudos e revisão espaçada no Postgres de verdade (PG_TEST=1).
import { describe, expect, it } from 'vitest';
import { fase, questao } from '../../content/trilha.js';
import type { PerfilEstudo } from '../../shared/estudo.js';

const run = process.env.PG_TEST === '1';

describe.runIf(run)('plano de estudos no Postgres', async () => {
  const { postgresGame } = await import('../../server/game-pg.js');
  const { answer, getReviewSession } = await import('../../server/game.js');
  const { getDominio, getPlano, saveStudyProfile } = await import('../../server/estudo.js');
  const id = (s: string) => `pg-estudo-${Date.now()}-${s}`;
  const T0 = new Date('2026-10-01T15:00:00Z');
  const D1 = new Date('2026-10-02T15:00:00Z');
  const perfil: PerfilEstudo = { prova: 'TJ — Escrevente', banca: 'Vunesp', dataProva: '2026-11-20', minutosDia: 60, nivel: 'avancado', disciplinas: ['portugues', 'informatica'] };

  it('grava e lê o perfil (e atualiza na 2ª vez); outro aluno continua sem plano', async () => {
    const u = id('a');
    expect(await getPlano(postgresGame, u, T0)).toEqual({ configurado: false });
    await saveStudyProfile(postgresGame, u, perfil);
    await saveStudyProfile(postgresGame, u, { ...perfil, minutosDia: 120 });
    const p = await getPlano(postgresGame, u, T0);
    expect(p).toMatchObject({ configurado: true, perfil: { ...perfil, minutosDia: 120 }, diasParaProva: 50 });
    expect(await getPlano(postgresGame, id('b'), T0)).toEqual({ configurado: false });
  });

  it('revisão espaçada e domínio sobrevivem ao banco', async () => {
    const u = id('c');
    await saveStudyProfile(postgresGame, u, perfil);
    const [a, b] = fase('fase-01-1')!.questoes as [string, string];
    const wrong = (q: string) => (questao(q)!.correta + 1) % questao(q)!.alternativas.length;
    await answer(postgresGame, u, { questionId: a, choice: wrong(a), mode: 'trilha' }, T0);
    await answer(postgresGame, u, { questionId: b, choice: questao(b)!.correta, mode: 'trilha' }, T0);
    await answer(postgresGame, u, { questionId: a, choice: questao(a)!.correta, mode: 'revisar' }, T0);

    expect((await getReviewSession(postgresGame, u, 10, T0)).agenda).toEqual({ hoje: 0, amanha: 1, semana: 0, depois: 0 });
    expect((await getReviewSession(postgresGame, u, 10, D1)).questoes.map((q) => q.id)).toEqual([a]);

    const acent = (await getDominio(postgresGame, u, T0)).find((x) => x.assunto === 'Acentuação gráfica')!;
    expect(acent).toMatchObject({ respondidas: 2, total: 4 });
    expect(acent.score).toBe(88); // a: 1 erro e 1 acerto (0,75), b: acerto (1), mesmo peso

    const p = await getPlano(postgresGame, u, T0);
    if (!p.configurado) throw new Error('sem plano');
    expect(p.feitasHoje).toBe(3);
    expect(p.tarefas.find((t) => t.tipo === 'revisar')).toMatchObject({ atual: 1, concluida: true });
    expect(p.comoEstou).toMatchObject({ respondidas7d: 3, acerto7d: 67 });
  });
});
