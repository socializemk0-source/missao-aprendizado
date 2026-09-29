// Regras do jogo — tudo que vale XP, vida, sequência e desbloqueio é
// decidido AQUI, no servidor. As telas só mostram o que isto devolve; o
// gabarito de uma questão só sai depois que o aluno responde.
//
// O acesso ao banco passa pela interface GameStore: Postgres em produção
// (server/game-pg.ts), memória nos testes e na demonstração.

import { CAPITULOS_GRATIS, DISCIPLINAS, FASES, QUESTOES, TRILHA, fase, faseDaQuestao, questao, nomeDisciplina } from '../content/trilha.js';
import type { DisciplinaId, Questao } from '../content/types.js';
import { acertoPct, type QuestionSource, type QuestionStats } from './questions.js';
import {
  HEART_REGEN_MS, MAX_HEARTS, XP_FIRST_CORRECT, XP_PHASE_BONUS,
  type Achievement, type AnswerResult, type GameErrorCode, type Mission, type Mode, type PhaseStatus,
  type Plan, type Progress, type PublicQuestion, type RankingEntry, type Session, type SubjectStats, type TrailChapter,
} from '../shared/game.js';

// ---------------------------------------------------------------- Store
export interface Stats {
  xp: number;
  hearts: number;
  heartsUpdatedAt: Date;
  streak: number;
  bestStreak: number;
  lastStudyDay: string | null; // AAAA-MM-DD no fuso de Brasília
}

export interface QuestionState {
  questionId: string;
  everCorrect: boolean;
  lastCorrect: boolean;
  timesWrong: number;
}

export interface UserTx {
  plan(): Promise<Plan>;
  stats(): Promise<Stats | null>;
  saveStats(stats: Stats): Promise<void>;
  questionStates(): Promise<Map<string, QuestionState>>;
  saveQuestionState(state: QuestionState): Promise<void>;
  addAnswer(answer: { questionId: string; choice: number; correct: boolean; mode: Mode; day: string }): Promise<void>;
  answersOnDay(day: string): Promise<{ total: number; correct: number }>;
  completedPhases(): Promise<Map<string, string>>; // faseId → dia em que concluiu
  completePhase(phaseId: string, day: string): Promise<void>;
  claimedMissions(day: string): Promise<Set<string>>;
  claimMission(day: string, missionId: string): Promise<void>;
  // Conta a 1ª resposta de cada aluno a uma questão (dificuldade real).
  bumpQuestionStats(questionId: string, correct: boolean): Promise<void>;
  // Simulados deste aluno.
  simulados(limit: number): Promise<SimuladoRow[]>; // mais recentes primeiro
  simulado(id: string): Promise<SimuladoRow | null>;
  simuladosOnDay(day: string): Promise<number>;
  createSimulado(row: NewSimulado): Promise<string>;
  finishSimulado(id: string, done: { finishedAt: Date; acertos: number; pct: number; result: SimuladoStored }): Promise<void>;
}

export interface NewSimulado {
  nivel: import('../shared/game.js').Nivel;
  disciplinas: DisciplinaId[];
  banca: string | null;
  questionIds: string[];
  timeLimitSec: number | null;
  startedAt: Date;
  day: string;
}

// O que fica guardado da entrega; o resto (percentil, % de acerto) é
// calculado na hora de mostrar, porque muda com o tempo.
export interface SimuladoStored {
  escolhas: Record<string, number | null>;
  respondidas: number;
  tempoSeg: number;
  xpGanho: number;
}

export interface SimuladoRow extends NewSimulado {
  id: string;
  finishedAt: Date | null;
  acertos: number | null;
  pct: number | null;
  result: SimuladoStored | null;
}

