// Marco 1: onboarding, plano do dia, semana, domínio por assunto e fila de
// revisão espaçada — tudo calculado no servidor.
import { describe, expect, it } from 'vitest';
import { FASES, fase, questao } from '../../content/trilha.js';
import { assuntoDe, getDominio, getPlano, metaDiaria, montarSemana, notaQuestao, parsePerfilEstudo, saveStudyProfile, situacaoDe } from '../../server/estudo.js';
import { answer, getReviewSession } from '../../server/game.js';
import { memoryGameStore } from '../../server/game-memory.js';
import { startSimulado } from '../../server/simulado.js';
import type { Plano, PerfilEstudo } from '../../shared/estudo.js';

const T0 = new Date('2026-10-01T15:00:00Z'); // quinta, meio-dia em Brasília
const HOJE = '2026-10-01';
const DAY = 86_400_000;
const at = (dias: number) => new Date(T0.getTime() + dias * DAY);

const right = (id: string) => questao(id)!.correta;
const wrong = (id: string) => (questao(id)!.correta + 1) % questao(id)!.alternativas.length;

const PERFIL: PerfilEstudo = {
  prova: 'INSS — Técnico do Seguro Social', banca: 'Cebraspe', dataProva: null,
  minutosDia: 60, nivel: 'intermediario', disciplinas: ['portugues', 'rlm', 'informatica'],
};

async function setup(perfil: Partial<PerfilEstudo> = {}) {
  const store = memoryGameStore();
  await saveStudyProfile(store, 'u1', { ...PERFIL, ...perfil });
  return store;
}

async function plano(store: ReturnType<typeof memoryGameStore>, now = T0): Promise<Plano> {
  const p = await getPlano(store, 'u1', now);
  if (!p.configurado) throw new Error('sem plano');
  return p;
}

async function clearPhase(store: ReturnType<typeof memoryGameStore>, faseId: string, now = T0) {
  for (const q of fase(faseId)!.questoes) await answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }, now);
}

describe('onboarding: o servidor confere o que a tela manda', () => {
  const ok = { prova: '  TJ-SP   Escrevente ', banca: 'Vunesp', dataProva: '2027-03-14', minutosDia: 120, nivel: 'iniciante', disciplinas: ['rlm', 'portugues'] };

  it('aceita um perfil válido (limpa espaços e põe as matérias na ordem da trilha)', () => {
    expect(parsePerfilEstudo(ok, HOJE)).toEqual({
      prova: 'TJ-SP Escrevente', banca: 'Vunesp', dataProva: '2027-03-14', minutosDia: 120, nivel: 'iniciante', disciplinas: ['portugues', 'rlm'],
    });
    expect(parsePerfilEstudo({ ...ok, banca: null, dataProva: '' }, HOJE)).toMatchObject({ banca: null, dataProva: null });
  });

  it('recusa campos inválidos com mensagem em português', () => {
    const bad: [Record<string, unknown>, RegExp][] = [
      [{ ...ok, prova: 'x' }, /concurso/],
      [{ ...ok, banca: 'Banca Inventada' }, /Banca/],
      [{ ...ok, dataProva: '2026-02-30' }, /Data/],
      [{ ...ok, dataProva: '2026-09-30' }, /já passou/],
      [{ ...ok, dataProva: '2031-01-01' }, /longe/],
      [{ ...ok, minutosDia: 45 }, /tempo/],
      [{ ...ok, nivel: 'mestre' }, /nível/],
      [{ ...ok, disciplinas: [] }, /matéria/],
      [{ ...ok, disciplinas: ['portugues', 'astrologia'] }, /matéria/],
    ];
    for (const [body, msg] of bad) expect(parsePerfilEstudo(body, HOJE)).toMatch(msg);
    expect(parsePerfilEstudo(null, HOJE)).toMatch(/inválido/);
  });
});

