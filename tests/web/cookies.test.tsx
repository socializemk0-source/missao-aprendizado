// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthTestProvider } from '../../src/auth/AuthProvider';
import { AvisoCookies } from '../../src/components/AvisoCookies';
import { aceitouCookies, escolhaCookies, limparCookiesParaTestes, reabrirAvisoCookies } from '../../src/lib/consentimento';
import { createEventosHandler } from '../../api/eventos.js';
import { memoryMarketing } from '../../server/marketing.js';
import { fakeVerify } from '../server/helpers.js';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

beforeEach(() => limparCookiesParaTestes());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('aviso de cookies', () => {
  it('aparece para quem ainda não escolheu; sem escolha, nada está liberado', () => {
    render(<AuthTestProvider value={{ status: 'signedOut' }}><AvisoCookies /></AuthTestProvider>);
    expect(screen.getByRole('region', { name: 'Aviso de cookies' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saiba mais' })).toHaveAttribute('href', '/privacidade');
    expect(aceitouCookies()).toBe(false);
  });

  it('Recusar: some, guarda a escolha e não libera', async () => {
    render(<AuthTestProvider value={{ status: 'signedOut' }}><AvisoCookies /></AuthTestProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(screen.queryByRole('region', { name: 'Aviso de cookies' })).toBeNull();
    expect(escolhaCookies()?.escolha).toBe('recusado');
    expect(aceitouCookies()).toBe(false);
  });

  it('Aceitar: some e libera; "mudar minha escolha" mostra o aviso de novo', async () => {
    render(<AuthTestProvider value={{ status: 'signedOut' }}><AvisoCookies /></AuthTestProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(aceitouCookies()).toBe(true);
    expect(screen.queryByRole('region', { name: 'Aviso de cookies' })).toBeNull();
    act(() => reabrirAvisoCookies());
    expect(screen.getByRole('region', { name: 'Aviso de cookies' })).toBeInTheDocument();
  });

  it('visitante sem login: a escolha não vai para o servidor', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthTestProvider value={{ status: 'signedOut' }}><AvisoCookies /></AuthTestProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Perfil → Cookies de anúncio', () => {
  it('mostra a escolha e deixa revogar; com login, a escolha vai para o servidor', async () => {
    const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;
    fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
    const store = memoryMarketing();
    bridgeApi({ '/api/eventos': createEventosHandler({ verifyToken: fakeVerify, store }) });
    renderAt('/perfil', { status: 'signedIn', session: tokenSession, me });
    expect(await screen.findByRole('heading', { name: 'Cookies de anúncio' })).toBeInTheDocument();
    expect(screen.getByText(/Você ainda não escolheu/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar cookies de anúncio' }));
    expect(aceitouCookies()).toBe(true);
    expect(screen.getByText(/Você aceitou em/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Recusar cookies de anúncio' }));
    expect(aceitouCookies()).toBe(false);
    expect(screen.getByText(/Você recusou em/)).toBeInTheDocument();
    await vi.waitFor(() => expect(store.usuarios.get('u1')?.consentimento).toBe(false));
  });
});
