// GameStore em memória: mesmas regras de serialização do Postgres (uma
// operação por usuário de cada vez). Usado nos testes e na demonstração.

import type { Plan } from '../shared/game.js';
import type { GameStore, QuestionState, Stats, UserTx } from './game.js';

interface UserData {
  stats: Stats | null;
  states: Map<string, QuestionState>;
  answers: { day: string; correct: boolean }[];
  phases: Map<string, string>;
  claims: Set<string>;
}

export function memoryGameStore(options: { plan?: (userId: string) => Plan; names?: Record<string, string> } = {}) {
  const users = new Map<string, UserData>();
  const locks = new Map<string, Promise<unknown>>();
  const data = (id: string): UserData => {
    if (!users.has(id)) users.set(id, { stats: null, states: new Map(), answers: [], phases: new Map(), claims: new Set() });
    return users.get(id)!;
  };

  const store: GameStore & { users: Map<string, UserData> } = {
    users,
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
  };
  return store;
}
