// @vitest-environment jsdom
// Telas que contam para os anúncios: cada ação importante manda seu evento por track().
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPagamentosHandler } from '../../api/pagamentos';
import { createGameHandler } from '../../api/game';
import { memoryGameStore } from '../../server/game-memory';
import { memoryPayments, type MpClient } from '../../server/payments';
import { leave } from '../../src/lib/payments';
import { track } from '../../src/lib/marketing';
import { setSupabaseForTests } from '../../src/lib/supabase';
import { LeadForm } from '../../src/pages/landing/LeadForm';
import { fakeVerify } from '../server/helpers';
import { authApi, bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

vi.mock('../../src/lib/marketing', () => ({ track: vi.fn(() => 'evt-1') }));
const rastreio = vi.mocked(track);
const enviados = (nome: string) => rastreio.mock.calls.filter((c) => c[0] === nome);

// Simula a tela rolando até o elemento observado.
let observadores: Array<{ callback: IntersectionObserverCallback; el: Element }> = [];
beforeEach(() => {
  rastreio.mockClear();
  observadores = [];
  class FakeIO {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(el: Element) { observadores.push({ callback: this.callback, el }); }
    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
  }
  vi.stubGlobal('IntersectionObserver', FakeIO);
});
afterEach(() => {
  cleanup();
  setSupabaseForTests(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const aparecer = (el: Element) => {
  for (const o of observadores.filter((x) => x.el === el)) o.callback([{ isIntersecting: true, target: el } as IntersectionObserverEntry], {} as IntersectionObserver);
};

describe('página inicial', () => {
  it('questão de demonstração: manda DemoQuestionAnswered com acertou sim/não', async () => {
    renderAt('/', { status: 'signedOut' });
    await userEvent.click(screen.getByRole('radio', { name: /75%/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Conferir resposta' }));
    expect(rastreio).toHaveBeenCalledWith('DemoQuestionAnswered', { correct: true }, { proprio: true });
  });

  it('questão de demonstração errada: correct = false', async () => {
    renderAt('/', { status: 'signedOut' });
    await userEvent.click(screen.getByRole('radio', { name: /60%/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Conferir resposta' }));
    expect(rastreio).toHaveBeenCalledWith('DemoQuestionAnswered', { correct: false }, { proprio: true });
  });

  it('manda at_demo_question_viewed e at_plans_section_viewed quando aparecem na tela', () => {
    const { container } = renderAt('/', { status: 'signedOut' });
    aparecer(container.querySelector('.demo-question')!);
    aparecer(container.querySelector('#planos')!);
    expect(rastreio).toHaveBeenCalledWith('at_demo_question_viewed', { page: '/' }, { proprio: true });
    expect(rastreio).toHaveBeenCalledWith('at_plans_section_viewed', { page: '/' }, { proprio: true });
  });

  it('e-mail na lista: manda Lead só quando o servidor aceitou', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
    render(<MemoryRouter><LeadForm /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Seu melhor e-mail'), 'a@b.com');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Quero receber' }));
    await waitFor(() => expect(rastreio).toHaveBeenCalledWith('Lead', { content_name: 'landing' }));
    expect(JSON.stringify(rastreio.mock.calls)).not.toContain('a@b.com');
  });

  it('e-mail na lista com erro do servidor: nenhum Lead', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'falhou' }), { status: 500 })));
    render(<MemoryRouter><LeadForm /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Seu melhor e-mail'), 'a@b.com');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Quero receber' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(enviados('Lead')).toHaveLength(0);
  });
});

describe('cadastro', () => {
  async function preencher(senha = 'senha1234', confirma = senha) {
    await userEvent.type(screen.getByLabelText('Nome'), 'Maria');
    await userEvent.type(screen.getByLabelText('E-mail'), 'maria@teste.dev');
    await userEvent.type(screen.getByLabelText('Senha'), senha);
    await userEvent.type(screen.getByLabelText('Confirme a senha'), confirma);
  }

  it('conta criada: manda CompleteRegistration sem dados pessoais', async () => {
    fakeSupabase();
    await authApi();
    renderAt('/cadastro', { status: 'signedOut' });
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    await screen.findByText(/Enviamos um link de confirmação/);
    expect(rastreio).toHaveBeenCalledWith('CompleteRegistration', { status: 'email', content_name: 'cadastro' });
    expect(JSON.stringify(rastreio.mock.calls)).not.toContain('maria@teste.dev');
  });

  it('cadastro recusado pelo serviço: manda at_signup_form_error e nenhum CompleteRegistration', async () => {
    fakeSupabase();
    await authApi(() => ({ status: 429, body: { error_code: 'over_request_rate_limit', msg: 'rate limit' } }));
    renderAt('/cadastro', { status: 'signedOut' });
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    await screen.findByRole('alert');
    expect(rastreio).toHaveBeenCalledWith('at_signup_form_error', { error_type: 'servico', page: '/cadastro' }, { proprio: true });
    expect(enviados('CompleteRegistration')).toHaveLength(0);
  });

  it('senhas diferentes: erro de validação (só a categoria, nunca o texto digitado)', async () => {
    fakeSupabase();
    renderAt('/cadastro', { status: 'signedOut' });
    await preencher('senha1234', 'outra1234');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(rastreio).toHaveBeenCalledWith('at_signup_form_error', { error_type: 'validacao', page: '/cadastro' }, { proprio: true });
    expect(JSON.stringify(rastreio.mock.calls)).not.toContain('senha1234');
  });

  it('at_signup_form_started uma vez só, no primeiro campo; at_signup_form_viewed ao aparecer', async () => {
    fakeSupabase();
    const { container } = renderAt('/cadastro', { status: 'signedOut' });
    aparecer(container.querySelector('form')!);
    expect(rastreio).toHaveBeenCalledWith('at_signup_form_viewed', { page: '/cadastro' }, { proprio: true });
    await userEvent.click(screen.getByLabelText('Nome'));
    await userEvent.click(screen.getByLabelText('E-mail'));
    expect(enviados('at_signup_form_started')).toHaveLength(1);
  });
});

describe('planos', () => {
  function setup() {
    const store = memoryPayments();
    const client: MpClient = {
      createPreference: vi.fn(async () => ({ id: 'pref', url: 'https://mp.test/checkout' })),
      getPayment: async () => { throw new Error('não usado'); },
      searchPayments: async () => [],
    };
    const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;
    const game = memoryGameStore({ plan: () => 'free' });
    fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
    bridgeApi({
      '/api/pagamentos': createPagamentosHandler({ verifyToken: fakeVerify, store, client, baseUrl: () => 'https://app.dev' }),
      '/api/game': createGameHandler({ verifyToken: fakeVerify, store: game }),
    });
    return { signedIn: { status: 'signedIn' as const, session: tokenSession, me } };
  }

  it('abrir a tela de planos manda ViewContent (content_name = planos)', async () => {
    const { signedIn } = setup();
    renderAt('/planos', signedIn);
    await screen.findByText('Seu plano atual');
    expect(rastreio).toHaveBeenCalledWith('ViewContent', { content_name: 'planos' });
  });

  it('clicar para pagar manda InitiateCheckout com valor e BRL, antes de sair do site', async () => {
    const { signedIn } = setup();
    vi.spyOn(leave, 'to').mockImplementation(() => {});
    renderAt('/planos', signedIn);
    await screen.findByText('Seu plano atual');
    await userEvent.click(screen.getByRole('button', { name: /Comprar 1 ano — R\$\s239,90/ }));
    expect(rastreio).toHaveBeenCalledWith('InitiateCheckout', { value: 239.9, currency: 'BRL', content_name: 'pro-1-ano', content_category: 'plano_pro' });
    window.dispatchEvent(new Event('pageshow')); // volta do checkout destrava os botões
    await userEvent.click(screen.getByRole('button', { name: /Comprar 30 dias — R\$\s29,90/ }));
    expect(rastreio).toHaveBeenCalledWith('InitiateCheckout', { value: 29.9, currency: 'BRL', content_name: 'pro-30-dias', content_category: 'plano_pro' });
  });
});
