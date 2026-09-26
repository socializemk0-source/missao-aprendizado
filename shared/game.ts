// Tipos trocados entre o servidor (api/game.ts) e as telas. Só tipos e
// constantes — nada de conteúdo com gabarito vem para cá.

import type { Dificuldade, DisciplinaId, Fonte } from '../content/types.js';

export type Plan = 'free' | 'pro';
export type Mode = 'trilha' | 'revisar' | 'pratica' | 'desafio' | 'simulado';
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
  acerto: number | null; // % dos alunos que acertam de primeira (null: poucas respostas ainda)
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

export type GameErrorCode =
  | 'QUESTAO_INEXISTENTE' | 'FASE_BLOQUEADA' | 'PLANO_PRO' | 'SEM_VIDAS' | 'ALTERNATIVA_INVALIDA' | 'MISSAO_INCOMPLETA'
  | 'MISSAO_RESGATADA' | 'SEM_CONTEUDO' | 'ACAO_INVALIDA' | 'LIMITE_SIMULADO' | 'POUCAS_QUESTOES' | 'SIMULADO_ABERTO'
  | 'SIMULADO_INEXISTENTE';

// ---------------------------------------------------------------- Simulado
export type Nivel = 'facil' | 'medio' | 'dificil' | 'misto';
export const NIVEIS: Nivel[] = ['facil', 'medio', 'dificil', 'misto'];
export const NIVEL_NOME: Record<Nivel, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', misto: 'Misto' };
export const NIVEL_DE: Record<Exclude<Nivel, 'misto'>, Dificuldade> = { facil: 1, medio: 2, dificil: 3 };
// Misto segue a proporção de uma prova: 30% fáceis, 50% médias, 20% difíceis.
export const MISTO: Record<Dificuldade, number> = { 1: 0.3, 2: 0.5, 3: 0.2 };
export const SIMULADO_TAMANHOS = [5, 10, 20, 30, 60];
export const SIMULADO_SEG_POR_QUESTAO = 180; // cronômetro: 3 min por questão
export const SIMULADOS_GRATIS_POR_DIA = 1;
// A partir de quantas respostas o % de acerto real substitui a estimativa.
export const MIN_RESPOSTAS_CALIBRADA = 30;

export interface SimuladoResumo {
  id: string;
  nivel: Nivel;
  total: number;
  acertos: number | null; // null = ainda não entregue
  iniciadoEm: string;
}

export interface SimuladoOpcoes {
  disciplinas: { id: DisciplinaId; nome: string }[];
  bancas: string[];
  // Quantas questões existem por disciplina × banca (ou estilo) × dificuldade.
  contagem: { disciplina: DisciplinaId; banca: string | null; dificuldade: Dificuldade; n: number }[];
  limite: { plano: Plan; porDia: number | null; usadosHoje: number };
  aberto: string | null;
  historico: SimuladoResumo[];
}

export interface SimuladoSessao {
  id: string;
  nivel: Nivel;
  questoes: PublicQuestion[];
  iniciadoEm: string;
  prazo: string | null; // null = sem cronômetro
}

export interface SimuladoQuestaoResultado extends PublicQuestion {
  escolha: number | null;
  correta: number;
  explicacao: string;
  dificuldade: Dificuldade;
  acerto: number | null;
}

export interface SimuladoResultado {
  id: string;
  nivel: Nivel;
  total: number;
  respondidas: number;
  acertos: number;
  pct: number; // 0–100
  tempoSeg: number;
  xpGanho: number;
  percentil: number | null; // melhor que X% dos simulados deste nível
  porDisciplina: { disciplina: DisciplinaId; nome: string; acertos: number; total: number }[];
  questoes: SimuladoQuestaoResultado[];
}
