// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { NAV } from '../../src/app/nav';
import { safeNext } from '../../src/auth/RequireAuth';
import { me, renderAt, session } from './render';

afterEach(cleanup);
const signedIn = { status: 'signedIn' as const, session, me };

describe('acesso às telas do app', () => {
  it('sem login, abrir uma tela do app leva para /entrar guardando o destino', async () => {
    const { router } = renderAt('/revisar?x=1', { status: 'signedOut' });
    expect(await screen.findByRole('heading', { name: 'Que bom te ver de novo!' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/entrar');
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/revisar?x=1')}`);
  });

  it('carregando a sessão mostra "Carregando", sem piscar o formulário de login', () => {
    renderAt('/jogar', { status: 'loading' });
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    expect(screen.queryByRole('heading', { name: /bom te ver/ })).toBeNull();
  });

  it('logado, vê o menu completo e o botão de conta com o primeiro nome', () => {
    renderAt('/jogar', signedIn);
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    for (const item of NAV) expect(within(nav).getByRole('link', { name: item.label })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Trilha' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Maria' })).toHaveAttribute('href', '/perfil');
    expect(screen.getByRole('heading', { name: /Olá, Maria!/ })).toBeInTheDocument();
  });

  it('telas ainda não feitas mostram "em construção" com a etapa', () => {
    renderAt('/ranking', signedIn);
    expect(screen.getByRole('heading', { name: 'Ranking' })).toBeInTheDocument();
    expect(screen.getByText(/etapa 3/)).toBeInTheDocument();
  });

  it('página inicial logado: oferece "Continuar", sem redirecionar sozinha', () => {
    const { router } = renderAt('/', signedIn);
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('link', { name: 'Continuar estudando' })).toHaveAttribute('href', '/jogar');
  });

  it('endereço inexistente → página não encontrada', () => {
    renderAt('/nao-existe', signedIn);
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });
});

describe('sair da conta', () => {
  it('pede confirmação; confirmando, sai e volta para a página inicial', async () => {
    // A tela já precisa estar na página inicial QUANDO a sessão acaba: se
    // sair primeiro, a proteção das telas do app manda para /entrar.
    let pathWhenSignedOut = '';
    const signOut = vi.fn(async () => {
      pathWhenSignedOut = router.state.location.pathname;
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { router } = renderAt('/perfil', { ...signedIn, signOut });
    const button = screen.getByRole('button', { name: /Sair da conta/ });

    await userEvent.click(button);
    expect(signOut).not.toHaveBeenCalled();

    await userEvent.click(button);
    expect(signOut).toHaveBeenCalledOnce();
    expect(pathWhenSignedOut).toBe('/');
    expect(router.state.location.pathname).toBe('/');
    confirm.mockRestore();
  });
});

describe('safeNext', () => {
  it('só aceita caminhos internos', () => {
    expect(safeNext('/redacao?a=1')).toBe('/redacao?a=1');
    for (const bad of [null, '', 'https://golpe.com', '//golpe.com', '/\\golpe.com', 'jogar']) expect(safeNext(bad)).toBe('/jogar');
  });
});
