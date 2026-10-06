// Exclusão de conta no Postgres de verdade (PG_TEST=1): some tudo do aluno
// no V2, menos os pagamentos (guardados por obrigação legal), e nada de
// outro aluno é tocado.
import { describe, expect, it } from 'vitest';
import { fase, questao } from '../../content/trilha.js';

const run = process.env.PG_TEST === '1';

describe.runIf(run)('excluir conta no Postgres', async () => {
  const { sql } = await import('drizzle-orm');
  const { db } = await import('../../server/db.js');
  const { postgresConta } = await import('../../server/conta.js');
  const { postgresGame } = await import('../../server/game-pg.js');
  const { postgresProfiles } = await import('../../server/profiles.js');
  const { answer } = await import('../../server/game.js');
  const { saveStudyProfile } = await import('../../server/estudo.js');
  const { postgresPayments } = await import('../../server/payments-pg.js');
  const { postgresLeads } = await import('../../server/leads.js');
  const { postgresMarketing } = await import('../../server/marketing-pg.js');

  const contar = async (tabela: string, userId: string) => {
    const r = await db().execute(sql.raw(`select count(*)::int as n from v2.${tabela} where user_id = '${userId.replace(/'/g, "''")}'`));
    return Number((r as unknown as { rows: { n: number }[] }).rows[0]!.n);
  };

  it('apaga perfil, progresso, respostas, plano, redações, simulados, jogos e o e-mail da lista; mantém pagamentos', async () => {
    const u = `pg-conta-${Date.now()}`;
    const outro = `${u}-outro`;
    const email = `${u}@teste.dev`;
    for (const id of [u, outro]) {
      await postgresProfiles.ensure({ id, email: `${id}@teste.dev`, name: 'Conta PG' });
      // Conclui a 1ª fase: gera estado, respostas, estatísticas e fase concluída.
      for (const q of fase('fase-01-1')!.questoes) await answer(postgresGame, id, { questionId: q, choice: questao(q)!.correta, mode: 'trilha' });
      await saveStudyProfile(postgresGame, id, { prova: 'TJ', banca: null, dataProva: null, minutosDia: 30, nivel: 'iniciante', disciplinas: ['portugues'] });
      await postgresMarketing.salvarConsentimento(id, true, new Date());
      await postgresMarketing.registrar({ eventId: `${id}-pv`, nome: 'PageView', userId: id, dados: { pagina: '/' }, origem: { utm_source: 'meta', fbclid: 'IwAR0' }, consentimento: true, envio: { meta_pixel: 'navegador' }, teste: false, now: new Date() });
    }
    await postgresLeads.save({ email, name: null, source: 'landing' });
    await postgresPayments.grant({ paymentId: `pay-${u}`, userId: u, cycle: 'monthly', days: 30, amount: 29.9, now: new Date() });

    await postgresConta.excluir(u, email);

    for (const t of ['profiles', 'user_stats', 'question_state', 'answers', 'phase_completions', 'study_plans', 'marketing_usuarios']) {
      expect(await contar(t, u), t).toBe(0);
      expect(await contar(t, outro), `${t} (outro aluno)`).toBeGreaterThan(0);
    }
    expect(await contar('payments', u)).toBe(1);
    // o evento fica só como contagem: sem o aluno e sem o código de clique
    const ev = (await db().execute(sql`select user_id, origem from v2.eventos_marketing where event_id = ${`${u}-pv`}`)) as unknown as { rows: { user_id: string | null; origem: Record<string, string> }[] };
    expect(ev.rows[0]).toEqual({ user_id: null, origem: { utm_source: 'meta' } });
    expect(await contar('eventos_marketing', outro)).toBe(1);
    const lead = await db().execute(sql`select count(*)::int as n from v2.leads where email = ${email}`);
    expect(Number((lead as unknown as { rows: { n: number }[] }).rows[0]!.n)).toBe(0);
    // excluir de novo não dá erro
    await postgresConta.excluir(u, email);
  });
});