export interface GameStore {
  // Tudo de um usuário acontece em série (transação + trava no Postgres):
  // dois cliques ao mesmo tempo nunca dão XP em dobro.
  withUser<T>(userId: string, fn: (tx: UserTx) => Promise<T>): Promise<T>;
  topXp(limit: number): Promise<{ userId: string; displayName: string; xp: number }[]>;
  rankOf(xp: number): Promise<number>; // quantos têm mais XP + 1
  questions: QuestionSource;
  questionStats(ids: string[]): Promise<Map<string, QuestionStats>>;
  // % dos simulados entregues por OUTROS alunos neste nível com nota menor
  // (null se ainda há poucos para comparar).
  simuladoPercentile(nivel: import('../shared/game.js').Nivel, pct: number, userId: string): Promise<number | null>;
}

// Percentil só com pelo menos 10 simulados de outros alunos no mesmo nível.
export const PERCENTILE_MIN = 10;

export class GameError extends Error {
  constructor(readonly code: GameErrorCode, readonly status: number, message: string, readonly extra: Record<string, unknown> = {}) {
    super(message);
  }
}

// ---------------------------------------------------------------- Datas
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });

export function studyDay(now: Date): string {
  return dayFormat.format(now); // AAAA-MM-DD
}

export function previousDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- Vidas e progresso
function freshStats(now: Date): Stats {
  return { xp: 0, hearts: MAX_HEARTS, heartsUpdatedAt: now, streak: 0, bestStreak: 0, lastStudyDay: null };
}

// Recarrega 1 vida a cada HEART_REGEN_MS desde a última contagem.
export function regenHearts(stats: Stats, now: Date): Stats {
  if (stats.hearts >= MAX_HEARTS) return { ...stats, hearts: MAX_HEARTS, heartsUpdatedAt: now };
  const elapsed = now.getTime() - stats.heartsUpdatedAt.getTime();
  const gained = Math.floor(Math.max(0, elapsed) / HEART_REGEN_MS);
  if (gained === 0) return stats;
  const hearts = Math.min(MAX_HEARTS, stats.hearts + gained);
  const heartsUpdatedAt = hearts >= MAX_HEARTS ? now : new Date(stats.heartsUpdatedAt.getTime() + gained * HEART_REGEN_MS);
  return { ...stats, hearts, heartsUpdatedAt };
}

function effectiveStreak(stats: Stats, today: string): number {
  if (!stats.lastStudyDay) return 0;
  return stats.lastStudyDay === today || stats.lastStudyDay === previousDay(today) ? stats.streak : 0;
}

export function toProgress(stats: Stats, plan: Plan, now: Date): Progress {
  const today = studyDay(now);
  const pro = plan === 'pro';
  return {
    plan,
    xp: stats.xp,
    hearts: pro ? null : stats.hearts,
    maxHearts: MAX_HEARTS,
    nextHeartAt: !pro && stats.hearts < MAX_HEARTS ? new Date(stats.heartsUpdatedAt.getTime() + HEART_REGEN_MS).toISOString() : null,
    streak: effectiveStreak(stats, today),
    studiedToday: stats.lastStudyDay === today,
  };
}

// Sequência de dias: conta o primeiro estudo de cada dia.
export function touchStreak(stats: Stats, today: string): Stats {
  if (stats.lastStudyDay === today) return stats;
  const streak = stats.lastStudyDay === previousDay(today) ? stats.streak + 1 : 1;
  return { ...stats, streak, bestStreak: Math.max(stats.bestStreak, streak), lastStudyDay: today };
}

export async function loadStats(tx: UserTx, now: Date): Promise<Stats> {
  return regenHearts((await tx.stats()) ?? freshStats(now), now);
}

export async function getProgress(store: GameStore, userId: string, now = new Date()): Promise<Progress> {
  return store.withUser(userId, async (tx) => toProgress(await loadStats(tx, now), await tx.plan(), now));
}

// ---------------------------------------------------------------- Trilha
function statusOf(ordem: number, capituloIndex: number, done: Map<string, string>, plan: Plan): PhaseStatus {
  const f = FASES[ordem]!;
  if (done.has(f.id)) return 'done';
  const previousDone = ordem === 0 || done.has(FASES[ordem - 1]!.id);
  if (!previousDone) return 'locked';
  return capituloIndex >= CAPITULOS_GRATIS && plan !== 'pro' ? 'pro' : 'available';
}

