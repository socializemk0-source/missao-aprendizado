// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { me, renderAt, session } from './render';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('página inicial', () => {
  it('deslogado: chamada principal leva ao cadastro; tem todas as seções', () => {
    renderAt('/', { status: 'signedOut' });
    expect(screen.getAllByRole('link', { name: 'Começar grátis' })[0]).toHaveAttribute('href', '/cadastro');
    for (const name of ['Responda, confira, entenda.', 'Como funciona', 'Tudo o que você precisa num lugar só', 'Comece grátis. Vire PRO quando quiser.', 'Dúvidas frequentes']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('logado: as chamadas levam para a trilha, sem redirecionar sozinho', () => {
    const { router } = renderAt('/', { status: 'signedIn', session, me });
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getAllByRole('link', { name: 'Continuar minha trilha' })[0]).toHaveAttribute('href', '/jogar');
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull();
  });

  it('questão de demonstração: só confere depois de escolher; mostra acerto e explicação', async () => {
    renderAt('/', { status: 'signedOut' });
    const check = screen.getByRole('button', { name: 'Conferir resposta' });
    expect(check).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /75%/ }));
    await userEvent.click(check);
    const feedback = screen.getByRole('status');
    expect(feedback).toHaveTextContent('Acertou! +10 XP');
    expect(feedback).toHaveTextContent('30 ÷ 40 = 0,75');
    expect(screen.getByRole('radio', { name: /60%/ })).toBeDisabled();
  });

  it('questão de demonstração: erro mostra a resposta certa', async () => {
    renderAt('/', { status: 'signedOut' });
    await userEvent.click(screen.getByRole('radio', { name: /80%/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Conferir resposta' }));
    expect(screen.getByRole('status')).toHaveTextContent('A resposta é 75%');
  });

  it('planos: trocar para 1 ano mostra o preço anual', async () => {
    renderAt('/', { status: 'signedOut' });
    const pro = screen.getByRole('heading', { name: 'PRO' }).closest('article')!;
    expect(within(pro).getByText('29,90', { exact: false })).toBeInTheDocument();
    await userEvent.click(within(pro).getByRole('button', { name: '1 ano' }));
    expect(within(pro).getByText('239,90', { exact: false })).toBeInTheDocument();
  });
});

describe('captura de e-mail', () => {
  async function fill() {
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Maria');
    await userEvent.type(screen.getByLabelText('Seu melhor e-mail'), 'maria@teste.dev');
  }

  it('sem marcar a autorização, não envia', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/', { status: 'signedOut' });
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Quero receber' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Marque a autorização');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('com autorização, envia e mostra a confirmação', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/', { status: 'signedOut' });
    await fill();
    await userEvent.click(screen.getByLabelText(/Aceito receber e-mails/));
    await userEvent.click(screen.getByRole('button', { name: 'Quero receber' }));
    expect(await screen.findByText('Pronto! Você está na lista.')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/leads');
    expect(JSON.parse(String(init.body))).toMatchObject({ email: 'maria@teste.dev', name: 'Maria', consent: true, website: '' });
  });

  it('erro do servidor aparece e o formulário continua preenchido', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Confira o e-mail digitado.' }), { status: 400 })));
    renderAt('/', { status: 'signedOut' });
    await fill();
    await userEvent.click(screen.getByLabelText(/Aceito receber e-mails/));
    await userEvent.click(screen.getByRole('button', { name: 'Quero receber' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confira o e-mail digitado.');
    expect(screen.getByLabelText('Seu melhor e-mail')).toHaveValue('maria@teste.dev');
  });
});

describe('/privacidade', () => {
  it('abre sem login e explica dados, uso, parceiros e direitos', () => {
    renderAt('/privacidade', { status: 'signedOut' });
    for (const name of ['Política de privacidade', 'Quais dados guardamos', 'Para que usamos', 'Com quem compartilhamos', 'Seus direitos']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });
});
