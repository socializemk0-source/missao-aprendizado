// @vitest-environment jsdom
// Cadastro pelo Google: a conta nasce na volta do Google, sem passar pelo
// formulário de /cadastro. O CompleteRegistration sai quando o app vê a conta
// nova pela primeira vez — uma vez só, e nunca num login comum.
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { registrarCadastroSocial } from '../../src/lib/cadastro-social';
import { track } from '../../src/lib/marketing';
import { fakeSupabase } from './render';

vi.mock('../../src/lib/marketing', () => ({ track: vi.fn(() => 'evt-1') }));
const rastreio = vi.mocked(track);
const cadastros = () => rastreio.mock.calls.filter((c) => c[0] === 'CompleteRegistration');

const AGORA = Date.parse('2026-10-20T12:00:00Z');
const usuario = (o: { id?: string; provider?: string; criado?: number } = {}) => ({
  id: o.id ?? 'u-google', created_at: new Date(o.criado ?? AGORA - 30_000).toISOString(), app_metadata: { provider: o.provider ?? 'google' },
});

beforeEach(() => {
  rastreio.mockClear();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('registrarCadastroSocial', () => {
  it('conta nova pelo Google: manda CompleteRegistration com status google', () => {
    registrarCadastroSocial(usuario(), AGORA);
    expect(rastreio).toHaveBeenCalledWith('CompleteRegistration', { status: 'google', content_name: 'cadastro' });
  });

  it('só uma vez por conta, mesmo voltando à página', () => {
    registrarCadastroSocial(usuario(), AGORA);
    registrarCadastroSocial(usuario(), AGORA + 60_000);
    expect(cadastros()).toHaveLength(1);
    registrarCadastroSocial(usuario({ id: 'outra' }), AGORA);
    expect(cadastros()).toHaveLength(2);
  });

  it('login de conta antiga pelo Google não conta como cadastro', () => {
    registrarCadastroSocial(usuario({ criado: AGORA - 2 * 3_600_000 }), AGORA);
    expect(cadastros()).toHaveLength(0);
  });

  it('conta de e-mail não conta aqui (o formulário de /cadastro já conta)', () => {
    registrarCadastroSocial(usuario({ provider: 'email' }), AGORA);
    expect(cadastros()).toHaveLength(0);
  });

  it('sem pixel (track devolve null): não marca, e conta quando o pixel estiver ligado', () => {
    rastreio.mockReturnValueOnce(null);
    registrarCadastroSocial(usuario(), AGORA);
    registrarCadastroSocial(usuario(), AGORA + 1000);
    expect(cadastros()).toHaveLength(2);
    registrarCadastroSocial(usuario(), AGORA + 2000);
    expect(cadastros()).toHaveLength(2);
  });
});

describe('AuthProvider', () => {
  it('voltou do Google com conta nova: o app manda o CompleteRegistration', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    const recem = { ...usuario(), created_at: new Date(Date.now() - 20_000).toISOString() };
    fakeSupabase({
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'tok', user: recem } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
    });
    render(<AuthProvider><p>app</p></AuthProvider>);
    await waitFor(() => expect(rastreio).toHaveBeenCalledWith('CompleteRegistration', { status: 'google', content_name: 'cadastro' }));
  });
});
