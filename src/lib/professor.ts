import type { DisciplinaId, Questao } from '../../content/types';
import { api } from './api';

export type AcaoRevisao = 'aprovar' | 'corrigir' | 'descartar';

export interface ItemFila extends Questao {
  origem: 'trilha' | 'banco';
  versao: string;
  situacao: 'pendente' | 'correcao';
  pedido: { nota: string; em: string } | null;
}

export interface FilaRevisao {
  revisor: { nome: string | null; disciplinas: DisciplinaId[] | null };
  fila: ItemFila[];
}

export const professorApi = {
  fila: () => api<FilaRevisao>('/api/professor'),
  decidir: (item: ItemFila, acao: AcaoRevisao, nota?: string) =>
    api<{ ok: true }>('/api/professor', { method: 'POST', body: JSON.stringify({ questionId: item.id, versao: item.versao, acao, nota }) }),
};
