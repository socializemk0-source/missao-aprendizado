import { describe, expect, it } from 'vitest';
import { FASES, fase, questao } from '../../content/trilha.js';
import {
  GameError, answer, claimMission, getAchievements, getChallengeSession, getMissions, getPhaseSession,
  getPracticeSession, getProgress, getRanking, getReviewSession, getSubjects, getTrail, regenHearts, studyDay,
} from '../../server/game.js';
import { memoryGameStore } from '../../server/game-memory.js';
import { HEART_REGEN_MS, MAX_HEARTS } from '../../shared/game.js';
import type { Plan } from '../../shared/game.js';

const T0 = new Date('2026-09-26T15:00:00Z'); // meio-dia em Brasília
const at = (ms: number) => new Date(T0.getTime() + ms);
const DAY = 24 * 60 * 60 * 1000;

function setup(plans: Record<string, Plan> = {}) {
  return memoryGameStore({ plan: (id) => plans[id] ?? 'free', names: { u1: 'Ana', u2: 'Bruno', u3: 'Caio' } });
}

const right = (id: string) => questao(id)!.correta;
const wrong = (id: string) => (questao(id)!.correta + 1) % questao(id)!.alternativas.length;

// Conclui uma fase acertando tudo.
async function clearPhase(store: ReturnType<typeof setup>, user: string, faseId: string, now = T0) {
  for (const q of fase(faseId)!.questoes) await answer(store, user, { questionId: q, choice: right(q), mode: 'trilha' }, now);
}

async function expectError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('trilha e desbloqueio', () => {
  it('conta nova: só a primeira fase aberta; a próxima abre ao concluir a anterior', async () => {
    const store = setup();
    let trail = await getTrail(store, 'u1');
    expect(trail[0]!.fases.map((f) => f.status)).toEqual(['available', 'locked']);
    await clearPhase(store, 'u1', 'fase-01-1');
    trail = await getTrail(store, 'u1');
    expect(trail[0]!.fases.map((f) => f.status)).toEqual(['done', 'available']);
    expect(trail[0]!.fases[0]!.dominadas).toBe(4);
  });

  it('não dá para abrir nem responder fase bloqueada (o servidor confere)', async () => {
    const store = setup();
    await expectError(getPhaseSession(store, 'u1', 'fase-01-2'), 'FASE_BLOQUEADA');
    const q = fase('fase-01-2')!.questoes[0]!;
    await expectError(answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }), 'FASE_BLOQUEADA');
  });

  it('a sessão da fase NÃO manda o gabarito nem a explicação', async () => {
    const session = await getPhaseSession(setup(), 'u1', 'fase-01-1');
    expect(session.questoes).toHaveLength(4);
    for (const q of session.questoes) {
      expect(q).not.toHaveProperty('correta');
      expect(q).not.toHaveProperty('explicacao');
    }
  });

  it('capítulos depois dos grátis pedem PRO; com PRO, abrem', async () => {
    const free = setup();
    const pro = setup({ u1: 'pro' });
    for (const store of [free, pro]) for (const f of FASES.slice(0, 10)) await clearPhase(store, 'u1', f.id);
    expect((await getTrail(free, 'u1'))[5]!.fases[0]!.status).toBe('pro');
    await expectError(getPhaseSession(free, 'u1', 'fase-06-1'), 'PLANO_PRO');
    expect((await getTrail(pro, 'u1'))[5]!.fases[0]!.status).toBe('available');
  });
});