function phaseStatusMap(done: Map<string, string>, plan: Plan): Map<string, PhaseStatus> {
  return new Map(FASES.map((f) => [f.id, statusOf(f.ordem, f.capituloIndex, done, plan)]));
}

const isOpen = (status: PhaseStatus | undefined) => status === 'done' || status === 'available';

// Questão já vista pode ser revisada, menos as de capítulo PRO no grátis.
function reviewAllowed(questionId: string, plan: Plan): boolean {
  const f = faseDaQuestao(questionId);
  return plan === 'pro' || !f || f.capituloIndex < CAPITULOS_GRATIS;
}

export async function getTrail(store: GameStore, userId: string): Promise<TrailChapter[]> {
  return store.withUser(userId, async (tx) => {
    const [plan, done, states] = [await tx.plan(), await tx.completedPhases(), await tx.questionStates()];
    const statuses = phaseStatusMap(done, plan);
    return TRILHA.map((cap, i) => ({
      id: cap.id,
      titulo: cap.titulo,
      descricao: cap.descricao,
      disciplina: cap.disciplina,
      disciplinaNome: nomeDisciplina(cap.disciplina),
      gratis: i < CAPITULOS_GRATIS,
      fases: cap.fases.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        status: statuses.get(f.id)!,
        total: f.questoes.length,
        dominadas: f.questoes.filter((q) => states.get(q)?.everCorrect).length,
      })),
    }));
  });
}

export function toPublic(q: Questao): PublicQuestion {
  return { id: q.id, disciplina: q.disciplina, assunto: q.assunto, enunciado: q.enunciado, alternativas: q.alternativas, fonte: q.fonte };
}

export async function getPhaseSession(store: GameStore, userId: string, faseId: string): Promise<Session> {
  const f = fase(faseId);
  if (!f) throw new GameError('QUESTAO_INEXISTENTE', 404, 'Fase não encontrada.');
  return store.withUser(userId, async (tx) => {
    const status = phaseStatusMap(await tx.completedPhases(), await tx.plan()).get(f.id);
    if (status === 'pro') throw new GameError('PLANO_PRO', 403, 'Este capítulo é do plano PRO.');
    if (!isOpen(status)) throw new GameError('FASE_BLOQUEADA', 403, 'Conclua a fase anterior para abrir esta.');
    return {
      mode: 'trilha', faseId: f.id, titulo: f.titulo,
      subtitulo: `Capítulo ${f.capituloIndex + 1} · ${f.capitulo.titulo}`,
      questoes: f.questoes.map((id) => toPublic(questao(id)!)),
    };
  });
}

