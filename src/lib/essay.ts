import type { BancaRedacao, Criterio, GuiaBanca, Tema } from '../../content/redacao';
import type { Essay, EssayQuota, EssayReport, EssaySummary } from '../../shared/essay';
import { api } from './api';

export interface EssayConfig {
  enabled: boolean;
  minWords: number;
  maxChars: number;
  bancas: BancaRedacao[];
  guias: Record<BancaRedacao, GuiaBanca>;
  criterios: Criterio[];
  temas: Tema[];
  cota: EssayQuota;
  historico: EssaySummary[];
}

export const essayApi = {
  config: () => api<EssayConfig>('/api/redacao'),
  get: (id: string) => api<{ redacao: Essay }>(`/api/redacao?${new URLSearchParams({ id })}`),
  grade: (body: { topicId: string; bank: string; text: string }) =>
    api<{ id: string; score: number; report: EssayReport; cota: EssayQuota }>('/api/redacao', { method: 'POST', body: JSON.stringify(body) }),
};

export const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/u).length : 0);

export function formatDate(iso: string, withTime = false) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

// Rascunho no navegador (por aluno e tema). Pode falhar em janela anônima
// ou com armazenamento bloqueado — aí só não guarda.
const draftKey = (userId: string, topicId: string) => `aprovatico:redacao:${userId}:${topicId}`;
export const drafts = {
  read(userId: string, topicId: string): string {
    try { return localStorage.getItem(draftKey(userId, topicId)) ?? ''; } catch { return ''; }
  },
  write(userId: string, topicId: string, text: string) {
    try {
      if (text.trim()) localStorage.setItem(draftKey(userId, topicId), text);
      else localStorage.removeItem(draftKey(userId, topicId));
    } catch { /* sem armazenamento */ }
  },
};

// Divide o texto em pedaços, marcando os trechos citados na correção.
export function highlight(content: string, quotes: string[]): { text: string; mark: number | null }[] {
  const ranges: { start: number; end: number; n: number }[] = [];
  quotes.forEach((q, n) => {
    let from = 0;
    while (q) {
      const start = content.indexOf(q, from);
      if (start < 0) break;
      const end = start + q.length;
      if (!ranges.some((r) => start < r.end && end > r.start)) {
        ranges.push({ start, end, n });
        break;
      }
      from = start + 1;
    }
  });
  ranges.sort((a, b) => a.start - b.start);
  const parts: { text: string; mark: number | null }[] = [];
  let at = 0;
  for (const r of ranges) {
    if (r.start > at) parts.push({ text: content.slice(at, r.start), mark: null });
    parts.push({ text: content.slice(r.start, r.end), mark: r.n });
    at = r.end;
  }
  if (at < content.length) parts.push({ text: content.slice(at), mark: null });
  return parts;
}
