// Casa do Tico (shared/casa.ts). O que está liberado sai das conquistas,
// calculadas aqui no servidor; a tela só escolhe o lugar de um item liberado.

import { ARRUMACAO_INICIAL, ITENS_CASA, tipoDoLugar, type Casa } from '../shared/casa.js';
import { GameError, getAchievements, type GameStore } from './game.js';

async function montar(store: GameStore, userId: string, now: Date): Promise<{ casa: Casa; arrumacao: Record<string, string> }> {
  const conquistas = await getAchievements(store, userId, now);
  const salva = await store.withUser(userId, (tx) => tx.casa());
  const liberado = (conquista: string | null) => conquista === null || conquistas.some((c) => c.id === conquista && c.conquistada);
  // Item que deixou de estar liberado (não deveria acontecer) não aparece no quarto.
  const existeLiberado = (id: string) => {
    const item = ITENS_CASA.find((i) => i.id === id);
    return !!item && liberado(item.conquista);
  };
  const arrumacao = Object.fromEntries(Object.entries(salva ?? ARRUMACAO_INICIAL).filter(([id]) => existeLiberado(id)));
  const itens = ITENS_CASA.map((i) => {
    const c = i.conquista ? conquistas.find((x) => x.id === i.conquista) : null;
    return {
      ...i,
      liberado: liberado(i.conquista),
      lugarAtual: arrumacao[i.id] ?? null,
      comoLiberar: c ? { titulo: c.titulo, descricao: c.descricao } : null,
    };
  });
  return { casa: { itens }, arrumacao };
}

export async function getCasa(store: GameStore, userId: string, now = new Date()): Promise<Casa> {
  return (await montar(store, userId, now)).casa;
}

/** Põe um item liberado num lugar do tipo certo (null = guarda na caixa). Quem estava no lugar volta para a caixa. */
export async function colocarNaCasa(store: GameStore, userId: string, itemId: string, lugar: string | null, now = new Date()): Promise<Casa> {
  const { casa, arrumacao } = await montar(store, userId, now);
  const item = casa.itens.find((i) => i.id === itemId);
  if (!item) throw new GameError('ACAO_INVALIDA', 400, 'Item inválido.');
  if (!item.liberado) {
    throw new GameError('ITEM_BLOQUEADO', 409, `Este item ainda está bloqueado. Para liberar: ${item.comoLiberar?.descricao ?? 'continue estudando.'}`);
  }
  if (lugar !== null && tipoDoLugar(lugar) !== item.lugar) {
    throw new GameError('LUGAR_INVALIDO', 400, item.lugar === 'parede' ? 'Este item vai na parede.' : 'Este item vai no chão.');
  }
  const nova = Object.fromEntries(Object.entries(arrumacao).filter(([id, l]) => id !== itemId && l !== lugar));
  if (lugar !== null) nova[itemId] = lugar;
  await store.withUser(userId, (tx) => tx.saveCasa(nova));
  return getCasa(store, userId, now);
}
