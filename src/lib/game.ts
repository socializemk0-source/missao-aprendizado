import type {
  Achievement, AnswerResult, JogadaResultado, JogoFim, JogoResumo, JogoRodada, JogoTipo, Mission, Mode, Nivel, Progress,
  RankingEntry, Session, SimuladoOpcoes, SimuladoResultado, SimuladoSessao, SubjectStats, TrailChapter,
} from '../../shared/game';
import type { DisciplinaId } from '../../content/types';
import type { DominioAssunto, PerfilEstudo, Plano, PlanoResposta } from '../../shared/estudo';
import type { Fonte } from '../../content/types';
import { api } from './api';

const get = <T,>(action: string, params: Record<string, string> = {}) =>
  api<T>(`/api/game?${new URLSearchParams({ action, ...params })}`);
// Cada envio leva uma chave própria (Idempotency-Key): se o mesmo envio
// chegar duas vezes, o servidor devolve a mesma resposta e não credita XP
// de novo.
export function novaChave(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const post = <T,>(action: string, body: unknown) =>
  api<T>(`/api/game?action=${action}`, { method: 'POST', body: JSON.stringify(body), headers: { 'Idempotency-Key': novaChave() } });

export const game = {
  progress: () => get<Progress>('progresso'),
  trail: () => get<{ capitulos: TrailChapter[]; progress: Progress }>('trilha'),
  phase: (id: string) => get<Session>('fase', { id }),
  review: () => get<Session>('revisar'),
  practice: (disciplina: string) => get<Session>('pratica', { disciplina }),
  challenge: () => get<Session>('desafio'),
  missions: () => get<{ missoes: Mission[] }>('missoes'),
  achievements: () => get<{ conquistas: Achievement[] }>('conquistas'),
  subjects: () => get<{ disciplinas: SubjectStats[]; assuntos: DominioAssunto[] }>('disciplinas'),
  plano: () => get<PlanoResposta>('plano'),
  salvarPlano: (perfil: PerfilEstudo) => post<Plano>('plano-salvar', perfil),
  ranking: () => get<{ top: RankingEntry[]; voce: RankingEntry }>('ranking'),
  answer: (questionId: string, choice: number, mode: Mode) => post<AnswerResult>('responder', { questionId, choice, mode }),
  claim: (missionId: string) => post<{ xpGanho: number; progress: Progress }>('resgatar', { missionId }),
  simulados: () => get<SimuladoOpcoes>('simulados'),
  simulado: (id: string) => get<{ estado: 'aberto'; sessao: SimuladoSessao } | { estado: 'entregue'; resultado: SimuladoResultado }>('simulado', { id }),
  startSimulado: (input: { nivel: Nivel; disciplinas: DisciplinaId[]; banca: string | null; quantidade: number; cronometro: boolean }) =>
    post<SimuladoSessao>('simulado-iniciar', input),
  deliverSimulado: (id: string, respostas: Record<string, number>) =>
    post<{ resultado: SimuladoResultado; progress: Progress }>('simulado-entregar', { id, respostas }),
  jogos: () => get<{ jogos: JogoResumo[] }>('jogos'),
  startJogo: (tipo: JogoTipo, disciplina: DisciplinaId | null) => post<JogoRodada>('jogo-iniciar', { tipo, disciplina }),
  jogada: (id: string, jogada: Record<string, unknown>) => post<JogadaResultado>('jogo-jogada', { ...jogada, id }),
  endJogo: (id: string) => post<JogoFim>('jogo-terminar', { id }),
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
