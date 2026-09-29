// @vitest-environment jsdom
// Telas de simulado contra o motor de verdade (api/game.ts + store em memória).
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game';
import { QUESTOES } from '../../content/trilha';
import { memoryGameStore } from '../../server/game-memory';
import type { Plan } from '../../shared/game';
import { fakeVerify } from '../server/helpers';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;
const signedIn = { status: 'signedIn' as const, session: tokenSession, me };
let plan: Plan = 'free';

function setup() {
  const store = memoryGameStore({ plan: () => plan });
  fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
  bridgeApi({ '/api/game': createGameHandler({ verifyToken: fakeVerify, store }) });
  return store;
}

beforeEach(() => { plan = 'free'; localStorage.clear(); });
afterEach(cleanup);

async function montar(user: ReturnType<typeof userEvent.setup>) {
  renderAt('/simulados', signedIn, { progress: true });
  await user.click(await screen.findByRole('radio', { name: /Fácil/ }));
  for (const d of ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo']) {
    await user.click(screen.getByRole('checkbox', { name: new RegExp(d) }));
  }
  await user.click(screen.getByRole('radio', { name: '5' }));
  await user.click(screen.getByRole('checkbox', { name: /Com cronômetro/ }));
  await user.click(screen.getByRole('button', { name: 'Começar simulado' }));
  await screen.findByText(/Questão 1 de 5/);
}

describe('simulado', () => {
  it('monta pela dificuldade, faz sem ver o gabarito, entrega e mostra o resultado comentado', async () => {
    setup();
    const user = userEvent.setup();
    await montar(user);
    expect(screen.queryByRole('timer')).toBeNull(); // sem cronômetro
    // Responde todas: a 1ª errada, o resto certo (pelo enunciado na tela).
    for (let k = 0; k < 5; k++) {
      const text = screen.getByRole('heading', { level: 2 }).textContent!;
      const q = QUESTOES.find((x) => x.enunciado === text)!;
      expect(q.dificuldade).toBe(1);
      await user.click(screen.getAllByRole('radio')[k === 0 ? (q.correta + 1) % q.alternativas.length : q.correta]!);
      expect(screen.queryByText(/Resposta certa/)).toBeNull();
      if (k < 4) await user.click(screen.getByRole('button', { name: 'Próxima →' }));
    }
    expect(screen.getByRole('button', { name: 'Questão 5, respondida' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revisar e entregar' }));
    expect(screen.getByText(/Você respondeu/)).toHaveTextContent('Você respondeu 5 de 5.');
    await user.click(screen.getByRole('button', { name: 'Entregar agora' }));
    expect(await screen.findByRole('heading', { name: 'Você acertou 4 de 5 (80%)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Revisar os erros (1)' })).toHaveAttribute('href', '/revisar');
    expect(screen.getByRole('progressbar', { name: 'Informática: 4 de 5' })).toBeInTheDocument();
    expect(screen.getAllByText(/Questão \d · (acertou|errou)/)).toHaveLength(5);
    await waitFor(() => expect(screen.getByTitle('Pontos de experiência')).toHaveTextContent('40'));
  });

  it('grátis: depois do simulado do dia, o botão trava e oferece o PRO; histórico mostra a nota', async () => {
    setup();
    const user = userEvent.setup();
    await montar(user);
    await user.click(screen.getByRole('button', { name: 'Entregar' }));
    await user.click(screen.getByRole('button', { name: 'Entregar agora' }));
    await screen.findByRole('heading', { name: /Você acertou 0 de 5/ });
    await user.click(screen.getByRole('link', { name: 'Novo simulado' }));
    expect(await screen.findByText(/o de hoje já foi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Começar simulado' })).toBeDisabled();
    expect(within(screen.getByRole('complementary')).getByText('0/5')).toBeInTheDocument();
  });

  it('respostas sobrevivem a recarregar a página; em andamento aparece para continuar', async () => {
    setup();
    const user = userEvent.setup();
    await montar(user);
    await user.click(screen.getAllByRole('radio')[0]!);
    cleanup();
    renderAt('/simulados', signedIn);
    const link = await screen.findByRole('link', { name: 'Continuar' });
    const href = link.getAttribute('href')!;
    cleanup();
    renderAt(href, signedIn);
    await screen.findByText(/Questão 1 de 5/);
    expect(screen.getByText(/1 respondidas/)).toBeInTheDocument();
    expect(screen.getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('poucas questões: tamanhos que não cabem ficam desativados', async () => {
    setup();
    const user = userEvent.setup();
    renderAt('/simulados', signedIn);
    await user.click(await screen.findByRole('radio', { name: /Difícil/ }));
    for (const d of ['Português', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo']) {
      await user.click(screen.getByRole('checkbox', { name: new RegExp(d) }));
    }
    expect(screen.getByText(/poucas questões com esses filtros/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Começar simulado' })).toBeDisabled();
  });
});
