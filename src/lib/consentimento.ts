// Consentimento dos cookies de anúncio (LGPD). Sem "Aceitar", nada de pixel
// e nada é enviado a plataformas de anúncio. A escolha fica no aparelho
// (vale para o visitante sem conta) e, com login, também no servidor
// (POST /api/eventos), para o servidor respeitar a mesma escolha.

import { useSyncExternalStore } from 'react';
import { api } from './api';

export type Escolha = 'aceito' | 'recusado';

const KEY = 'aprovatico.cookies';
const listeners = new Set<() => void>();
let version = 0;
let reaberto = false; // "Mudar minha escolha": mostra o aviso de novo

function changed() {
  version++;
  for (const l of listeners) l();
}

export function escolhaCookies(): { escolha: Escolha; em: string } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { escolha?: unknown; em?: unknown } | null;
    if (raw && (raw.escolha === 'aceito' || raw.escolha === 'recusado') && typeof raw.em === 'string') return { escolha: raw.escolha, em: raw.em };
  } catch {
    // sem armazenamento ou valor estragado: conta como "não escolheu"
  }
  return null;
}

// Só "Aceitar" libera. Recusou ou não respondeu = false.
export const aceitouCookies = () => escolhaCookies()?.escolha === 'aceito';

export function escolherCookies(escolha: Escolha, now = new Date()): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ escolha, em: now.toISOString() }));
  } catch {
    // sem armazenamento: o aviso volta na próxima visita
  }
  reaberto = false;
  changed();
}

export function reabrirAvisoCookies(): void {
  reaberto = true;
  changed();
}

export const avisoCookiesAberto = () => reaberto || escolhaCookies() === null;

export function onCookies(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Nas telas: re-renderiza quando a escolha muda.
export function useCookies(): { escolha: Escolha | null; em: string | null; aviso: boolean } {
  useSyncExternalStore(onCookies, () => version, () => version);
  const atual = escolhaCookies();
  return { escolha: atual?.escolha ?? null, em: atual?.em ?? null, aviso: avisoCookiesAberto() };
}

// Leva a escolha para o servidor (só com login). Erro aqui não atrapalha nada.
export async function sincronizarConsentimento(): Promise<void> {
  const atual = escolhaCookies();
  if (!atual) return;
  try {
    await api('/api/eventos', { method: 'POST', body: JSON.stringify({ consentimento: atual.escolha === 'aceito' }) });
  } catch {
    // tenta de novo no próximo login ou na próxima mudança
  }
}

// Só para os testes.
export function limparCookiesParaTestes(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada
  }
  reaberto = false;
  changed();
}
