// @vitest-environment jsdom
// CAPTCHA (Cloudflare Turnstile) no login, no "esqueci a senha" e no
// cadastro: só aparece quando a chave está configurada; com ela, o envio
// espera a verificação e manda o token para o Supabase conferir.
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authErrorMessage } from '../../src/auth/messages';
import { setSupabaseForTests } from '../../src/lib/supabase';
import { fakeSupabase, renderAt } from './render';

type Opts = { callback: (t: string) => void };
let respondeu: ((t: string) => void) | null = null;
const resets: string[] = [];

function comCaptcha(auto: boolean) {
  const auth = fakeSupabase();
  setSupabaseForTests({ auth } as unknown as SupabaseClient, 'chave-teste');
  window.turnstile = {
    render: (_el: HTMLElement, opts: Record<string, unknown>) => {
      respondeu = (opts as unknown as Opts).callback;
      if (auto) respondeu('tok-1');
      return 'w1';
    },
    reset: (id?: string) => { resets.push(id ?? ''); },
    remove: () => {},
  };
  return auth;
}

afterEach(() => {
  cleanup();
  delete window.turnstile;
  respondeu = null;
  resets.length = 0;
});

describe('CAPTCHA', () => {
  it('sem chave configurada: nada muda (o envio não leva token)', async () => {
    const auth = fakeSupabase();
    const user = userEvent.setup();
    renderAt('/entrar', { status: 'signedOut' });
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'senha123' });
    expect(screen.queryByText(/não sou um robô/i)).toBeNull();
  });

  it('com chave: o botão espera a verificação; o login manda o token e a verificação recomeça', async () => {
    const auth = comCaptcha(false);
    const user = userEvent.setup();
    renderAt('/entrar', { status: 'signedOut' });
    await user.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    expect(await screen.findByText(/Confirme que você não é um robô/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();

    await waitFor(() => expect(respondeu).not.toBeNull());
    respondeu!('tok-9');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'senha123', options: { captchaToken: 'tok-9' } });
    await waitFor(() => expect(resets).toEqual(['w1'])); // token só vale uma vez
  });

  it('cadastro e "esqueci a senha" também mandam o token', async () => {
    const auth = comCaptcha(true);
    const user = userEvent.setup();
    renderAt('/cadastro', { status: 'signedOut' });
    await user.type(screen.getByLabelText('Nome'), 'Maria');
    await user.type(screen.getByLabelText('E-mail'), 'm@b.com');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.type(screen.getByLabelText('Confirme a senha'), 'senha123');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ captchaToken: 'tok-1' }) }));
    cleanup();

    renderAt('/entrar', { status: 'signedOut' });
    await user.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    await user.type(screen.getByLabelText('E-mail'), 'm@b.com');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar link' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('m@b.com', { redirectTo: `${window.location.origin}/redefinir-senha`, captchaToken: 'tok-1' });
  });

  it('erro de CAPTCHA do Supabase vira mensagem em português', () => {
    expect(authErrorMessage(new Error('captcha verification process failed'))).toBe('Não conseguimos confirmar que você não é um robô. Tente de novo.');
  });
});
