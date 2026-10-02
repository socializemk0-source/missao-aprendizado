// Simulado: o aluno escolhe dificuldade, matérias, banca, tamanho e se
// quer cronômetro. O servidor sorteia as questões pela dificuldade que
// vale agora (estimada ou real), guarda quais foram, e só mostra o
// gabarito na entrega. Não gasta vidas; dá XP como a trilha (1º acerto).
// Plano Grátis: 1 por dia.

import { DISCIPLINAS, nomeDisciplina } from '../content/trilha.js';
import type { Dificuldade, DisciplinaId, Questao } from '../content/types.js';
import {
  MISTO, NIVEIS, NIVEL_DE, SIMULADOS_GRATIS_POR_DIA, SIMULADO_SEG_POR_QUESTAO, SIMULADO_TAMANHOS, XP_FIRST_CORRECT,
  type Nivel, type Progress, type SimuladoOpcoes, type SimuladoResultado, type SimuladoSessao,
} from '../shared/game.js';
import { GameError, loadStats, studyDay, toProgress, toPublic, touchStreak, type GameStore, type SimuladoRow } from './game.js';
import { acertoPct, nivelAtual, type CatalogItem } from './questions.js';

const OPEN_FOR_MS = 6 * 60 * 60 * 1000; // um simulado não entregue fica aberto por 6 h

export interface SimuladoInput {
  nivel: Nivel;
  disciplinas: DisciplinaId[];
  banca: string | null;
  quantidade: number;
  cronometro: boolean;
}

export function parseSimuladoInput(body: Record<string, unknown>): SimuladoInput | null {
  const known = new Set(DISCIPLINAS.map((d) => d.id));
  const disciplinas = Array.isArray(body.disciplinas) ? [...new Set(body.disciplinas)] : [];
  if (!NIVEIS.includes(body.nivel as Nivel)) return null;
  if (disciplinas.length === 0 || !disciplinas.every((d) => known.has(d as DisciplinaId))) return null;
  if (!SIMULADO_TAMANHOS.includes(body.quantidade as number)) return null;
  if (body.banca !== null && body.banca !== undefined && (typeof body.banca !== 'string' || body.banca.length > 40)) return null;
  return {
    nivel: body.nivel as Nivel,
    disciplinas: disciplinas as DisciplinaId[],
    banca: typeof body.banca === 'string' && body.banca ? body.banca : null,
    quantidade: body.quantidade as number,
    cronometro: body.cronometro === true,
  };
}

const isOpenRow = (r: SimuladoRow, now: Date) => !r.finishedAt && now.getTime() - r.startedAt.getTime() < OPEN_FOR_MS;

