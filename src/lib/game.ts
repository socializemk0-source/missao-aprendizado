import type {
  Achievement, AnswerResult, Mission, Mode, Progress, RankingEntry, Session, SubjectStats, TrailChapter,
} from '../../shared/game';
import type { Fonte } from '../../content/types';
import { api } from './api';

const get = <T,>(action: string, params: Record<string, string> = {}) =>
  api<T>(`/api/game?${new URLSearchParams({ action, ...params })}`);
const post = <T,>(action: string, body: unknown) =>
  api<T>(`/api/game?action=${action}`, { method: 'POST', body: JSON.stringify(body) });

export const game = {
  progress: () => get<Progress>('progresso'),
  trail: () => get<{ capitulos: TrailChapter[]; progress: Progress }>('trilha'),
  phase: (id: string) => get<Session>('fase', { id }),
  review: () => get<Session>('revisar'),
  practice: (disciplina: string) => get<Session>('pratica', { disciplina }),
  challenge: () => get<Session>('desafio'),
  missions: () => get<{ missoes: Mission[] }>('missoes'),
  achievements: () => get<{ conquistas: Achievement[] }>('conquistas'),
  subjects: () => get<{ disciplinas: SubjectStats[] }>('disciplinas'),
  ranking: () => get<{ top: RankingEntry[]; voce: RankingEntry }>('ranking'),
  answer: (questionId: string, choice: number, mode: Mode) => post<AnswerResult>('responder', { questionId, choice, mode }),
  claim: (missionId: string) => post<{ xpGanho: number; progress: Progress }>('resgatar', { missionId }),
};

export function fonteLabel(fonte: Fonte): string {
  if (fonte.tipo === 'oficial') return `${fonte.banca} · ${fonte.orgao} · ${fonte.cargo} · ${fonte.ano}`;
  return fonte.estilo ? `Questão autoral no estilo ${fonte.estilo}` : 'Questão autoral';
}

export function timeUntil(iso: string | null, now = Date.now()): string {
  if (!iso) return '';
  const ms = Math.max(0, new Date(iso).getTime() - now);
  const min = Math.ceil(ms / 60_000);
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`;
}