// ---------------------------------------------------------------- Responder
export async function answer(
  store: GameStore, userId: string,
  input: { questionId: string; choice: number; mode: Mode },
  now = new Date(),
): Promise<AnswerResult> {
  if (input.mode === 'simulado') throw new GameError('ACAO_INVALIDA', 400, 'Simulado é entregue de uma vez.');
  const q = questao(input.questionId) ?? (await store.questions.get([input.questionId])).get(input.questionId);
  const f = faseDaQuestao(input.questionId);
  if (!q) throw new GameError('QUESTAO_INEXISTENTE', 404, 'Questão não encontrada.');
  if (!Number.isInteger(input.choice) || input.choice < 0 || input.choice >= q.alternativas.length) {
    throw new GameError('ALTERNATIVA_INVALIDA', 400, 'Alternativa inválida.');
  }

  const result = await store.withUser(userId, async (tx) => {
    const plan = await tx.plan();
    const done = await tx.completedPhases();
    const states = await tx.questionStates();
    // Revisar vale para qualquer questão que o aluno já viu (inclusive no
    // simulado, fora da ordem da trilha), menos capítulo PRO no grátis.
    const reviewing = input.mode === 'revisar' && states.has(q.id);
    if (f) {
      const status = phaseStatusMap(done, plan).get(f.id);
      if (status === 'pro' || (reviewing && !reviewAllowed(q.id, plan))) throw new GameError('PLANO_PRO', 403, 'Este capítulo é do plano PRO.');
      if (!isOpen(status) && !reviewing) throw new GameError('FASE_BLOQUEADA', 403, 'Conclua a fase anterior para abrir esta.');
    } else if (!reviewing) {
      // Questão do banco (fora da trilha): chega pelo simulado e volta na revisão.
      throw new GameError('QUESTAO_INEXISTENTE', 404, 'Questão não encontrada.');
    }

    let stats = await loadStats(tx, now);
    // Só a trilha gasta vidas; revisar e praticar são o jeito de estudar
    // enquanto as vidas recarregam.
    const spendsHearts = plan !== 'pro' && input.mode === 'trilha';
    if (spendsHearts && stats.hearts <= 0) {
      throw new GameError('SEM_VIDAS', 403, 'Suas vidas acabaram. Revise seus erros enquanto elas recarregam.', {
        nextHeartAt: new Date(stats.heartsUpdatedAt.getTime() + HEART_REGEN_MS).toISOString(),
      });
    }

    const correct = input.choice === q.correta;
    const prev = states.get(q.id);
    const firstCorrect = correct && !prev?.everCorrect;
    let xpGanho = firstCorrect ? XP_FIRST_CORRECT : 0;

    if (!correct && spendsHearts) {
      const wasFull = stats.hearts >= MAX_HEARTS;
      stats = { ...stats, hearts: stats.hearts - 1, heartsUpdatedAt: wasFull ? now : stats.heartsUpdatedAt };
    }

    const today = studyDay(now);
    stats = touchStreak(stats, today);

    const state: QuestionState = {
      questionId: q.id,
      everCorrect: Boolean(prev?.everCorrect) || correct,
      lastCorrect: correct,
      timesWrong: (prev?.timesWrong ?? 0) + (correct ? 0 : 1),
    };
    await tx.saveQuestionState(state);
    await tx.addAnswer({ questionId: q.id, choice: input.choice, correct, mode: input.mode, day: today });
    if (!prev) await tx.bumpQuestionStats(q.id, correct);
    states.set(q.id, state);

    // Fase concluída = todas as questões dela acertadas pelo menos uma vez.
    let faseConcluida: AnswerResult['faseConcluida'] = null;
    if (f && !done.has(f.id) && f.questoes.every((id) => states.get(id)?.everCorrect)) {
      await tx.completePhase(f.id, today);
      xpGanho += XP_PHASE_BONUS;
      faseConcluida = { id: f.id, titulo: f.titulo, bonus: XP_PHASE_BONUS };
    }

    stats = { ...stats, xp: stats.xp + xpGanho };
    await tx.saveStats(stats);
    return { correct, correta: q.correta, explicacao: q.explicacao, xpGanho, faseConcluida, progress: toProgress(stats, plan, now) };
  });
  return { ...result, acerto: acertoPct((await store.questionStats([q.id])).get(q.id)) };
}

// ---------------------------------------------------------------- Revisar, praticar, desafio
async function openQuestionIds(tx: UserTx): Promise<Set<string>> {
  const statuses = phaseStatusMap(await tx.completedPhases(), await tx.plan());
  return new Set(FASES.filter((f) => isOpen(statuses.get(f.id))).flatMap((f) => f.questoes));
}