describe('responder', () => {
  it('acerto na primeira vez vale 10 XP; repetir o acerto não vale de novo', async () => {
    const store = setup();
    const q = 'pt-acent-1';
    const first = await answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }, T0);
    expect(first).toMatchObject({ correct: true, xpGanho: 10, correta: right(q) });
    expect(first.explicacao.length).toBeGreaterThan(10);
    const again = await answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }, T0);
    expect(again.xpGanho).toBe(0);
    expect(again.progress.xp).toBe(10);
  });

  it('concluir a fase dá bônus de 20 XP uma única vez', async () => {
    const store = setup();
    const ids = fase('fase-01-1')!.questoes;
    let last;
    for (const q of ids) last = await answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }, T0);
    expect(last!.faseConcluida).toMatchObject({ id: 'fase-01-1', bonus: 20 });
    expect(last!.progress.xp).toBe(4 * 10 + 20);
    const replay = await answer(store, 'u1', { questionId: ids[0]!, choice: right(ids[0]!), mode: 'trilha' }, T0);
    expect(replay.faseConcluida).toBeNull();
  });

  it('dois envios simultâneos da mesma resposta não dão XP em dobro', async () => {
    const store = setup();
    const q = 'pt-acent-1';
    const results = await Promise.all([1, 2, 3].map(() => answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }, T0)));
    expect(results.map((r) => r.xpGanho).sort()).toEqual([0, 0, 10]);
    expect((await getProgress(store, 'u1', T0)).xp).toBe(10);
  });

  it('alternativa fora da lista ou questão inexistente → erro, nada muda', async () => {
    const store = setup();
    await expectError(answer(store, 'u1', { questionId: 'pt-acent-1', choice: 9, mode: 'trilha' }), 'ALTERNATIVA_INVALIDA');
    await expectError(answer(store, 'u1', { questionId: 'nao-existe', choice: 0, mode: 'trilha' }), 'QUESTAO_INEXISTENTE');
    expect((await getProgress(store, 'u1', T0)).xp).toBe(0);
  });
});

describe('vidas', () => {
  it('grátis: erro na trilha tira 1 vida; sem vidas, a trilha trava com a hora da próxima', async () => {
    const store = setup();
    const q = 'pt-acent-1';
    for (let i = 0; i < MAX_HEARTS; i++) await answer(store, 'u1', { questionId: q, choice: wrong(q), mode: 'trilha' }, T0);
    expect((await getProgress(store, 'u1', T0)).hearts).toBe(0);
    const err = await answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }, T0).catch((e: GameError) => e);
    expect(err).toMatchObject({ code: 'SEM_VIDAS', status: 403 });
    expect((err as GameError).extra.nextHeartAt).toBe(at(HEART_REGEN_MS).toISOString());
  });

  it('sem vidas, ainda dá para revisar e praticar (não gastam vidas)', async () => {
    const store = setup();
    const q = 'pt-acent-1';
    for (let i = 0; i < MAX_HEARTS; i++) await answer(store, 'u1', { questionId: q, choice: wrong(q), mode: 'trilha' }, T0);
    const review = await getReviewSession(store, 'u1');
    expect(review.questoes.map((x) => x.id)).toEqual([q]);
    const res = await answer(store, 'u1', { questionId: q, choice: right(q), mode: 'revisar' }, T0);
    expect(res.correct).toBe(true);
    expect(res.progress.hearts).toBe(0);
    expect((await getReviewSession(store, 'u1')).questoes).toHaveLength(0);
  });

  it('recarga: 1 vida a cada 30 minutos, até o máximo', () => {
    const base = { xp: 0, hearts: 2, heartsUpdatedAt: T0, streak: 0, bestStreak: 0, lastStudyDay: null };
    expect(regenHearts(base, at(HEART_REGEN_MS - 1)).hearts).toBe(2);
    const later = regenHearts(base, at(HEART_REGEN_MS * 2 + 5));
    expect(later.hearts).toBe(4);
    expect(later.heartsUpdatedAt).toEqual(at(HEART_REGEN_MS * 2)); // o resto do tempo não se perde
    expect(regenHearts(base, at(HEART_REGEN_MS * 10)).hearts).toBe(MAX_HEARTS);
  });

  it('PRO: vidas ilimitadas', async () => {
    const store = setup({ u1: 'pro' });
    const q = 'pt-acent-1';
    for (let i = 0; i < 8; i++) await answer(store, 'u1', { questionId: q, choice: wrong(q), mode: 'trilha' }, T0);
    const p = await getProgress(store, 'u1', T0);
    expect(p.hearts).toBeNull();
  });
});

