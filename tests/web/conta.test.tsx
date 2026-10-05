// @vitest-environment jsdom
// LGPD pela tela: excluir a conta no Perfil (com confirmação escrita) e os
// Termos de uso ligados no cadastro, na página inicial e na privacidade.
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMeHandler } from '../../api/me';
import { COMPANY } from '../../src/app/nav';
import { fakeVerify, memoryProfiles } from '../server/helpers';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;

afterEach(cleanup);

describe('excluir a conta', () => {
  it('só libera o botão com EXCLUIR digitado; exclui, sai da conta e volta à página inicial avisando', async () => {
    fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
    const apagados: string[] = [];
    bridgeApi({
      '/api/me': createMeHandler({
        verifyToken: fakeVerify, profiles: memoryProfiles(),
        conta: { excluir: async (id) => { apagados.push(id); } }, removerLogin: async () => {},
      }),
    });
    const signOut = vi.fn(async () => {});
    const user = userEvent.setup();
    const { router } = renderAt('/perfil', { status: 'signedIn', session: tokenSession, me, signOut });

    const botao = screen.getByRole('button', { name: 'Excluir minha conta' });
    expect(botao).toBeDisabled();
    await user.type(screen.getByLabelText(/Digite EXCLUIR/), 'excluir');
    expect(botao).toBeDisabled();
    await user.clear(screen.getByLabelText(/Digite EXCLUIR/));
    await user.type(screen.getByLabelText(/Digite EXCLUIR/), 'EXCLUIR');
    await user.click(botao);

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(apagados).toEqual(['u1']);
    expect(signOut).toHaveBeenCalled();
    expect(await screen.findByText(/Sua conta foi excluída/)).toBeInTheDocument();
  });

  it('erro do servidor aparece no Perfil e a pessoa continua logada', async () => {
    fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
    bridgeApi({ '/api/me': createMeHandler({ verifyToken: fakeVerify, profiles: memoryProfiles(), conta: { excluir: async () => {} }, removerLogin: null }) });
    const signOut = vi.fn(async () => {});
    const user = userEvent.setup();
    const { router } = renderAt('/perfil', { status: 'signedIn', session: tokenSession, me, signOut });
    await user.type(screen.getByLabelText(/Digite EXCLUIR/), 'EXCLUIR');
    await user.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não está disponível agora/);
    expect(router.state.location.pathname).toBe('/perfil');
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('política de privacidade', () => {
  it('diz quem é o controlador dos dados (empresa e CNPJ) e por quanto tempo ficam as cópias de segurança', () => {
    renderAt('/privacidade', { status: 'signedOut' });
    expect(screen.getByText(new RegExp(`controlador.*${COMPANY.cnpj.replace(/[./]/g, '\\$&')}`))).toBeInTheDocument();
    expect(screen.getByText(/cópias de segurança criptografadas do banco, guardadas por até 90 dias/)).toBeInTheDocument();
  });
});

describe('termos de uso', () => {
  it('a página existe e fala de PRO, arrependimento em 7 dias, IA e exclusão da conta', () => {
    renderAt('/termos', { status: 'signedOut' });
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument();
    for (const t of [/sem renovação automática/, /7 dias/, /inteligência artificial/, /Excluir minha conta/]) expect(screen.getAllByText(t).length).toBeGreaterThan(0);
  });

  it('o cadastro e a página inicial levam aos termos e à privacidade', () => {
    fakeSupabase();
    renderAt('/cadastro', { status: 'signedOut' });
    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '/termos');
    expect(screen.getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute('href', '/privacidade');
    cleanup();
    renderAt('/', { status: 'signedOut' });
    expect(screen.getByRole('link', { name: 'Termos' })).toHaveAttribute('href', '/termos');
  });
});
