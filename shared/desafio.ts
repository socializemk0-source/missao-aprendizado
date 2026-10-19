// Desafio do Tico: o que /api/desafio manda para a tela (server/desafio.ts).

export interface QuestaoDoDesafio {
  id: string;
  disciplina: string;
  disciplinaNome: string;
  assunto: string;
  enunciado: string;
  alternativas: string[];
}

export interface Desafio {
  dia: string; // AAAA-MM-DD, em Brasília
  numero: number;
  questoes: QuestaoDoDesafio[];
}

export interface Correcao {
  acertou: boolean;
  correta: number;
  explicacao: string;
}

/** O dia anterior (AAAA-MM-DD). Usado na sequência de dias e na virada da meia-noite. */
export function diaAnterior(dia: string): string {
  return new Date(Date.parse(`${dia}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}
