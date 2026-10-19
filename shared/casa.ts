// Casa do Tico: o cantinho de estudo que o aluno monta. Cada conquista
// (server/game.ts, getAchievements) libera um item; o aluno escolhe em que
// lugar do quarto ele fica. Quem decide o que está liberado é o servidor.
//
// A arte, por enquanto, é emoji. Quando houver ilustração, cada item ganha a
// sua imagem sem mudar as regras.

export type LugarTipo = 'parede' | 'chao';

export interface ItemCasa {
  id: string;
  nome: string;
  emoji: string;
  lugar: LugarTipo;
  conquista: string | null; // id da conquista que libera; null = já vem com a casa
}

export const ITENS_CASA: readonly ItemCasa[] = [
  { id: 'cama', nome: 'Cama', emoji: '🛏️', lugar: 'chao', conquista: null },
  { id: 'relogio', nome: 'Relógio', emoji: '🕰️', lugar: 'parede', conquista: null },
  { id: 'cadeira', nome: 'Cadeira de estudo', emoji: '🪑', lugar: 'chao', conquista: 'primeira-fase' },
  { id: 'livros', nome: 'Prateleira de livros', emoji: '📚', lugar: 'parede', conquista: 'capitulo' },
  { id: 'luminaria', nome: 'Luminária', emoji: '💡', lugar: 'parede', conquista: 'cinco-fases' },
  { id: 'planta', nome: 'Planta', emoji: '🪴', lugar: 'chao', conquista: 'sequencia-3' },
  { id: 'quadro', nome: 'Quadro', emoji: '🖼️', lugar: 'parede', conquista: 'sequencia-7' },
  { id: 'cafe', nome: 'Café', emoji: '☕', lugar: 'chao', conquista: 'xp-100' },
  { id: 'computador', nome: 'Notebook', emoji: '💻', lugar: 'chao', conquista: 'xp-500' },
  { id: 'poltrona', nome: 'Poltrona', emoji: '🛋️', lugar: 'chao', conquista: 'dominadas-25' },
  { id: 'mural', nome: 'Mural de recados', emoji: '📌', lugar: 'parede', conquista: 'revisor' },
  { id: 'trofeu', nome: 'Troféu', emoji: '🏆', lugar: 'parede', conquista: 'trilha-completa' },
];

export const ITEM_IDS = ITENS_CASA.map((i) => i.id);

// Lugares do quarto: 6 na parede e 6 no chão (dá para pôr todos os itens).
export const LUGARES: Record<LugarTipo, readonly string[]> = {
  parede: ['parede-1', 'parede-2', 'parede-3', 'parede-4', 'parede-5', 'parede-6'],
  chao: ['chao-1', 'chao-2', 'chao-3', 'chao-4', 'chao-5', 'chao-6'],
};
export const LUGAR_IDS = [...LUGARES.parede, ...LUGARES.chao];

export const tipoDoLugar = (lugar: string): LugarTipo | null =>
  LUGARES.parede.includes(lugar) ? 'parede' : LUGARES.chao.includes(lugar) ? 'chao' : null;

// Quarto de quem ainda não arrumou nada: os itens que já vêm com a casa.
export const ARRUMACAO_INICIAL: Readonly<Record<string, string>> = { cama: 'chao-1', relogio: 'parede-2' };

export interface ItemNaCasa extends ItemCasa {
  liberado: boolean;
  lugarAtual: string | null; // null = guardado na caixa
  comoLiberar: { titulo: string; descricao: string } | null; // a conquista que libera
}

export interface Casa {
  itens: ItemNaCasa[];
}