describe('plano do dia', () => {
  it('sem onboarding, o plano avisa que não está configurado', async () => {
    expect(await getPlano(memoryGameStore(), 'u1', T0)).toEqual({ configurado: false });
  });

  it('meta de questões pelo tempo e pelo nível', () => {
    expect(metaDiaria({ minutosDia: 30, nivel: 'iniciante' })).toBe(10);
    expect(metaDiaria({ minutosDia: 60, nivel: 'intermediario' })).toBe(24);
    expect(metaDiaria({ minutosDia: 180, nivel: 'avancado' })).toBe(90);
  });

  it('aluno novo: avançar a 1ª fase da trilha e praticar a matéria aberta; sem revisão', async () => {
    const p = await plano(await setup());
    expect(p.metaQuestoes).toBe(24);
    expect(p.tarefas.map((t) => t.tipo)).toEqual(['trilha', 'praticar']);
    expect(p.tarefas[0]).toMatchObject({ link: '/fase/fase-01-1', meta: 1, atual: 0, concluida: false });
    expect(p.tarefas[0]!.detalhe).toContain('Acentuação gráfica');
    expect(p.tarefas[1]).toMatchObject({ titulo: 'Pratique Português', link: '/praticar/portugues', meta: 20 });
    expect(p.revisao).toEqual({ hoje: 0, amanha: 0, semana: 0, depois: 0 });
    expect(p.comoEstou).toMatchObject({ sequencia: 0, xp: 0, acerto7d: null, respondidas7d: 0, dominioMedio: null });
    expect(p.diasParaProva).toBeNull();
  });

  it('errou → tarefa de revisão; revisar e concluir uma fase marca as tarefas como feitas', async () => {
    const store = await setup();
    const [a, b, c, d] = fase('fase-01-1')!.questoes as [string, string, string, string];
    await answer(store, 'u1', { questionId: a, choice: wrong(a), mode: 'trilha' }, T0);
    await answer(store, 'u1', { questionId: b, choice: wrong(b), mode: 'trilha' }, T0);
    let p = await plano(store);
    expect(p.tarefas[0]).toMatchObject({ tipo: 'revisar', meta: 2, atual: 0, concluida: false });
    expect(p.revisao.hoje).toBe(2);

    for (const q of [a, b]) await answer(store, 'u1', { questionId: q, choice: right(q), mode: 'revisar' }, T0);
    for (const q of [c, d]) await answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }, T0);
    p = await plano(store);
    expect(p.tarefas.find((t) => t.tipo === 'revisar')).toMatchObject({ atual: 2, concluida: true });
    expect(p.tarefas.find((t) => t.tipo === 'trilha')).toMatchObject({ atual: 1, concluida: true, link: '/fase/fase-01-2' });
    expect(p.revisao).toMatchObject({ hoje: 0, amanha: 2 });
    expect(p.feitasHoje).toBe(6);
    expect(p.comoEstou).toMatchObject({ respondidas7d: 6, acerto7d: 67, sequencia: 1 });
  });

  it('prova em até 60 dias (ou nível avançado) pede um simulado por semana', async () => {
    let p = await plano(await setup({ dataProva: '2026-11-20' }));
    expect(p.diasParaProva).toBe(50);
    expect(p.tarefas.find((t) => t.tipo === 'simulado')).toMatchObject({ link: '/simulados', concluida: false, detalhe: expect.stringContaining('Cebraspe') });

    p = await plano(await setup({ dataProva: '2027-06-01' }));
    expect(p.tarefas.some((t) => t.tipo === 'simulado')).toBe(false);

    const store = await setup({ nivel: 'avancado' });
    await clearPhase(store, 'fase-01-1');
    await startSimulado(store, 'u1', { nivel: 'misto', disciplinas: ['portugues'], banca: null, quantidade: 5, cronometro: false }, T0);
    p = await plano(store);
    expect(p.tarefas.find((t) => t.tipo === 'simulado')).toMatchObject({ atual: 1, concluida: true });
    // simulado feito há 3 dias: nesta semana não pede outro
    p = await plano(store, at(3));
    expect(p.tarefas.some((t) => t.tipo === 'simulado')).toBe(false);
  });

  it('capítulo PRO no grátis: a tarefa da trilha leva aos planos', async () => {
    const store = await setup();
    for (const f of FASES.filter((x) => x.capituloIndex < 5)) await clearPhase(store, f.id);
    const p = await plano(store);
    expect(p.tarefas.find((t) => t.tipo === 'trilha')).toMatchObject({ link: '/planos', detalhe: expect.stringContaining('PRO') });
  });

  it('quanto falta: fases e questões só das matérias do aluno, previsão pelo ritmo e pela meta', async () => {
    const store = await setup({ disciplinas: ['portugues'] });
    let p = await plano(store);
    const fasesPt = FASES.filter((f) => f.capitulo.disciplina === 'portugues');
    expect(p.quantoFalta).toMatchObject({ fasesFeitas: 0, fasesTotal: fasesPt.length, questoesFaltam: fasesPt.length * 4, ritmo: 0, previsao: null });
    expect(p.quantoFalta.previsaoPlano).toBe('2026-10-02'); // 16 questões, meta de 24 por dia

    await clearPhase(store, 'fase-01-1');
    p = await plano(store);
    expect(p.quantoFalta).toMatchObject({ fasesFeitas: 1, questoesFaltam: 12, ritmo: 0.6 });
    expect(p.quantoFalta.previsao).toBe('2026-10-22'); // 4 questões em 7 dias: 12 faltam → 21 dias
  });
});

