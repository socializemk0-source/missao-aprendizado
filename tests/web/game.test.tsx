// @vitest-environment jsdom
// Telas do jogo contra o motor de verdade (api/game.ts + store em memória).
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game';
import { FASES, QUESTOES } from '../../content/trilha';
import { answer as doAnswer } from '../../server/game';
import { memoryGameStore } from '../../server/game-memory';
import type { Plan } from '../../shared/game';
import { fakeVerify } from '../server/helpers';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;
const signedIn = { status: 'signedIn' as const, session: tokenSession, me };
let plan: Plan = 'free';
const FREE_PREFIXES = FASES.filter((f) => f.capituloIndex < 5).flatMap((f) => f.questoes);

function setup() {
  const store = memoryGameStore({ plan: () => plan, names: { u1: 'Maria Souza', u2: 'João' } });
  fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
  const bridge = bridgeApi({ '/api/game': createGameHandler({ verifyToken: fakeVerify, store }) });
  return { store, ...bridge };
}

// A questão na tela e o índice da alternativa certa/errada.
function currentKey() {
  const text = screen.getByRole('heading', { level: 2 }).textContent;
  const q = QUESTOES.find((x) => x.enunciado === text);
  if (!q) throw new Error(`questão não encontrada: ${text}`);
  return { right: q.correta, wrong: (q.correta + 1) % q.alternativas.length };
}

async function answer(user: ReturnType<typeof userEvent.setup>, which: 'right' | 'wrong') {
  const choice = currentKey()[which];
  await user.click(screen.getAllByRole('radio')[choice]!);
  await user.click(screen.getByRole('button', { name: 'Verificar' }));
  await screen.findByRole('button', { name: 'Continuar' });
}

beforeEach(() => { plan = 'free'; });
afterEach(cleanup);

describe('trilha', () => {
  it('mostra os capítulos: só a primeira fase aberta; capítulos 6+ marcados PRO', async () => {
    setup();
    renderAt('/jogar', signedIn, { progress: true });
    expect(await screen.findByRole('link', { name: /Acentuação gráfica — 0\/4 questões dominadas/ })).toHaveAttribute('href', '/fase/fase-01-1');
    expect(screen.getByLabelText('Crase — bloqueada')).toBeInTheDocument();
    expect(screen.getAllByText(/ · PRO$/)).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Continuar trilha' })).toBeInTheDocument();
  });

  it('fase bloqueada aberta pela URL explica o motivo', async () => {
    setup();
    renderAt('/fase/fase-01-2', signedIn);
    expect(await screen.findByRole('heading', { name: 'Fase ainda bloqueada' })).toBeInTheDocument();
  });

  it('terminou a parte grátis: capítulo 6 leva ao PRO', async () => {
    const { store } = setup();
    for (const q of QUESTOES.filter((x) => FREE_PREFIXES.some((p) => x.id.startsWith(p)))) {
      await doAnswer(store, 'u1', { questionId: q.id, choice: q.correta, mode: 'pratica' });
    }
    renderAt('/jogar', signedIn);
    expect(await screen.findByRole('heading', { name: /Você fechou a parte grátis!/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /disponível no plano PRO/ })[0]).toHaveAttribute('href', '/planos');
    cleanup();
    renderAt('/fase/fase-06-1', signedIn);
    expect(await screen.findByRole('heading', { name: 'Capítulo do plano PRO' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conhecer o PRO' })).toHaveAttribute('href', '/planos');
  });
});

describe('sessão de questões', () => {
  it('sem gabarito na tela; errar mostra a certa e a questão volta até acertar; fecha a fase com bônus', async () => {
    const { calls } = setup();
    const user = userEvent.setup();
    renderAt('/fase/fase-01-1', signedIn, { progress: true });
    await screen.findByRole('heading', { name: 'Acentuação gráfica' });
    // O servidor não mandou o gabarito.
    const phaseCall = calls.find((c) => c.path.includes('action=fase'))!;
    expect(phaseCall).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeDisabled();

    const first = screen.getByRole('heading', { level: 2 }).textContent;
    await answer(user, 'wrong');
    expect(screen.getByText(/Resposta certa: [A-E]/)).toBeInTheDocument();
    expect(screen.getByText(/volta no fim/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    for (let i = 0; i < 3; i++) {
      await answer(user, 'right');
      expect(screen.getByText('Acertou! +10 XP')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Continuar' }));
    }
    // A que errou voltou por último.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(first!);
    await answer(user, 'right');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByRole('heading', { name: 'Fase concluída!' })).toBeInTheDocument();
    expect(screen.getByText('+60 XP')).toBeInTheDocument();
    expect(screen.getByText(/\+20 de bônus da fase/)).toBeInTheDocument();
    expect(screen.getByTitle('Pontos de experiência')).toHaveTextContent('60');
    expect(screen.getByTitle('Vidas')).toHaveTextContent('4');
  });

  it('acabaram as vidas: oferece revisar e o PRO', async () => {
    setup();
    const user = userEvent.setup();
    renderAt('/fase/fase-01-1', signedIn, { progress: true });
    await screen.findByRole('heading', { name: 'Acentuação gráfica' });
    for (let i = 0; i < 5; i++) {
      await answer(user, 'wrong');
      await user.click(screen.getByRole('button', { name: 'Continuar' }));
    }
    await user.click(screen.getAllByRole('radio')[0]!);
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('heading', { name: 'Suas vidas acabaram' })).toBeInTheDocument();
    expect(within(alert).getByText(/próxima vida chega em 30 min/)).toBeInTheDocument();
    expect(within(alert).getByRole('link', { name: 'Revisar erros' })).toHaveAttribute('href', '/revisar');
    await waitFor(() => expect(screen.getByTitle('Vidas')).toHaveTextContent('0'));
  });

  it('PRO: vidas ilimitadas no cabeçalho', async () => {
    plan = 'pro';
    setup();
    renderAt('/jogar', signedIn, { progress: true });
    await waitFor(() => expect(screen.getByTitle('Vidas ilimitadas (PRO)')).toHaveTextContent('∞'));
  });

  it('teclado: número escolhe, Enter confere e continua', async () => {
    setup();
    const user = userEvent.setup();
    renderAt('/fase/fase-01-1', signedIn, { progress: true });
    await screen.findByRole('heading', { name: 'Acentuação gráfica' });
    await user.keyboard(String(currentKey().right + 1));
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Acertou! +10 XP')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Verificar' })).toBeDisabled());
  });
});

