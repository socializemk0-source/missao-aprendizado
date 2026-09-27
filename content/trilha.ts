// A trilha: capítulos em ordem, alternando as disciplinas. Cada fase só
// abre depois da anterior. Os primeiros capítulos são do plano Grátis.

import { ADMINISTRATIVO } from './questoes/administrativo.js';
import { CONSTITUCIONAL } from './questoes/constitucional.js';
import { IMPROBIDADE } from './questoes/improbidade.js';
import { INFORMATICA } from './questoes/informatica.js';
import { PORTUGUES } from './questoes/portugues.js';
import { RLM } from './questoes/rlm.js';
import type { Capitulo, Disciplina, DisciplinaId, Fase, Questao } from './types.js';

export const DISCIPLINAS: Disciplina[] = [
  { id: 'portugues', nome: 'Português' },
  { id: 'rlm', nome: 'Raciocínio Lógico' },
  { id: 'informatica', nome: 'Informática' },
  { id: 'constitucional', nome: 'Direito Constitucional' },
  { id: 'administrativo', nome: 'Direito Administrativo' },
];

const ids = (prefix: string) => [1, 2, 3, 4].map((n) => `${prefix}-${n}`);
const range = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}-${from + i}`);

export const TRILHA: Capitulo[] = [
  {
    id: 'cap-01', titulo: 'Acentuação e crase', disciplina: 'portugues',
    descricao: 'As regras que mais derrubam candidatos na prova de Português.',
    fases: [
      { id: 'fase-01-1', titulo: 'Acentuação gráfica', questoes: ids('pt-acent') },
      { id: 'fase-01-2', titulo: 'Crase', questoes: ids('pt-crase') },
    ],
  },
  {
    id: 'cap-02', titulo: 'Porcentagem e proporção', disciplina: 'rlm',
    descricao: 'Contas do dia a dia que viram questão de prova.',
    fases: [
      { id: 'fase-02-1', titulo: 'Porcentagem', questoes: ids('rlm-porc') },
      { id: 'fase-02-2', titulo: 'Razão e regra de três', questoes: ids('rlm-prop') },
    ],
  },
  {
    id: 'cap-03', titulo: 'Computador e segurança', disciplina: 'informatica',
    descricao: 'Hardware, software, arquivos e como se proteger de golpes.',
    fases: [
      { id: 'fase-03-1', titulo: 'Conceitos básicos', questoes: ids('inf-base') },
      { id: 'fase-03-2', titulo: 'Segurança da informação', questoes: ids('inf-seg') },
    ],
  },
  {
    id: 'cap-04', titulo: 'Direitos e garantias', disciplina: 'constitucional',
    descricao: 'O art. 5º e os remédios constitucionais.',
    fases: [
      { id: 'fase-04-1', titulo: 'Direitos individuais', questoes: ids('const-dir') },
      { id: 'fase-04-2', titulo: 'Remédios constitucionais', questoes: ids('const-rem') },
    ],
  },
  {
    id: 'cap-05', titulo: 'Princípios e poderes', disciplina: 'administrativo',
    descricao: 'A base do Direito Administrativo: LIMPE e os poderes da Administração.',
    fases: [
      { id: 'fase-05-1', titulo: 'Princípios', questoes: ids('adm-princ') },
      { id: 'fase-05-2', titulo: 'Poderes administrativos', questoes: ids('adm-pod') },
    ],
  },
  {
    id: 'cap-06', titulo: 'Concordância e pontuação', disciplina: 'portugues',
    descricao: 'Verbo concordando com o sujeito e a vírgula no lugar certo.',
    fases: [
      { id: 'fase-06-1', titulo: 'Concordância verbal', questoes: ids('pt-conc') },
      { id: 'fase-06-2', titulo: 'Pontuação', questoes: ids('pt-pont') },
    ],
  },
  {
    id: 'cap-07', titulo: 'Lógica proposicional', disciplina: 'rlm',
    descricao: 'Conectivos, negações e equivalências.',
    fases: [
      { id: 'fase-07-1', titulo: 'Negação e conectivos', questoes: ids('rlm-log') },
      { id: 'fase-07-2', titulo: 'Equivalências', questoes: ids('rlm-eq') },
    ],
  },
  {
    id: 'cap-08', titulo: 'Internet e planilhas', disciplina: 'informatica',
    descricao: 'Navegação segura, e-mail e as fórmulas que mais caem.',
    fases: [
      { id: 'fase-08-1', titulo: 'Internet e e-mail', questoes: ids('inf-net') },
      { id: 'fase-08-2', titulo: 'Planilhas', questoes: ids('inf-plan') },
    ],
  },
  {
    id: 'cap-09', titulo: 'Estado e Administração Pública', disciplina: 'constitucional',
    descricao: 'Princípios fundamentais e o art. 37.',
    fases: [
      { id: 'fase-09-1', titulo: 'Princípios fundamentais', questoes: ids('const-est') },
      { id: 'fase-09-2', titulo: 'Administração Pública (art. 37)', questoes: ids('const-adm') },
    ],
  },
  {
    id: 'cap-10', titulo: 'Atos administrativos', disciplina: 'administrativo',
    descricao: 'Elementos, atributos, anulação e revogação.',
    fases: [
      { id: 'fase-10-1', titulo: 'Elementos e extinção', questoes: ids('adm-ato') },
      { id: 'fase-10-2', titulo: 'Atributos', questoes: ids('adm-atr') },
    ],
  },
  {
    id: 'cap-11', titulo: 'Improbidade administrativa', disciplina: 'administrativo',
    descricao: 'A Lei 8.429/1992 como ficou depois da Lei 14.230/2021: dolo, modalidades, sanções e prescrição.',
    fases: [
      { id: 'fase-11-1', titulo: 'Dolo e sujeitos', questoes: range('adm-imp', 1, 4) },
      { id: 'fase-11-2', titulo: 'Modalidades', questoes: range('adm-imp', 5, 8) },
      { id: 'fase-11-3', titulo: 'Sanções', questoes: range('adm-imp', 9, 12) },
      { id: 'fase-11-4', titulo: 'Processo e prescrição', questoes: range('adm-imp', 13, 16) },
    ],
  },
];

// Capítulos liberados no plano Grátis (os demais pedem PRO).
export const CAPITULOS_GRATIS = 5;

export const QUESTOES: Questao[] = [...PORTUGUES, ...RLM, ...INFORMATICA, ...CONSTITUCIONAL, ...ADMINISTRATIVO, ...IMPROBIDADE];

// ---------- Consultas ----------
const questaoPorId = new Map(QUESTOES.map((q) => [q.id, q]));

export interface FaseNaTrilha extends Fase {
  capitulo: Capitulo;
  capituloIndex: number; // 0-based
  ordem: number; // posição da fase na trilha inteira (0-based)
}

export const FASES: FaseNaTrilha[] = TRILHA.flatMap((capitulo, capituloIndex) =>
  capitulo.fases.map((fase) => ({ ...fase, capitulo, capituloIndex, ordem: 0 })),
).map((fase, ordem) => ({ ...fase, ordem }));

const fasePorId = new Map(FASES.map((f) => [f.id, f]));
const fasePorQuestao = new Map(FASES.flatMap((f) => f.questoes.map((q) => [q, f] as const)));

export function questao(id: string): Questao | undefined {
  return questaoPorId.get(id);
}

export function fase(id: string): FaseNaTrilha | undefined {
  return fasePorId.get(id);
}

export function faseDaQuestao(questaoId: string): FaseNaTrilha | undefined {
  return fasePorQuestao.get(questaoId);
}

export function nomeDisciplina(id: DisciplinaId): string {
  return DISCIPLINAS.find((d) => d.id === id)?.nome ?? id;
}
