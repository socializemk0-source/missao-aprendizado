// @vitest-environment jsdom
// Tela de planos contra a rota de verdade (api/pagamentos.ts), com o
// Mercado Pago simulado.
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPagamentosHandler } from '../../api/pagamentos';
import { createGameHandler } from '../../api/game';
import { memoryGameStore } from '../../server/game-memory';
import { makeReference, memoryPayments, type MpClient, type MpPayment } from '../../server/payments';
import { leave } from '../../src/lib/payments';
import { fakeVerify } from '../server/helpers';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;
const signedIn = { status: 'signedIn' as const, session: tokenSession, me };

function setup(payments: Record<string, MpPayment> = {}) {
  const store = memoryPayments();
  const client: MpClient = {
    createPreference: vi.fn(async () => ({ id: 'pref', url: 'https://mp.test/checkout' })),
    getPayment: async (id) => payments[id]!,
  };
  const game = memoryGameStore({ plan: (u) => ((store.pro.get(u)?.getTime() ?? 0) > Date.now() ? 'pro' : 'free') });
  fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
  bridgeApi({
    '/api/pagamentos': createPagamentosHandler({ verifyToken: fakeVerify, store, client, baseUrl: () => 'https://app.dev' }),
    '/api/game': createGameHandler({ verifyToken: fakeVerify, store: game }),
  });
  return { store, client };
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('planos', () => {
  it('grátis: mostra os 3 planos e leva ao checkout do Mercado Pago', async () => {
    const { client } = setup();
    const go = vi.spyOn(leave, 'to').mockImplementation(() => {});
    const user = userEvent.setup();
    renderAt('/planos', signedIn);
    expect(await screen.findByText('Seu plano atual')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Comprar 1 ano — R\$\s239,90/ }));
    await waitFor(() => expect(go).toHaveBeenCalledWith('https://mp.test/checkout'));
    expect(client.createPreference).toHaveBeenCalledWith(expect.objectContaining({ cycle: 'annual', userId: 'u1' }));
  });

  it('volta do checkout aprovada: confere no servidor, libera o PRO e o cabeçalho vira ∞', async () => {
    setup({ '555': { id: 555, status: 'approved', transaction_amount: 29.9, currency_id: 'BRL', external_reference: makeReference('monthly', 'u1') } });
    const { router } = renderAt('/planos?payment_id=555&status=approved', signedIn, { progress: true });
    expect(await screen.findByText(/PRO liberado até/)).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(await screen.findByRole('heading', { name: /Você é PRO até/ })).toBeInTheDocument();
    expect(screen.getByText(/PRO 30 dias · R\$\s29,90/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTitle('Vidas ilimitadas (PRO)')).toHaveTextContent('∞'));
  });

  it('PIX pendente avisa que libera sozinho; volta sem pagamento avisa que nada foi cobrado', async () => {
    setup({ '777': { id: 777, status: 'pending', transaction_amount: 29.9, currency_id: 'BRL', external_reference: makeReference('monthly', 'u1') } });
    renderAt('/planos?payment_id=777&status=pending', signedIn);
    expect(await screen.findByText(/PRO é liberado sozinho/)).toBeInTheDocument();
    cleanup();
    renderAt('/planos?collection_id=null&collection_status=null', signedIn);
    expect(await screen.findByText(/Nada foi cobrado/)).toBeInTheDocument();
  });

  it('pagamento de outra pessoa não libera nada', async () => {
    setup({ '888': { id: 888, status: 'approved', transaction_amount: 29.9, currency_id: 'BRL', external_reference: makeReference('monthly', 'u2') } });
    renderAt('/planos?payment_id=888&status=approved', signedIn);
    expect(await screen.findByText('Pagamento não encontrado.')).toBeInTheDocument();
    expect(await screen.findByText('Seu plano atual')).toBeInTheDocument();
  });
});
