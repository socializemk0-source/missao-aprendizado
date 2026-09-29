import { api } from './api';

export interface PaymentStatus {
  enabled: boolean;
  plano: 'free' | 'pro';
  proAte: string | null;
  opcoes: { id: 'monthly' | 'annual'; dias: number; valor: number }[];
  pagamentos: { paymentId: string; cycle: 'monthly' | 'annual'; amount: number; status: 'approved' | 'refunded'; createdAt: string }[];
}

export const payApi = {
  status: () => api<PaymentStatus>('/api/pagamentos'),
  checkout: (cycle: 'monthly' | 'annual') => api<{ url: string }>('/api/pagamentos?action=checkout', { method: 'POST', body: JSON.stringify({ cycle }) }),
  confirm: (paymentId: string) =>
    api<{ resultado: string; plano: 'free' | 'pro'; proAte: string | null }>('/api/pagamentos?action=confirmar', { method: 'POST', body: JSON.stringify({ paymentId }) }),
};

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Ir para o checkout (fora do app). Separado para os testes trocarem.
export const leave = { to: (url: string) => window.location.assign(url) };
