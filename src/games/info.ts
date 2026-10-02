// Nomes, textos e endereços dos jogos. Nada de conteúdo com gabarito aqui:
// o que o aluno joga vem do servidor, rodada a rodada.

import type { DisciplinaId } from '../../content/types';
import type { JogoTipo } from '../../shared/game';

export const JOGO_INFO: Record<JogoTipo, { nome: string; slug: string; descricao: string; recorde: (n: number) => string }> = {
  radar: {
    nome: 'Radar do Tico', slug: 'radar',
    descricao: 'Certo ou errado? 10 afirmações no estilo Cebraspe, com a explicação na hora.',
    recorde: (n) => `${n} de 10 acertos`,
  },
  memoria: {
    nome: 'Memória do Tico', slug: 'memoria',
    descricao: 'Vire as cartas e junte cada termo com a sua dica.',
    recorde: (n) => `${n} jogadas`,
  },
  caca: {
    nome: 'Caça-palavras', slug: 'caca-palavras',
    descricao: 'Ache os termos na grade: toque na primeira e na última letra.',
    recorde: (n) => tempo(n),
  },
  cruzadinha: {
    nome: 'Cruzadinha', slug: 'cruzadinha',
    descricao: 'Preencha os termos pelas dicas e confira.',
    recorde: (n) => tempo(n),
  },
};

export const TIPO_DO_SLUG: Record<string, JogoTipo> = Object.fromEntries(
  (Object.keys(JOGO_INFO) as JogoTipo[]).map((t) => [JOGO_INFO[t].slug, t]),
);

export const MATERIAS: { id: DisciplinaId; nome: string }[] = [
  { id: 'portugues', nome: 'Português' },
  { id: 'rlm', nome: 'Raciocínio Lógico' },
  { id: 'informatica', nome: 'Informática' },
  { id: 'constitucional', nome: 'Direito Constitucional' },
  { id: 'administrativo', nome: 'Direito Administrativo' },
];

export function tempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Letra digitada → A–Z (tira acento e cedilha), ou '' se não for letra.
export function soLetra(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}