describe('semana do plano', () => {
  it('7 dias a partir de hoje, só com as matérias do aluno, sem repetir em dias seguidos', () => {
    const semana = montarSemana(PERFIL, [], HOJE);
    expect(semana.map((d) => d.rotulo)).toEqual(['Hoje', 'sex', 'sáb', 'dom', 'seg', 'ter', 'qua']);
    expect(semana.map((d) => d.dia)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07']);
    for (const d of semana) expect(d.disciplinas).toHaveLength(1);
    for (let i = 1; i < 7; i++) expect(semana[i]!.disciplinas[0]!.id).not.toBe(semana[i - 1]!.disciplinas[0]!.id);
    const ids = semana.flatMap((d) => d.disciplinas.map((x) => x.id));
    expect(new Set(ids)).toEqual(new Set(PERFIL.disciplinas));
  });

  it('a matéria mais fraca ganha mais dias; com 2 horas ou mais são 2 matérias por dia', () => {
    const dom = [
      { disciplina: 'portugues' as const, disciplinaNome: 'Português', assunto: 'Crase', score: 95, situacao: 'dominado' as const, respondidas: 4, total: 4 },
      { disciplina: 'rlm' as const, disciplinaNome: 'Raciocínio Lógico', assunto: 'Porcentagem', score: 20, situacao: 'fraco' as const, respondidas: 4, total: 4 },
      { disciplina: 'informatica' as const, disciplinaNome: 'Informática', assunto: 'Planilhas', score: 90, situacao: 'dominado' as const, respondidas: 4, total: 4 },
    ];
    const conta = (s: ReturnType<typeof montarSemana>, id: string) => s.flatMap((d) => d.disciplinas).filter((x) => x.id === id).length;
    const semana = montarSemana(PERFIL, dom, HOJE);
    expect(conta(semana, 'rlm')).toBeGreaterThan(conta(semana, 'portugues'));
    expect(conta(semana, 'portugues') + conta(semana, 'rlm') + conta(semana, 'informatica')).toBe(7);

    const longa = montarSemana({ ...PERFIL, minutosDia: 120 }, dom, HOJE);
    for (const d of longa) {
      expect(d.disciplinas).toHaveLength(2);
      expect(d.disciplinas[0]!.id).not.toBe(d.disciplinas[1]!.id);
    }
    expect(montarSemana({ ...PERFIL, minutosDia: 180, disciplinas: ['rlm'] }, dom, HOJE).every((d) => d.disciplinas.length === 1)).toBe(true);
  });

  it('matéria que ainda não abriu na trilha aparece menos (não dá para praticar)', async () => {
    const conta = (s: ReturnType<typeof montarSemana>, id: string) => s.flatMap((d) => d.disciplinas).filter((x) => x.id === id).length;
    const semana = montarSemana(PERFIL, [], HOJE, new Set(['portugues']));
    expect(conta(semana, 'portugues')).toBeGreaterThan(conta(semana, 'rlm'));
    expect(semana[0]!.disciplinas[0]!.id).toBe('portugues');
    // no plano de um aluno novo, hoje é dia de Português (a única aberta)
    const p = await plano(await setup());
    expect(p.semana[0]!.disciplinas.map((d) => d.id)).toEqual(['portugues']);
    expect(p.tarefas.find((t) => t.tipo === 'praticar')!.detalhe).toBe('Matéria de foco do seu plano hoje');
  });
});

describe('domínio por assunto', () => {
  it('nota da questão: acerto nas tentativas, última resposta e recência', () => {
    const base = { questionId: 'q', everCorrect: true, lastCorrect: true, timesWrong: 0, timesRight: 2, reviewStage: 0, reviewDue: null, lastAnsweredAt: T0 };
    expect(notaQuestao(base, HOJE)).toBe(1);
    expect(notaQuestao({ ...base, timesWrong: 2 }, HOJE)).toBe(0.75);
    expect(notaQuestao({ ...base, lastCorrect: false, timesRight: 0, timesWrong: 1 }, HOJE)).toBe(0);
    expect(notaQuestao(base, '2026-10-31')).toBe(0.9); // 30 dias sem ver
    expect(notaQuestao(base, '2026-11-15')).toBe(0.8); // 45 dias
  });

  it('situação: não visto, fraco, em progresso, dominado (precisa ver metade do assunto)', () => {
    expect(situacaoDe(null, 0, 4)).toBe('nao-visto');
    expect(situacaoDe(30, 4, 4)).toBe('fraco');
    expect(situacaoDe(70, 4, 4)).toBe('progresso');
    expect(situacaoDe(100, 1, 4)).toBe('progresso');
    expect(situacaoDe(85, 2, 4)).toBe('dominado');
  });

  it('o assunto da trilha é a fase; score pesado pela dificuldade; o mais fraco aparece em "onde erro"', async () => {
    const store = await setup();
    const qs = fase('fase-01-1')!.questoes;
    expect(assuntoDe(questao(qs[0]!)!)).toBe('Acentuação gráfica');
    await answer(store, 'u1', { questionId: qs[0]!, choice: wrong(qs[0]!), mode: 'trilha' }, T0);
    for (const q of qs.slice(1)) await answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }, T0);

    const dom = await getDominio(store, 'u1', T0);
    const acent = dom.find((a) => a.assunto === 'Acentuação gráfica')!;
    const pesos = qs.map((q) => questao(q)!.dificuldade);
    const esperado = Math.round((100 * pesos.slice(1).reduce((a, b) => a + b, 0)) / pesos.reduce((a, b) => a + b, 0));
    expect(acent).toMatchObject({ disciplina: 'portugues', disciplinaNome: 'Português', score: esperado, respondidas: 4, total: 4 });
    expect(dom.find((a) => a.assunto === 'Crase')).toMatchObject({ score: null, situacao: 'nao-visto', respondidas: 0 });
    expect(dom[0]!.disciplina).toBe('portugues');
    expect(dom.map((a) => a.assunto)).toContain('Porcentagem');

    const p = await plano(store);
    expect(p.ondeErro.map((a) => a.assunto)).toEqual(['Acentuação gráfica']);
    expect(p.comoEstou.dominioMedio).toBe(esperado);
    expect(p.tarefas.find((t) => t.tipo === 'praticar')!.detalhe).toBe('Seu ponto mais fraco: Acentuação gráfica');
  });
});