export async function getReviewSession(store: GameStore, userId: string, limit = 10): Promise<Session> {
  return store.withUser(userId, async (tx) => {
    const plan = await tx.plan();
    const pending = [...(await tx.questionStates()).values()]
      .filter((s) => !s.lastCorrect && reviewAllowed(s.questionId, plan))
      .sort((a, b) => b.timesWrong - a.timesWrong)
      .slice(0, limit);
    const found = await store.questions.get(pending.map((s) => s.questionId));
    const questoes = pending.flatMap((s) => (found.has(s.questionId) ? [toPublic(found.get(s.questionId)!)] : []));
    return {
      mode: 'revisar', faseId: null, titulo: 'Revisar erros',
      subtitulo: questoes.length ? `${questoes.length} questão(ões) para acertar` : 'Nenhum erro pendente',
      questoes,
    };
  });
}

export async function getPracticeSession(store: GameStore, userId: string, disciplina: DisciplinaId, limit = 10): Promise<Session> {
  if (!DISCIPLINAS.some((d) => d.id === disciplina)) throw new GameError('ACAO_INVALIDA', 400, 'Disciplina inválida.');
  return store.withUser(userId, async (tx) => {
    const open = await openQuestionIds(tx);
    const states = await tx.questionStates();
    // Primeiro o que ainda não domina, depois o resto.
    const pool = QUESTOES.filter((q) => q.disciplina === disciplina && open.has(q.id))
      .sort((a, b) => Number(Boolean(states.get(a.id)?.everCorrect)) - Number(Boolean(states.get(b.id)?.everCorrect)));
    if (pool.length === 0) throw new GameError('SEM_CONTEUDO', 404, 'Abra a primeira fase desta disciplina na trilha para praticar.');
    return {
      mode: 'pratica', faseId: null, titulo: `Praticar ${nomeDisciplina(disciplina)}`,
      subtitulo: 'Questões das fases que você já abriu', questoes: pool.slice(0, limit).map(toPublic),
    };
  });
}

export async function getChallengeSession(store: GameStore, userId: string, random = Math.random, size = 10): Promise<Session> {
  return store.withUser(userId, async (tx) => {
    const done = await tx.completedPhases();
    const pool = FASES.filter((f) => done.has(f.id)).flatMap((f) => f.questoes);
    if (pool.length === 0) throw new GameError('SEM_CONTEUDO', 404, 'Conclua pelo menos uma fase da trilha para liberar o desafio.');
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return {
      mode: 'desafio', faseId: null, titulo: 'Desafio relâmpago',
      subtitulo: 'Questões das fases que você já concluiu', questoes: shuffled.slice(0, size).map((id) => toPublic(questao(id)!)),
    };
  });
}

// ---------------------------------------------------------------- Missões
const MISSIONS = [
  { id: 'responder-10', titulo: 'Responda 10 questões', meta: 10, xp: 15, measure: (d: DayNumbers) => d.total },
  { id: 'acertar-7', titulo: 'Acerte 7 questões', meta: 7, xp: 20, measure: (d: DayNumbers) => d.correct },
  { id: 'concluir-fase', titulo: 'Conclua 1 fase da trilha', meta: 1, xp: 25, measure: (d: DayNumbers) => d.phases },
] as const;

interface DayNumbers { total: number; correct: number; phases: number }

async function dayNumbers(tx: UserTx, day: string): Promise<DayNumbers> {
  const answers = await tx.answersOnDay(day);
  const phases = [...(await tx.completedPhases()).values()].filter((d) => d === day).length;
  return { ...answers, phases };
}

export async function getMissions(store: GameStore, userId: string, now = new Date()): Promise<Mission[]> {
  const day = studyDay(now);
  return store.withUser(userId, async (tx) => {
    const numbers = await dayNumbers(tx, day);
    const claimed = await tx.claimedMissions(day);
    return MISSIONS.map((m) => ({ id: m.id, titulo: m.titulo, meta: m.meta, xp: m.xp, atual: Math.min(m.meta, m.measure(numbers)), resgatada: claimed.has(m.id) }));
  });
}

