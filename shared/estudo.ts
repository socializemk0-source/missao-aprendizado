// Plano de estudos (Marco 1): o que o aluno conta no começo (onboarding) e
// o que o servidor devolve para a tela "Hoje". Só tipos e constantes.

import type { DisciplinaId } from '../content/types.js';

export const BANCAS_ALVO = ['FGV', 'FCC', 'Cebraspe', 'Vunesp', 'Cesgranrio'] as const;
export type BancaAlvo = (typeof BANCAS_ALVO)[number];

export type NivelAluno = 'iniciante' | 'intermediario' | 'avancado';
export const NIVEIS_ALUNO: { id: NivelAluno; nome: string; descricao: string }[] = [
  { id: 'iniciante', nome: 'Começando agora', descricao: 'Vi pouco ou nada destas matérias.' },
  { id: 'intermediario', nome: 'Já estudei um pouco', descricao: 'Conheço a base, mas ainda erro bastante.' },
  { id: 'avancado', nome: 'Estou afiado', descricao: 'Já fiz provas e quero treinar e revisar.' },
];

// Tempo de estudo por dia, em minutos.
export const MINUTOS_DIA = [30, 60, 120, 180] as const;
export const MINUTOS_NOME: Record<number, string> = { 30: '30 minutos', 60: '1 hora', 120: '2 horas', 180: '3 horas ou mais' };

export interface PerfilEstudo {
  prova: string; // concurso ou cargo que o aluno vai prestar
  banca: BancaAlvo | null; // null = ainda não sabe
  dataProva: string | null; // AAAA-MM-DD; null = sem data marcada
  minutosDia: number; // um de MINUTOS_DIA
  nivel: NivelAluno;
  disciplinas: DisciplinaId[]; // matérias da prova (pelo menos uma)
}

export interface AgendaRevisao {
  hoje: number; // vencem hoje ou estão atrasadas
  amanha: number;
  semana: number; // do 2º ao 7º dia
  depois: number;
}

export type Situacao = 'nao-visto' | 'fraco' | 'progresso' | 'dominado';

export interface DominioAssunto {
  disciplina: DisciplinaId;
  disciplinaNome: string;
  assunto: string;
  score: number | null; // 0 a 100; null = nenhuma questão respondida
  situacao: Situacao;
  respondidas: number;
  total: number;
}

export type TarefaTipo = 'revisar' | 'trilha' | 'praticar' | 'simulado';

export interface Tarefa {
  id: string;
  tipo: TarefaTipo;
  titulo: string;
  detalhe: string;
  link: string;
  meta: number;
  atual: number;
  concluida: boolean;
}

export interface DiaPlano {
  dia: string; // AAAA-MM-DD
  rotulo: string; // "Hoje", "qui", "sex"...
  disciplinas: { id: DisciplinaId; nome: string }[];
}

export interface Plano {
  configurado: true;
  perfil: PerfilEstudo;
  hoje: string;
  diasParaProva: number | null;
  metaQuestoes: number; // questões por dia, pelo tempo e pelo nível
  feitasHoje: number;
  tarefas: Tarefa[];
  semana: DiaPlano[];
  revisao: AgendaRevisao;
  comoEstou: { sequencia: number; xp: number; acerto7d: number | null; respondidas7d: number; dominioMedio: number | null };
  ondeErro: DominioAssunto[];
  quantoFalta: {
    fasesFeitas: number;
    fasesTotal: number; // fases da trilha nas matérias do aluno
    questoesFaltam: number;
    ritmo: number; // questões por dia na última semana
    previsao: string | null; // no ritmo da última semana
    previsaoPlano: string | null; // cumprindo a meta do plano todo dia
  };
}

export type PlanoResposta = Plano | { configurado: false };