describe('revisão espaçada no jogo', () => {
  it('errou hoje → revisa hoje; acertou → some até amanhã; a agenda mostra o que vem', async () => {
    const store = memoryGameStore();
    const [a, b] = fase('fase-01-1')!.questoes as [string, string];
    await answer(store, 'u1', { questionId: a, choice: wrong(a), mode: 'trilha' }, T0);
    await answer(store, 'u1', { questionId: b, choice: wrong(b), mode: 'trilha' }, T0);
    let s = await getReviewSession(store, 'u1', 10, T0);
    expect(s.questoes.map((q) => q.id).sort()).toEqual([a, b].sort());
    expect(s.agenda).toEqual({ hoje: 2, amanha: 0, semana: 0, depois: 0 });

    await answer(store, 'u1', { questionId: a, choice: right(a), mode: 'revisar' }, T0);
    s = await getReviewSession(store, 'u1', 10, T0);
    expect(s.questoes.map((q) => q.id)).toEqual([b]);
    expect(s.agenda).toEqual({ hoje: 1, amanha: 1, semana: 0, depois: 0 });

    s = await getReviewSession(store, 'u1', 10, at(1));
    expect(s.questoes.map((q) => q.id).sort()).toEqual([a, b].sort());
    await answer(store, 'u1', { questionId: a, choice: right(a), mode: 'revisar' }, at(1));
    s = await getReviewSession(store, 'u1', 10, at(1));
    expect(s.agenda).toEqual({ hoje: 1, amanha: 0, semana: 1, depois: 0 });
    s = await getReviewSession(store, 'u1', 10, at(8));
    expect(s.questoes.map((q) => q.id).sort()).toEqual([a, b].sort());
  });

  it('a revisão atrasada vem primeiro', async () => {
    const store = memoryGameStore();
    const [a, b] = fase('fase-01-1')!.questoes as [string, string];
    await answer(store, 'u1', { questionId: a, choice: wrong(a), mode: 'trilha' }, T0);
    await answer(store, 'u1', { questionId: b, choice: wrong(b), mode: 'trilha' }, at(2));
    const s = await getReviewSession(store, 'u1', 10, at(2));
    expect(s.questoes.map((q) => q.id)).toEqual([a, b]);
  });
});
