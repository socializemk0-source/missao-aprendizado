// Desafio do Tico: 4 questões por dia, as mesmas para todo mundo, sem login.
// Uma de Português, uma de Raciocínio Lógico, uma de Informática e uma de
// Direito (Constitucional e Administrativo se revezam a cada dia).
//
// O dia é o de Brasília. Cada matéria tem uma ordem fixa (embaralhada pelo hash
// do id) e o desafio anda uma posição por dia: só repete questão depois de
// passar por todas as da matéria. O gabarito e a explicação nunca vão junto
// com a questão; só voltam na correção (api/desafio.ts).

import { createHash } from 'node:crypto';
import { QUESTOES, nomeDisciplina } from '../content/trilha.js';
import type { DisciplinaId, Questao } from '../content/types.js';
import type { Desafio } from '../shared/desafio.js';

export { diaAnterior } from '../shared/desafio.js';

export const DESAFIO_INICIO = '2026-10-19'; // desafio nº 1
const FUSO = 'America/Sao_Paulo';
const DIA_MS = 86_400_000;

export function diaDoDesafio(agora: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

const diasDesde = (dia: string) => Math.round((Date.parse(`${dia}T00:00:00Z`) - Date.parse(`${DESAFIO_INICIO}T00:00:00Z`)) / DIA_MS);

export function numeroDoDesafio(dia: string): number {
  return diasDesde(dia) + 1;
}

const hash = (id: string) => createHash('sha256').update(`desafio:${id}`).digest('hex');
const ORDEM = new Map<DisciplinaId, Questao[]>();
for (const q of QUESTOES) ORDEM.set(q.disciplina, [...(ORDEM.get(q.disciplina) ?? []), q]);
for (const lista of ORDEM.values()) lista.sort((a, b) => hash(a.id).localeCompare(hash(b.id)));

const posicao = (n: number, tamanho: number) => ((n % tamanho) + tamanho) % tamanho;

function escolher(disciplina: DisciplinaId, n: number): Questao {
  const lista = ORDEM.get(disciplina)!;
  return lista[posicao(n, lista.length)]!;
}

function questoesDoDia(dia: string): Questao[] {
  const d = diasDesde(dia);
  const direito: DisciplinaId = posicao(d, 2) === 0 ? 'constitucional' : 'administrativo';
  return [
    escolher('portugues', d),
    escolher('rlm', d),
    escolher('informatica', d),
    escolher(direito, Math.floor(d / 2)),
  ];
}

export function desafioDoDia(dia: string): Desafio {
  return {
    dia,
    numero: numeroDoDesafio(dia),
    questoes: questoesDoDia(dia).map((q) => ({
      id: q.id, disciplina: q.disciplina, disciplinaNome: nomeDisciplina(q.disciplina),
      assunto: q.assunto, enunciado: q.enunciado, alternativas: q.alternativas,
    })),
  };
}

/** A questão do desafio do dia informado, com o gabarito (só para corrigir). */
export function questaoDoDesafio(dia: string, id: string): Questao | undefined {
  return questoesDoDia(dia).find((q) => q.id === id);
}
