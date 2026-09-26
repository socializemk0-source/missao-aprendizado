// Tipos trocados entre o servidor (api/game.ts) e as telas. Só tipos e
// constantes — nada de conteúdo com gabarito vem para cá.

import type { DisciplinaId, Fonte } from '../content/types.js';

export type Plan = 'free' | 'pro';
export type Mode = 'trilha' | 'revisar' | 'pratica' | 'desafio';
export type PhaseStatus = 'done' | 'available' | 'locked' | 'pro';

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;
export const XP_FIRST_CORRECT = 10;
export const XP_PHASE_BONUS = 20;

export interface Progress {
  plan: Plan;
  xp: number;
  hearts: number | null; // null = ilimitadas (PRO)
  maxHearts: number;
  nextHeartAt: string | null;
  streak: number; // dias seguidos até hoje (0 se quebrou)
  studiedToday: boolean;
}

export interface TrailPhase {
  id: string;
  titulo: string;
  status: PhaseStatus;
  total: number;
  dominadas: number;
}

export interface TrailChapter {
  id: string;
  titulo: string;
  descricao: string;
  disciplina: DisciplinaId;
  disciplinaNome: string;
  gratis: boolean;
  fases: TrailPhase[];
}

export interface PublicQuestion {
  id: string;
  disciplina: DisciplinaId;
  assunto: string;
  enunciado: string;
  alternativas: string[];
  fonte: Fonte;
}

export interface Session {
  mode: Mode;
  titulo: string;
  subtitulo: string;
  faseId: string | null;
  questoes: PublicQuestion[];
}

export interface AnswerResult {
  correct: boolean;
  correta: number;
  explicacao: string;
  xpGanho: number;
  faseConcluida: { id: string; titulo: string; bonus: number } | null;
  progress: Progress;
}

export interface Mission {
  id: string;
  titulo: string;
  meta: number;
  atual: number;
  xp: number;
  resgatada: boolean;
}

export interface Achievement {
  id: string;
  titulo: string;
  descricao: string;
  conquistada: boolean;
}

export interface SubjectStats {
  disciplina: DisciplinaId;
  nome: string;
  total: number;
  liberadas: number;
  dominadas: number;
  pendentes: number; // errou por último e ainda não corrigiu
}

export interface RankingEntry {
  posicao: number;
  nome: string;
  xp: number;
  voce: boolean;
}

export type GameErrorCode = 'QUESTAO_INEXISTENTE' | 'FASE_BLOQUEADA' | 'PLANO_PRO' | 'SEM_VIDAS' | 'ALTERNATIVA_INVALIDA' | 'MISSAO_INCOMPLETA' | 'MISSAO_RESGATADA' | 'SEM_CONTEUDO' | 'ACAO_INVALIDA';
