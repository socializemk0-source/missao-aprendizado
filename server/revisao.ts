// Revisão espaçada. Questão errada entra na fila para hoje; cada acerto na
// revisão empurra a próxima para amanhã, depois 7 dias, depois 30 dias; o
// acerto da revisão de 30 dias tira a questão da fila. Errar em qualquer
// ponto volta para hoje. Acertar antes do dia marcado só conta o acerto.

import type { QuestionState } from './game.js';

// Dias até a próxima revisão em cada etapa (etapa 0 = hoje, logo após errar).
export const REVISAO_DIAS = [0, 1, 7, 30];

// Datas no formato AAAA-MM-DD (dia de estudo, fuso de Brasília).
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

export function aposResposta(prev: QuestionState | undefined, questionId: string, correct: boolean, today: string, now: Date): QuestionState {
  let reviewStage = prev?.reviewStage ?? 0;
  let reviewDue = prev?.reviewDue ?? null;
  if (!correct) {
    reviewStage = 0;
    reviewDue = today;
  } else if (reviewDue !== null && reviewDue <= today) {
    reviewStage += 1;
    const dias = REVISAO_DIAS[reviewStage];
    reviewDue = dias === undefined ? null : addDays(today, dias);
  }
  return {
    questionId,
    everCorrect: Boolean(prev?.everCorrect) || correct,
    lastCorrect: correct,
    timesWrong: (prev?.timesWrong ?? 0) + (correct ? 0 : 1),
    timesRight: (prev?.timesRight ?? 0) + (correct ? 1 : 0),
    reviewStage,
    reviewDue,
    lastAnsweredAt: now,
  };
}
