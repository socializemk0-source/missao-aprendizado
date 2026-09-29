// De onde vêm as questões: as da trilha (content/, versionadas no código)
// e as do banco de questões (v2.questions, importadas das provas). E qual
// a dificuldade de cada uma: a estimada, até ter respostas suficientes;
// depois, a real, pelo % de alunos que acertam de primeira.

import { CAPITULOS_GRATIS, QUESTOES, faseDaQuestao } from '../content/trilha.js';
import type { Dificuldade, DisciplinaId, Questao } from '../content/types.js';
import { MIN_RESPOSTAS_CALIBRADA } from '../shared/game.js';

export interface CatalogItem {
  id: string;
  disciplina: DisciplinaId;
  dificuldade: Dificuldade; // estimada
  banca: string | null; // banca da prova oficial, ou o estilo da autoral
  pro: boolean; // da parte PRO da trilha
}

export interface QuestionSource {
  get(ids: string[]): Promise<Map<string, Questao>>;
  catalog(): Promise<CatalogItem[]>;
}

export interface QuestionStats { respostas: number; acertos: number }

export const bancaDe = (q: Pick<Questao, 'fonte'>) => (q.fonte.tipo === 'oficial' ? q.fonte.banca : q.fonte.estilo ?? null);

export function catalogItem(q: Questao): CatalogItem {
  const f = faseDaQuestao(q.id);
  return { id: q.id, disciplina: q.disciplina, dificuldade: q.dificuldade, banca: bancaDe(q), pro: Boolean(f && f.capituloIndex >= CAPITULOS_GRATIS) };
}

const CONTENT = new Map(QUESTOES.map((q) => [q.id, q]));
const CONTENT_CATALOG = QUESTOES.map(catalogItem);

// Só as questões da trilha (testes, demonstração). O Postgres soma as do banco.
export function contentSource(extra: Questao[] = []): QuestionSource {
  const all = new Map([...CONTENT, ...extra.map((q) => [q.id, q] as const)]);
  const catalog = [...CONTENT_CATALOG, ...extra.map(catalogItem)];
  return {
    get: async (ids) => new Map(ids.flatMap((id) => (all.has(id) ? [[id, all.get(id)!] as const] : []))),
    catalog: async () => catalog,
  };
}

// % de quem acerta de primeira, se já há respostas suficientes.
export function acertoPct(s: QuestionStats | undefined): number | null {
  return s && s.respostas >= MIN_RESPOSTAS_CALIBRADA ? Math.round((s.acertos / s.respostas) * 100) : null;
}

// Dificuldade que vale agora: real (≥ 30 respostas) ou a estimada.
export function nivelAtual(estimada: Dificuldade, s: QuestionStats | undefined): Dificuldade {
  const pct = acertoPct(s);
  if (pct === null) return estimada;
  return pct >= 70 ? 1 : pct >= 40 ? 2 : 3;
}
