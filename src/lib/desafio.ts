// Desafio do Tico na tela: busca as questões do dia, manda cada resposta para o
// servidor conferir e guarda o andamento NO APARELHO (sem conta não há onde
// mais guardar). O que fica aqui é só conveniência: o gabarito vem sempre do
// servidor, e nada disso vale XP.

import { diaAnterior, type Correcao, type Desafio } from '../../shared/desafio';
import { ApiError } from './api';

export type { Correcao, Desafio } from '../../shared/desafio';

export const CHAVE_DESAFIO = 'aprova-tico:desafio';

export interface RespostaGuardada extends Correcao {
  escolha: number;
}

export interface ProgressoDesafio {
  dia: string;
  respostas: Record<string, RespostaGuardada>;
  ultimoDia: string | null; // último dia em que terminou as 4
  sequencia: number; // dias seguidos terminando o desafio
}

async function pedir<T>(init?: RequestInit): Promise<T> {
  const res = await fetch('/api/desafio', init);
  const payload = (await res.json().catch(() => ({}))) as { error?: string; code?: string } & Record<string, unknown>;
  if (!res.ok) throw new ApiError(payload.error ?? 'Não foi possível carregar o desafio agora.', res.status, payload.code, payload);
  return payload as T;
}

export async function buscarDesafio(): Promise<Desafio> {
  const d = await pedir<Desafio>();
  if (!d || typeof d.dia !== 'string' || !Array.isArray(d.questoes) || !d.questoes.length) {
    throw new ApiError('Não foi possível carregar o desafio agora.', 502);
  }
  return d;
}

export const conferirResposta = (id: string, resposta: number) =>
  pedir<Correcao>({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, resposta }) });

/** O andamento guardado, já ajustado para o dia do desafio (dia novo: respostas zeradas). */
export function lerProgresso(dia: string): ProgressoDesafio {
  let salvo: Partial<ProgressoDesafio> = {};
  try {
    salvo = JSON.parse(localStorage.getItem(CHAVE_DESAFIO) ?? '{}') as Partial<ProgressoDesafio>;
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): o desafio funciona, só não lembra.
  }
  const ultimoDia = typeof salvo.ultimoDia === 'string' ? salvo.ultimoDia : null;
  const sequencia = typeof salvo.sequencia === 'number' && salvo.sequencia > 0 ? Math.floor(salvo.sequencia) : 0;
  const respostas = salvo.dia === dia && salvo.respostas && typeof salvo.respostas === 'object' ? salvo.respostas : {};
  return { dia, respostas, ultimoDia, sequencia };
}

export function salvarProgresso(p: ProgressoDesafio): void {
  try {
    localStorage.setItem(CHAVE_DESAFIO, JSON.stringify(p));
  } catch {
    // idem
  }
}

/** Terminou as 4 de hoje: sobe a sequência se jogou ontem, recomeça se pulou um dia. */
export function concluirDia(p: ProgressoDesafio): ProgressoDesafio {
  if (p.ultimoDia === p.dia) return p;
  const sequencia = p.ultimoDia === diaAnterior(p.dia) ? p.sequencia + 1 : 1;
  return { ...p, ultimoDia: p.dia, sequencia };
}

/** O resultado para mandar aos amigos: placar em quadradinhos (sem revelar as questões) e o link do desafio. */
export function textoParaCompartilhar(d: Desafio, p: ProgressoDesafio, origem: string): string {
  const quadros = d.questoes.map((q) => (p.respostas[q.id]?.acertou ? '🟩' : '🟥')).join('');
  const acertos = d.questoes.filter((q) => p.respostas[q.id]?.acertou).length;
  const sequencia = p.sequencia === 1 ? '1 dia seguido' : `${p.sequencia} dias seguidos`;
  return [
    `Desafio do Tico nº ${d.numero}: ${acertos}/${d.questoes.length}`,
    quadros,
    `🔥 ${sequencia}`,
    `Jogue o de hoje: ${origem}/?utm_source=desafio&utm_medium=compartilhar#desafio`,
  ].join('\n');
}
