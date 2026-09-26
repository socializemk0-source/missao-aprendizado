// GameStore em memória: mesmas regras de serialização do Postgres (uma
// operação por usuário de cada vez). Usado nos testes e na demonstração.

import type { Plan } from '../shared/game.js';
import { PERCENTILE_MIN, type GameStore, type QuestionState, type SimuladoRow, type Stats, type UserTx } from './game.js';
import { contentSource, type QuestionSource, type QuestionStats } from './questions.js';

interface UserData {
  stats: Stats | null;
  states: Map<string, QuestionState>;
  answers: { day: string; correct: boolean }[];
  phases: Map<string, string>;
  claims: Set<string>;
  simulados: SimuladoRow[];
}

export function memoryGameStore(options: { plan?: (userId: string) => Plan; names?: Record<string, string>; questions?: QuestionSource } = {}) {
  const users = new Map<string, UserData>();
  const qstats = new Map<string, QuestionStats>();
  let seq = 0;
  const locks = new Map<string, Promise<unknown>>();
  const data = (id: string): UserData => {
    if (!users.has(id)) users.set(id, { stats: null, states: new Map(), answers: [], phases: new Map(), claims: new Set(), simulados: [] });
    return users.get(id)!;
  };

  const store: GameStore & { users: Map<string, UserData>; qstats: Map<string, QuestionStats> } = {
    users,
    qstats,
    questions: options.questions ?? contentSource(),
    async withUser(userId, fn) {
      const d = data(userId);
      const tx: UserTx = {
        plan: async () => options.plan?.(userId) ?? 'free',
        stats: async () => (d.stats ? { ...d.stats } : null),
        saveStats: async (s) => { d.stats = { ...s }; },
        questionStates: async () => new Map([...d.states].map(([k, v]) => [k, { ...v }])),
        saveQuestionState: async (s) => { d.states.set(s.questionId, { ...s }); },
        addAnswer: async (a) => { d.answers.push({ day: a.day, correct: a.correct }); },
        answersOnDay: async (day) => {
          const list = d.answers.filter((a) => a.day === day);
          return { total: list.length, correct: list.filter((a) => a.correct).length };
        },
        completedPhases: async () => new Map(d.phases),
        completePhase: async (id, day) => { if (!d.phases.has(id)) d.phases.set(id, day); },
        claimedMissions: async (day) => new Set([...d.claims].filter((c) => c.startsWith(`${day}:`)).map((c) => c.slice(day.length + 1))),
        claimMission: async (day, id) => { d.claims.add(`${day}:${id}`); },
        bumpQuestionStats: async (id, correct) => {
          const cur = qstats.get(id) ?? { respostas: 0, acertos: 0 };
          qstats.set(id, { respostas: cur.respostas + 1, acertos: cur.acertos + (correct ? 1 : 0) });
        },
        simulados: async (limit) => [...d.simulados].sort((a, b) => +b.startedAt - +a.startedAt).slice(0, limit).map((r) => ({ ...r })),
        simulado: async (id) => { const r = d.simulados.find((x) => x.id === id); return r ? { ...r } : null; },
        simuladosOnDay: async (day) => d.simulados.filter((r) => r.day === day).length,
        createSimulado: async (row) => {
          const id = `sim-${++seq}`;
          d.simulados.push({ ...row, id, finishedAt: null, acertos: null, pct: null, result: null });
          return id;
        },
        finishSimulado: async (id, done) => {
          const r = d.simulados.find((x) => x.id === id);
          if (r) Object.assign(r, done);
        },
      };
      const previous = locks.get(userId) ?? Promise.resolve();
      const run = previous.catch(() => {}).then(() => fn(tx));
      locks.set(userId, run);
      return run;
    },
    async topXp(limit) {
      return [...users.entries()]
        .filter(([, d]) => d.stats)
        .map(([userId, d]) => ({ userId, displayName: options.names?.[userId] ?? userId, xp: d.stats!.xp }))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, limit);
    },
    async rankOf(xp) {
      return [...users.values()].filter((d) => (d.stats?.xp ?? 0) > xp).length + 1;
    },
    questionStats: async (ids) => new Map(ids.flatMap((id) => (qstats.has(id) ? [[id, { ...qstats.get(id)! }] as const] : []))),
    async simuladoPercentile(nivel, pct, userId) {
      const others = [...users.entries()].filter(([u]) => u !== userId)
        .flatMap(([, d]) => d.simulados.filter((r) => r.nivel === nivel && r.pct !== null).map((r) => r.pct!));
      return others.length >= PERCENTILE_MIN ? Math.round((others.filter((p) => p < pct).length / others.length) * 100) : null;
    },
  };
  return store;
}