describe('sequência de dias (fuso de Brasília)', () => {
  it('conta dias seguidos, zera se pular um dia, guarda o recorde', async () => {
    const store = setup();
    const q = 'pt-acent-1';
    const study = (d: number) => answer(store, 'u1', { questionId: q, choice: right(q), mode: 'trilha' }, at(d * DAY));
    await study(0);
    await study(0); // mesmo dia não conta de novo
    await study(1);
    await study(2);
    expect((await getProgress(store, 'u1', at(2 * DAY))).streak).toBe(3);
    expect((await getProgress(store, 'u1', at(3 * DAY))).streak).toBe(3); // ainda pode estudar hoje
    expect((await getProgress(store, 'u1', at(4 * DAY))).streak).toBe(0); // pulou um dia
    await study(4);
    expect((await getProgress(store, 'u1', at(4 * DAY))).streak).toBe(1);
    expect((await getAchievements(store, 'u1', at(4 * DAY))).find((a) => a.id === 'sequencia-3')!.conquistada).toBe(true);
  });

  it('o dia vira à meia-noite de Brasília, não de Londres', () => {
    expect(studyDay(new Date('2026-09-27T02:30:00Z'))).toBe('2026-09-26'); // 23h30 em Brasília
    expect(studyDay(new Date('2026-09-27T03:30:00Z'))).toBe('2026-09-27');
  });
});

describe('missões diárias', () => {
  it('progresso do dia; resgatar só concluída e só uma vez', async () => {
    const store = setup();
    await expectError(claimMission(store, 'u1', 'concluir-fase', T0), 'MISSAO_INCOMPLETA');
    await clearPhase(store, 'u1', 'fase-01-1');
    const missions = await getMissions(store, 'u1', T0);
    expect(missions.find((m) => m.id === 'concluir-fase')).toMatchObject({ atual: 1, resgatada: false });
    expect(missions.find((m) => m.id === 'responder-10')!.atual).toBe(4);
    const before = (await getProgress(store, 'u1', T0)).xp;
    const claimed = await claimMission(store, 'u1', 'concluir-fase', T0);
    expect(claimed.progress.xp).toBe(before + 25);
    await expectError(claimMission(store, 'u1', 'concluir-fase', T0), 'MISSAO_RESGATADA');
    // No dia seguinte, recomeça.
    expect((await getMissions(store, 'u1', at(DAY))).find((m) => m.id === 'concluir-fase')).toMatchObject({ atual: 0, resgatada: false });
  });
});

describe('praticar, desafio, disciplinas e ranking', () => {
  it('praticar só usa questões de fases abertas; desafio só de fases concluídas', async () => {
    const store = setup();
    const practice = await getPracticeSession(store, 'u1', 'portugues');
    expect(practice.questoes.every((q) => fase('fase-01-1')!.questoes.includes(q.id))).toBe(true);
    await expectError(getPracticeSession(store, 'u1', 'rlm'), 'SEM_CONTEUDO');
    await expectError(getChallengeSession(store, 'u1'), 'SEM_CONTEUDO');
    await clearPhase(store, 'u1', 'fase-01-1');
    const challenge = await getChallengeSession(store, 'u1', () => 0.5);
    expect(new Set(challenge.questoes.map((q) => q.id))).toEqual(new Set(fase('fase-01-1')!.questoes));
  });

  it('disciplinas mostram dominadas e pendentes', async () => {
    const store = setup();
    await answer(store, 'u1', { questionId: 'pt-acent-1', choice: right('pt-acent-1'), mode: 'trilha' }, T0);
    await answer(store, 'u1', { questionId: 'pt-acent-2', choice: wrong('pt-acent-2'), mode: 'trilha' }, T0);
    const pt = (await getSubjects(store, 'u1')).find((s) => s.disciplina === 'portugues')!;
    expect(pt).toMatchObject({ total: 16, liberadas: 4, dominadas: 1, pendentes: 1 });
  });

  it('ranking por XP, com a posição de quem pediu', async () => {
    const store = setup();
    await clearPhase(store, 'u2', 'fase-01-1'); // 60 XP
    await answer(store, 'u1', { questionId: 'pt-acent-1', choice: right('pt-acent-1'), mode: 'trilha' }, T0); // 10 XP
    const { top, voce } = await getRanking(store, 'u1', 20, T0);
    expect(top.map((t) => [t.nome, t.xp])).toEqual([['Bruno', 60], ['Ana', 10]]);
    expect(voce).toMatchObject({ posicao: 2, xp: 10 });
  });
});
