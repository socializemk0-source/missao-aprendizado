// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { authErrorMessage, passwordProblem } from '../../src/auth/messages';
import { setSupabaseForTests } from '../../src/lib/supabase';
import { fakeSupabase, me, renderAt, session } from './render';

afterEach(() => {
  cleanup();
  setSupabaseForTests(null);
});

describe('/entrar', () => {
  it('já logado (ex.: voltando do Google) → vai direto para o destino', () => {
    const { router } = renderAt('/entrar?next=%2Fredacao', { status: 'signedIn', session, me });
    expect(router.state.location.pathname).toBe('/redacao');
  });

  it('?next= para outro site é ignorado', () => {
    const { router } = renderAt('/entrar?next=https%3A%2F%2Fgolpe.com', { status: 'signedIn', session, me });
    expect(router.state.location.pathname).toBe('/jogar');
  });

  it('senha errada mostra a mensagem em português', async () => {
    fakeSupabase({ signInWithPassword: async () => ({ data: {}, error: new Error('Invalid login credentials') }) });
    renderAt('/entrar', { status: 'signedOut' });
    await userEvent.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('Google volta para /entrar mantendo o destino', async () => {
    const auth = fakeSupabase();
    renderAt('/entrar?next=%2Fmissoes', { status: 'signedOut' });
    await userEvent.click(screen.getByRole('button', { name: /Continuar com Google/ }));
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/entrar?next=%2Fmissoes` },
    });
  });

  it('esqueci a senha: mesma mensagem exista ou não a conta', async () => {
    const auth = fakeSupabase();
    renderAt('/entrar', { status: 'signedOut' });
    await userEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    await userEvent.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Se houver uma conta com a@b.com');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', { redirectTo: `${window.location.origin}/redefinir-senha` });
  });
});

describe('/cadastro', () => {
  async function fill(password = 'senha1234', confirm = password) {
    await userEvent.type(screen.getByLabelText('Nome'), 'Maria');
    await userEvent.type(screen.getByLabelText('E-mail'), 'maria@teste.dev');
    await userEvent.type(screen.getByLabelText('Senha'), password);
    await userEvent.type(screen.getByLabelText('Confirme a senha'), confirm);
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  }

  it('e-mail que já tem conta NÃO parece sucesso (Supabase devolve usuário sem identidades)', async () => {
    fakeSupabase({ signUp: async () => ({ data: { user: { identities: [] }, session: null }, error: null }) });
    renderAt('/cadastro', { status: 'signedOut' });
    await fill();
    expect(await screen.findByRole('alert')).toHaveTextContent('Este e-mail já tem conta');
  });

  it('cadastro que exige confirmação mostra a tela de "confirme seu e-mail"', async () => {
    const auth = fakeSupabase();
    renderAt('/cadastro', { status: 'signedOut' });
    await fill();
    expect(await screen.findByRole('heading', { name: 'Confirme seu e-mail' })).toBeInTheDocument();
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ data: { name: 'Maria' } }) }));
  });

  it('senha fraca ou diferente da confirmação é barrada antes de chamar o servidor', async () => {
    const auth = fakeSupabase();
    renderAt('/cadastro', { status: 'signedOut' });
    await fill('curta1');
    expect(screen.getByRole('alert')).toHaveTextContent('pelo menos 8');
    await userEvent.clear(screen.getByLabelText('Senha'));
    await userEvent.clear(screen.getByLabelText('Confirme a senha'));
    await userEvent.type(screen.getByLabelText('Senha'), 'senha1234');
    await userEvent.type(screen.getByLabelText('Confirme a senha'), 'senha9999');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('não são iguais');
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});

describe('/redefinir-senha', () => {
  it('sem a sessão do link → "link inválido ou expirado"', () => {
    renderAt('/redefinir-senha', { status: 'signedOut' });
    expect(screen.getByRole('heading', { name: 'Link inválido ou expirado' })).toBeInTheDocument();
  });

  it('com a sessão do link, salva a senha nova', async () => {
    const auth = fakeSupabase();
    renderAt('/redefinir-senha', { status: 'signedIn', session, me });
    await userEvent.type(screen.getByLabelText('Nova senha'), 'novaSenha1');
    await userEvent.type(screen.getByLabelText('Confirme a nova senha'), 'novaSenha1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByRole('heading', { name: 'Senha atualizada!' })).toBeInTheDocument();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'novaSenha1' });
  });
});

describe('mensagens', () => {
  it('erros conhecidos em português; desconhecidos viram mensagem genérica', () => {
    expect(authErrorMessage(new Error('Email not confirmed'))).toMatch(/Confirme seu e-mail/);
    expect(authErrorMessage(new Error('For security purposes, you can only request this after 20 seconds'))).toMatch(/Muitas tentativas/);
    expect(authErrorMessage(new Error('xyz interno'))).toBe('Não foi possível concluir agora. Tente de novo.');
  });

  it('regra de senha', () => {
    expect(passwordProblem('abc12')).toMatch(/8 caracteres/);
    expect(passwordProblem('abcdefgh')).toMatch(/letras e números/);
    expect(passwordProblem('abcdefg1')).toBeNull();
  });
});