export async function claimMission(store: GameStore, userId: string, missionId: string, now = new Date()): Promise<{ xpGanho: number; progress: Progress }> {
  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) throw new GameError('ACAO_INVALIDA', 400, 'Missão inválida.');
  const day = studyDay(now);
  return store.withUser(userId, async (tx) => {
    if ((await tx.claimedMissions(day)).has(mission.id)) throw new GameError('MISSAO_RESGATADA', 409, 'Você já resgatou esta missão hoje.');
    if (mission.measure(await dayNumbers(tx, day)) < mission.meta) throw new GameError('MISSAO_INCOMPLETA', 409, 'A missão ainda não foi concluída.');
    await tx.claimMission(day, mission.id);
    const stats = await loadStats(tx, now);
    const next = { ...stats, xp: stats.xp + mission.xp };
    await tx.saveStats(next);
    return { xpGanho: mission.xp, progress: toProgress(next, await tx.plan(), now) };
  });
}

// ---------------------------------------------------------------- Conquistas, disciplinas, ranking
export async function getAchievements(store: GameStore, userId: string, now = new Date()): Promise<Achievement[]> {
  return store.withUser(userId, async (tx) => {
    const stats = await loadStats(tx, now);
    const done = await tx.completedPhases();
    const states = [...(await tx.questionStates()).values()];
    const dominated = states.filter((s) => s.everCorrect).length;
    const corrected = states.filter((s) => s.everCorrect && s.timesWrong > 0).length;
    const chapterDone = TRILHA.some((c) => c.fases.every((f) => done.has(f.id)));
    const list: [string, string, string, boolean][] = [
      ['primeira-fase', 'Primeiro passo', 'Conclua sua primeira fase.', done.size >= 1],
      ['capitulo', 'Capítulo fechado', 'Conclua todas as fases de um capítulo.', chapterDone],
      ['cinco-fases', 'Embalado', 'Conclua 5 fases.', done.size >= 5],
      ['sequencia-3', 'Constância', 'Estude 3 dias seguidos.', stats.bestStreak >= 3],
      ['sequencia-7', 'Uma semana firme', 'Estude 7 dias seguidos.', stats.bestStreak >= 7],
      ['xp-100', 'Cem de XP', 'Junte 100 XP.', stats.xp >= 100],
      ['xp-500', 'Quinhentos de XP', 'Junte 500 XP.', stats.xp >= 500],
      ['dominadas-25', 'Afiado', 'Domine 25 questões.', dominated >= 25],
      ['revisor', 'Aprendi com o erro', 'Acerte 5 questões que você tinha errado.', corrected >= 5],
      ['trilha-completa', 'Trilha completa', 'Conclua todas as fases da trilha.', done.size === FASES.length],
    ];
    return list.map(([id, titulo, descricao, conquistada]) => ({ id, titulo, descricao, conquistada }));
  });
}

export async function getSubjects(store: GameStore, userId: string): Promise<SubjectStats[]> {
  return store.withUser(userId, async (tx) => {
    const open = await openQuestionIds(tx);
    const states = await tx.questionStates();
    return DISCIPLINAS.map((d) => {
      const all = QUESTOES.filter((q) => q.disciplina === d.id);
      return {
        disciplina: d.id,
        nome: d.nome,
        total: all.length,
        liberadas: all.filter((q) => open.has(q.id)).length,
        dominadas: all.filter((q) => states.get(q.id)?.everCorrect).length,
        pendentes: all.filter((q) => states.get(q.id) && !states.get(q.id)!.lastCorrect).length,
      };
    });
  });
}

export async function getRanking(store: GameStore, userId: string, limit = 20, now = new Date()): Promise<{ top: RankingEntry[]; voce: RankingEntry }> {
  const top = await store.topXp(limit);
  const myXp = (await getProgress(store, userId, now)).xp;
  const myName = top.find((t) => t.userId === userId)?.displayName ?? 'Você';
  return {
    top: top.map((t, i) => ({ posicao: i + 1, nome: t.displayName, xp: t.xp, voce: t.userId === userId })),
    voce: { posicao: await store.rankOf(myXp), nome: myName, xp: myXp, voce: true },
  };
}
