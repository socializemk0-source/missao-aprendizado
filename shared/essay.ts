// Tipos da redação compartilhados entre servidor e telas.

export interface EssayReport {
  summary: string;
  criteria: { id: 'tema' | 'argumentos' | 'organizacao' | 'linguagem'; score: number; reason: string }[];
  annotations: { quote: string; issue: string; suggestion: string }[];
  strengths: string[];
  nextSteps: string[];
}

export interface EssaySummary {
  id: string;
  topicId: string;
  topicTitle: string;
  banca: string;
  score: number;
  createdAt: string;
}

export interface Essay extends EssaySummary {
  content: string;
  report: EssayReport;
}

export interface EssayQuota {
  plano: 'free' | 'pro';
  limite: number | null; // null = ilimitado (PRO)
  usadas: number;
  proximaEm: string | null; // quando abre a próxima correção grátis
}