describe('revisão, missões e ranking', () => {
  it('revisão vazia comemora; depois de errar, traz a questão sem gastar vidas', async () => {
    const { store } = setup();
    renderAt('/revisar', signedIn);
    expect(await screen.findByRole('heading', { name: 'Nenhum erro pendente. Mandou bem!' })).toBeInTheDocument();
    cleanup();

    const q = QUESTOES.find((x) => x.id === 'pt-acent-1')!;
    await doAnswer(store, 'u1', { questionId: q.id, choice: (q.correta + 1) % q.alternativas.length, mode: 'trilha' });
    renderAt('/revisar', signedIn, { progress: true });
    expect(await screen.findByRole('heading', { name: q.enunciado })).toBeInTheDocument();
    expect(screen.queryByText(/^❤ \d$/, { selector: '.quiz-hearts' })).toBeNull();
  });

  it('missão completa pode ser resgatada uma vez', async () => {
    const { store } = setup();
    for (const q of QUESTOES.filter((x) => x.id.startsWith('pt-acent'))) {
      await doAnswer(store, 'u1', { questionId: q.id, choice: q.correta, mode: 'trilha' });
    }
    const user = userEvent.setup();
    renderAt('/missoes', signedIn, { progress: true });
    const card = (await screen.findByText('Conclua 1 fase da trilha')).closest('li')!;
    await user.click(within(card).getByRole('button', { name: 'Resgatar' }));
    expect(await screen.findByText('+25 XP resgatados!')).toBeInTheDocument();
    expect(await within(card).findByText('Resgatada ✓')).toBeInTheDocument();
  });

  it('ranking destaca você', async () => {
    const { store } = setup();
    const q = QUESTOES[0]!;
    await doAnswer(store, 'u2', { questionId: q.id, choice: q.correta, mode: 'trilha' });
    renderAt('/ranking', signedIn);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('João')).toBeInTheDocument();
    expect(within(table).getByText('Você').closest('tr')).toHaveClass('is-you');
  });
});
