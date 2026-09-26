// Modelo do conteúdo da trilha. O conteúdo é código versionado: toda
// questão passa por revisão no PR e pelos testes de conteúdo.
//
// Origem (CLAUDE.md, regra 6): questão de prova oficial guarda banca, órgão,
// cargo e ano — e só entra com o PDF da prova e o gabarito oficial em mãos.
// Questão escrita por nós é marcada como "autoral" (opcionalmente "no
// estilo" de uma banca). Nunca atribuir a uma banca uma questão que não é dela.

export type Banca = 'Cebraspe' | 'FGV' | 'FCC' | 'Vunesp' | 'Cesgranrio';

export type DisciplinaId = 'portugues' | 'rlm' | 'informatica' | 'constitucional' | 'administrativo';

export type Fonte =
  | { tipo: 'oficial'; banca: Banca; orgao: string; cargo: string; ano: number }
  | { tipo: 'autoral'; estilo?: Banca };

export interface Questao {
  id: string;
  disciplina: DisciplinaId;
  assunto: string;
  enunciado: string;
  // "Certo/Errado" (estilo Cebraspe) é só uma questão com essas 2 alternativas.
  alternativas: string[];
  correta: number; // índice em alternativas
  explicacao: string;
  fonte: Fonte;
}

export interface Fase {
  id: string;
  titulo: string;
  questoes: string[]; // ids de Questao, na ordem
}

export interface Capitulo {
  id: string;
  titulo: string;
  disciplina: DisciplinaId;
  descricao: string;
  fases: Fase[];
}

export interface Disciplina {
  id: DisciplinaId;
  nome: string;
}
