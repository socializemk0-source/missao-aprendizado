// @vitest-environment jsdom
// Desafio do Tico na página inicial: 4 questões do dia sem cadastro, corrigidas
// pelo /api/desafio de verdade; placar, sequência de dias no aparelho e o
// convite para criar a conta no fim.
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDesafioHandler } from '../../api/desafio';
import { questao } from '../../content/trilha';
import { desafioDoDia, diaAnterior } from '../../server/desafio';
import { track } from '../../src/lib/marketing';
import { CHAVE_DESAFIO } from '../../src/lib/desafio';
import { bridgeApi } from './api-bridge';
import { me, renderAt, session } from './render';

vi.mock('../../src/lib/marketing', () => ({ track: vi.fn(() => 'evt-1') }));
const rastreio = vi.mocked(track);

const DIA = '2026-10-25';
const AGORA = Date.parse(`${DIA}T15:00:00Z`);
const hoje = desafioDoDia(DIA);
const certa = (i: number) => questao(hoje.questoes[i]!.id)!.correta;
const errada = (i: number) => (certa(i) + 1) % hoje.questoes[i]!.alternativas.length;

let ligar: () => ReturnType<typeof bridgeApi>;
beforeEach(() => {
  rastreio.mockClear();
  localStorage.clear();
  ligar = () => bridgeApi({ '/api/desafio': createDesafioHandler({ now: () => AGORA }) });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function responder(i: number, escolha: number) {
  await screen.findByRole('heading', { name: hoje.questoes[i]!.enunciado });
  await userEvent.click(screen.getAllByRole('radio')[escolha]!);
  await userEvent.click(screen.getByRole('button', { name: 'Conferir resposta' }));
  await screen.findByText(questao(hoje.questoes[i]!.id)!.explicacao);
  await userEvent.click(screen.getByRole('button', { name: i < 3 ? 'Próxima questão' : 'Ver meu resultado' }));
}

describe('Desafio do Tico na página inicial', () => {
  it('mostra o número do desafio, a matéria e a 1ª questão; conferir só depois de escolher', async () => {
    ligar();
    renderAt('/', { status: 'signedOut' });
    expect(await screen.findByText(`Desafio do Tico nº ${hoje.numero}`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: hoje.questoes[0]!.enunciado })).toBeInTheDocument();
    expect(screen.getByText(`${hoje.questoes[0]!.disciplinaNome} · ${hoje.questoes[0]!.assunto}`)).toBeInTheDocument();
    expect(screen.getByText('0 de 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conferir resposta' })).toBeDisabled();
  });

  it('errou: mostra a letra certa e a explicação; o placar marca o erro', async () => {
    ligar();
    renderAt('/', { status: 'signedOut' });
    await screen.findByRole('heading', { name: hoje.questoes[0]!.enunciado });
    await userEvent.click(screen.getAllByRole('radio')[errada(0)]!);
    await userEvent.click(screen.getByRole('button', { name: 'Conferir resposta' }));
    const feedback = await screen.findByRole('status');
    expect(feedback).toHaveTextContent(`A certa é a letra ${String.fromCharCode(65 + certa(0))}`);
    expect(feedback).toHaveTextContent(questao(hoje.questoes[0]!.id)!.explicacao);
    expect(screen.getByLabelText('Questão 1: errou')).toBeInTheDocument();
    expect(screen.getByText('1 de 4')).toBeInTheDocument();
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled();
  });

  it('4 respondidas: resultado, 1 dia seguido e convite para criar a conta', async () => {
    const { calls } = ligar();
    renderAt('/', { status: 'signedOut' });
    await responder(0, certa(0));
    await responder(1, errada(1));
    await responder(2, certa(2));
    await responder(3, certa(3));
    expect(await screen.findByRole('heading', { name: 'Você acertou 3 de 4' })).toBeInTheDocument();
    expect(screen.getByText('1 dia seguido')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta grátis e continuar' })).toHaveAttribute('href', '/cadastro');
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(4);
  });

  it('voltou à página no mesmo dia: continua de onde parou, sem responder de novo', async () => {
    ligar();
    const primeira = renderAt('/', { status: 'signedOut' });
    await responder(0, certa(0));
    primeira.unmount();
    renderAt('/', { status: 'signedOut' });
    expect(await screen.findByRole('heading', { name: hoje.questoes[1]!.enunciado })).toBeInTheDocument();
    expect(screen.getByLabelText('Questão 1: acertou')).toBeInTheDocument();
  });

  it('jogou ontem também: a sequência sobe; pulou um dia: recomeça', async () => {
    localStorage.setItem(CHAVE_DESAFIO, JSON.stringify({ dia: diaAnterior(DIA), respostas: {}, ultimoDia: diaAnterior(DIA), sequencia: 4 }));
    ligar();
    const r = renderAt('/', { status: 'signedOut' });
    for (let i = 0; i < 4; i++) await responder(i, certa(i));
    expect(await screen.findByText('5 dias seguidos')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Você acertou 4 de 4' })).toBeInTheDocument();
    r.unmount();

    localStorage.setItem(CHAVE_DESAFIO, JSON.stringify({ dia: '2026-10-20', respostas: {}, ultimoDia: '2026-10-20', sequencia: 9 }));
    renderAt('/', { status: 'signedOut' });
    for (let i = 0; i < 4; i++) await responder(i, certa(i));
    expect(await screen.findByText('1 dia seguido')).toBeInTheDocument();
  });

  it('logado: o fim leva para o estudo do dia', async () => {
    ligar();
    renderAt('/', { status: 'signedIn', session, me });
    for (let i = 0; i < 4; i++) await responder(i, certa(i));
    await screen.findByRole('heading', { name: 'Você acertou 4 de 4' });
    const card = within(document.querySelector<HTMLElement>('.desafio')!);
    expect(card.getByRole('link', { name: 'Continuar estudando' })).toHaveAttribute('href', '/hoje');
    expect(card.queryByRole('link', { name: 'Criar conta grátis e continuar' })).toBeNull();
  });

  it('servidor fora do ar: aparece a questão de demonstração no lugar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    renderAt('/', { status: 'signedOut' });
    expect(await screen.findByRole('heading', { name: /acertou 30/ })).toBeInTheDocument();
  });

  it('manda os eventos de cada resposta e do fim do desafio', async () => {
    ligar();
    renderAt('/', { status: 'signedOut' });
    await responder(0, errada(0));
    expect(rastreio).toHaveBeenCalledWith('at_daily_challenge_answered',
      { challenge: hoje.numero, question: 1, discipline: hoje.questoes[0]!.disciplina, correct: false }, { proprio: true });
    for (let i = 1; i < 4; i++) await responder(i, certa(i));
    await waitFor(() => expect(rastreio).toHaveBeenCalledWith('at_daily_challenge_completed', { challenge: hoje.numero, score: 3, streak: 1 }, { proprio: true }));
  });
});
