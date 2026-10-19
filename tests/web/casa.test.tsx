// @vitest-environment jsdom
// Casa do Tico pela tela, contra o /api/game de verdade (store em memória):
// itens liberados por conquista, escolher o lugar, mover e guardar na caixa.
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game';
import { memoryGameStore } from '../../server/game-memory';
import { ARRUMACAO_INICIAL } from '../../shared/casa';
import { fakeVerify } from '../server/helpers';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;
const signedIn = { status: 'signedIn' as const, session: tokenSession, me };

function setup() {
  const store = memoryGameStore();
  fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
  bridgeApi({ '/api/game': createGameHandler({ verifyToken: fakeVerify, store }) });
  return store;
}

afterEach(cleanup);

describe('Casa do Tico', () => {
  it('mostra o quarto com o que já vem na casa e o que falta liberar', async () => {
    setup();
    renderAt('/casa', signedIn, { progress: true });
    const quarto = await screen.findByRole('group', { name: 'Quarto do Tico' });
    expect(within(quarto).getByRole('button', { name: 'Cama, no chão' })).toBeInTheDocument();
    expect(within(quarto).getByRole('button', { name: 'Relógio, na parede' })).toBeInTheDocument();
    const bloqueados = screen.getByRole('list', { name: 'Itens para liberar' });
    expect(within(bloqueados).getByText('Cadeira de estudo')).toBeInTheDocument();
    expect(within(bloqueados).getByText('Para liberar: Conclua sua primeira fase.')).toBeInTheDocument();
  });

  it('item liberado: escolhe o item, depois o lugar; a escolha fica salva no servidor', async () => {
    const store = setup();
    await store.withUser('u1', (tx) => tx.completePhase('fase-01-1', '2026-10-19'));
    const user = userEvent.setup();
    renderAt('/casa', signedIn, { progress: true });
    const meus = await screen.findByRole('list', { name: 'Seus itens' });
    await user.click(within(meus).getByRole('button', { name: /Cadeira de estudo/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Escolha um lugar no chão para: Cadeira de estudo');
    await user.click(screen.getByRole('button', { name: 'Lugar vazio no chão 4' }));
    expect(await screen.findByRole('button', { name: 'Cadeira de estudo, no chão' })).toBeInTheDocument();
    expect(await store.withUser('u1', (tx) => tx.casa())).toMatchObject({ cadeira: 'chao-4' });
  });

  it('tocar num item do quarto deixa mover ou guardar na caixa', async () => {
    const store = setup();
    const user = userEvent.setup();
    renderAt('/casa', signedIn, { progress: true });
    await user.click(await screen.findByRole('button', { name: 'Cama, no chão' }));
    await user.click(screen.getByRole('button', { name: 'Guardar na caixa' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cama, no chão' })).toBeNull());
    expect(within(screen.getByRole('list', { name: 'Seus itens' })).getByRole('button', { name: /Cama.*Na caixa/ })).toBeInTheDocument();
    expect(await store.withUser('u1', (tx) => tx.casa())).toEqual({ relogio: ARRUMACAO_INICIAL.relogio });
  });

  it('a casa aparece no menu e na tela de conquistas', async () => {
    setup();
    renderAt('/conquistas', signedIn, { progress: true });
    expect(screen.getAllByRole('link', { name: /Casa do Tico/ })[0]).toHaveAttribute('href', '/casa');
  });
});