function shuffle<T>(list: T[], random: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// Questões que o aluno pode receber, já com a dificuldade que vale agora.
async function pool(store: GameStore, pro: boolean): Promise<(CatalogItem & { nivel: Dificuldade })[]> {
  const catalog = (await store.questions.catalog()).filter((c) => pro || !c.pro);
  const stats = await store.questionStats(catalog.map((c) => c.id));
  return catalog.map((c) => ({ ...c, nivel: nivelAtual(c.dificuldade, stats.get(c.id)) }));
}

// Sorteio pela dificuldade. Misto: 30/50/20, completando com o que houver.
export function pickQuestions(items: { id: string; nivel: Dificuldade }[], nivel: Nivel, n: number, random: () => number): string[] | null {
  const by: Record<Dificuldade, string[]> = { 1: [], 2: [], 3: [] };
  for (const it of shuffle(items, random)) by[it.nivel].push(it.id);
  if (nivel !== 'misto') {
    const list = by[NIVEL_DE[nivel]];
    return list.length >= n ? list.slice(0, n) : null;
  }
  if (items.length < n) return null;
  const want: Record<Dificuldade, number> = { 1: Math.round(n * MISTO[1]), 2: Math.round(n * MISTO[2]), 3: 0 };
  want[3] = n - want[1] - want[2];
  const picked = ([1, 2, 3] as Dificuldade[]).flatMap((d) => by[d].slice(0, want[d]));
  const rest = shuffle(([1, 2, 3] as Dificuldade[]).flatMap((d) => by[d].slice(want[d])), random);
  return shuffle([...picked, ...rest.slice(0, n - picked.length)], random);
}

// ---------------------------------------------------------------- Opções
export async function getSimuladoOptions(store: GameStore, userId: string, now = new Date()): Promise<SimuladoOpcoes> {
  const today = studyDay(now);
  const { plan, usados, rows } = await store.withUser(userId, async (tx) => ({
    plan: await tx.plan(), usados: await tx.simuladosOnDay(today), rows: await tx.simulados(10),
  }));
  const items = await pool(store, plan === 'pro');
  const counts = new Map<string, { disciplina: DisciplinaId; banca: string | null; dificuldade: Dificuldade; n: number }>();
  for (const it of items) {
    const key = `${it.disciplina}|${it.banca ?? ''}|${it.nivel}`;
    const c = counts.get(key) ?? { disciplina: it.disciplina, banca: it.banca, dificuldade: it.nivel, n: 0 };
    c.n++;
    counts.set(key, c);
  }
  return {
    disciplinas: DISCIPLINAS.map((d) => ({ id: d.id, nome: d.nome })),
    bancas: [...new Set(items.flatMap((i) => (i.banca ? [i.banca] : [])))].sort(),
    contagem: [...counts.values()],
    limite: { plano: plan, porDia: plan === 'pro' ? null : SIMULADOS_GRATIS_POR_DIA, usadosHoje: usados },
    aberto: rows.find((r) => isOpenRow(r, now))?.id ?? null,
    historico: rows.map((r) => ({ id: r.id, nivel: r.nivel, total: r.questionIds.length, acertos: r.acertos, iniciadoEm: r.startedAt.toISOString() })),
  };
}

// ---------------------------------------------------------------- Começar
function toSessao(row: SimuladoRow, questions: Map<string, Questao>): SimuladoSessao {
  return {
    id: row.id,
    nivel: row.nivel,
    questoes: row.questionIds.flatMap((id) => (questions.has(id) ? [toPublic(questions.get(id)!)] : [])),
    iniciadoEm: row.startedAt.toISOString(),
    prazo: row.timeLimitSec ? new Date(row.startedAt.getTime() + row.timeLimitSec * 1000).toISOString() : null,
  };
}

export async function startSimulado(store: GameStore, userId: string, input: SimuladoInput, now = new Date(), random = Math.random): Promise<SimuladoSessao> {
  const today = studyDay(now);
  const plan = await store.withUser(userId, (tx) => tx.plan());
  const items = (await pool(store, plan === 'pro'))
    .filter((i) => input.disciplinas.includes(i.disciplina) && (!input.banca || i.banca === input.banca));
  const ids = pickQuestions(items, input.nivel, input.quantidade, random);
  if (!ids) {
    throw new GameError('POUCAS_QUESTOES', 409, 'Ainda não há questões suficientes com esses filtros. Escolha menos questões ou mais matérias.');
  }

  const row = await store.withUser(userId, async (tx) => {
    const open = (await tx.simulados(5)).find((r) => isOpenRow(r, now));
    if (open) throw new GameError('SIMULADO_ABERTO', 409, 'Você tem um simulado em andamento. Termine ou entregue antes de começar outro.', { id: open.id });
    if ((await tx.plan()) !== 'pro' && (await tx.simuladosOnDay(today)) >= SIMULADOS_GRATIS_POR_DIA) {
      throw new GameError('LIMITE_SIMULADO', 403, `O Plano Grátis tem ${SIMULADOS_GRATIS_POR_DIA} simulado por dia. Volte amanhã ou faça quantos quiser com o PRO.`);
    }
    const values = {
      nivel: input.nivel, disciplinas: input.disciplinas, banca: input.banca, questionIds: ids,
      timeLimitSec: input.cronometro ? ids.length * SIMULADO_SEG_POR_QUESTAO : null, startedAt: now, day: today,
    };
    const id = await tx.createSimulado(values);
    return { ...values, id, finishedAt: null, acertos: null, pct: null, result: null } satisfies SimuladoRow;
  });
  return toSessao(row, await store.questions.get(row.questionIds));
}

// ---------------------------------------------------------------- Ver
async function toResultado(store: GameStore, userId: string, row: SimuladoRow): Promise<SimuladoResultado> {
  const r = row.result!;
  const questions = await store.questions.get(row.questionIds);
  const stats = await store.questionStats(row.questionIds);
  const list = row.questionIds.flatMap((id) => (questions.has(id) ? [questions.get(id)!] : []));
  const porDisciplina = [...new Set(list.map((q) => q.disciplina))].map((d) => {
    const qs = list.filter((q) => q.disciplina === d);
    return { disciplina: d, nome: nomeDisciplina(d), total: qs.length, acertos: qs.filter((q) => r.escolhas[q.id] === q.correta).length };
  });
  return {
    id: row.id, nivel: row.nivel, total: row.questionIds.length, respondidas: r.respondidas,
    acertos: row.acertos ?? 0, pct: row.pct ?? 0, tempoSeg: r.tempoSeg, xpGanho: r.xpGanho,
    percentil: await store.simuladoPercentile(row.nivel, row.pct ?? 0, userId),
    porDisciplina,
    questoes: list.map((q) => ({
      ...toPublic(q), escolha: r.escolhas[q.id] ?? null, correta: q.correta, explicacao: q.explicacao,
      dificuldade: nivelAtual(q.dificuldade, stats.get(q.id)), acerto: acertoPct(stats.get(q.id)),
    })),
  };
}

export async function getSimulado(store: GameStore, userId: string, id: string, now = new Date()):
  Promise<{ estado: 'aberto'; sessao: SimuladoSessao } | { estado: 'entregue'; resultado: SimuladoResultado }> {
  const row = await store.withUser(userId, (tx) => tx.simulado(id));
  if (!row) throw new GameError('SIMULADO_INEXISTENTE', 404, 'Simulado não encontrado.');
  if (row.result) return { estado: 'entregue', resultado: await toResultado(store, userId, row) };
  if (!isOpenRow(row, now)) throw new GameError('SIMULADO_INEXISTENTE', 404, 'Este simulado expirou sem ser entregue.');
  return { estado: 'aberto', sessao: toSessao(row, await store.questions.get(row.questionIds)) };
}

// ---------------------------------------------------------------- Entregar
export async function deliverSimulado(
  store: GameStore, userId: string, id: string, respostas: Record<string, unknown>, now = new Date(),
): Promise<{ resultado: SimuladoResultado; progress: Progress }> {
  const peek = await store.withUser(userId, (tx) => tx.simulado(id));
  if (!peek) throw new GameError('SIMULADO_INEXISTENTE', 404, 'Simulado não encontrado.');
  const questions = await store.questions.get(peek.questionIds);

  const { row, progress } = await store.withUser(userId, async (tx) => {
    const row = await tx.simulado(id);
    if (!row) throw new GameError('SIMULADO_INEXISTENTE', 404, 'Simulado não encontrado.');
    const plan = await tx.plan();
    // Entregar de novo (clique duplo, conexão que caiu) devolve o mesmo resultado.
    if (row.result) return { row, progress: toProgress(await loadStats(tx, now), plan, now) };

    const today = studyDay(now);
    const states = await tx.questionStates();
    let stats = await loadStats(tx, now);
    const escolhas: Record<string, number | null> = {};
    let acertos = 0;
    let respondidas = 0;
    let xpGanho = 0;
    for (const qid of row.questionIds) {
      const q = questions.get(qid);
      const raw = respostas[qid];
      const choice = q && Number.isInteger(raw) && (raw as number) >= 0 && (raw as number) < q.alternativas.length ? (raw as number) : null;
      escolhas[qid] = choice;
      if (!q || choice === null) continue;
      respondidas++;
      const correct = choice === q.correta;
      if (correct) acertos++;
      const prev = states.get(qid);
      if (correct && !prev?.everCorrect) xpGanho += XP_FIRST_CORRECT;
      await tx.saveQuestionState({
        questionId: qid, everCorrect: Boolean(prev?.everCorrect) || correct, lastCorrect: correct,
        timesWrong: (prev?.timesWrong ?? 0) + (correct ? 0 : 1),
      });
      await tx.addAnswer({ questionId: qid, choice, correct, mode: 'simulado', day: today });
      if (!prev) await tx.bumpQuestionStats(qid, correct);
    }
    if (respondidas > 0) stats = touchStreak(stats, today);
    stats = { ...stats, xp: stats.xp + xpGanho };
    await tx.saveStats(stats);

    const elapsed = Math.round((now.getTime() - row.startedAt.getTime()) / 1000);
    const tempoSeg = Math.max(0, row.timeLimitSec ? Math.min(elapsed, row.timeLimitSec) : elapsed);
    const pct = Math.round((acertos / row.questionIds.length) * 100);
    const result = { escolhas, respondidas, tempoSeg, xpGanho };
    await tx.finishSimulado(row.id, { finishedAt: now, acertos, pct, result });
    return { row: { ...row, finishedAt: now, acertos, pct, result }, progress: toProgress(stats, plan, now) };
  });
  return { resultado: await toResultado(store, userId, row), progress };
}
