// @vitest-environment jsdom
// Jogos contra o motor de verdade (api/game.ts + store em memória): cada
// teste joga uma rodada inteira pela tela, como o aluno.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameHandler } from '../../api/game';
import { AFIRMACOES, GLOSSARIO, letras } from '../../content/jogos';
import { memoryGameStore } from '../../server/game-memory';
import { JOGO_XP } from '../../shared/game';
import { fakeVerify } from '../server/helpers';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;
const signedIn = { status: 'signedIn' as const, session: tokenSession, me };

function setup() {
  const store = memoryGameStore({ names: { u1: 'Maria Souza' } });
  fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
  const bridge = bridgeApi({ '/api/game': createGameHandler({ verifyToken: fakeVerify, store }) });
  return { store, ...bridge };
}

async function comecar(user: ReturnType<typeof userEvent.setup>, path: string, materia?: string) {
  renderAt(path, signedIn, { progress: true });
  if (materia) await user.selectOptions(await screen.findByLabelText('Matéria'), materia);
  await user.click(await screen.findByRole('button', { name: 'Começar' }));
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('tela dos jogos', () => {
  it('mostra os 5 jogos com link, e o XP de hoje de cada um', async () => {
    setup();
    renderAt('/jogos', signedIn, { progress: true });
    for (const [nome, href] of [
      ['Desafio relâmpago', '/jogos/desafio'], ['Radar do Tico', '/jogos/radar'], ['Memória do Tico', '/jogos/memoria'],
      ['Caça-palavras', '/jogos/caca-palavras'], ['Cruzadinha', '/jogos/cruzadinha'],
    ]) {
      expect(await screen.findByRole('link', { name: new RegExp(nome!) })).toHaveAttribute('href', href);
    }
    expect((await screen.findAllByText('XP hoje: 0 de 3 rodadas')).length).toBe(4);
  });
});

describe('Radar do Tico', () => {
  it('certo ou errado com explicação na hora; no fim, acertos, XP e recorde', async () => {
    setup();
    const user = userEvent.setup();
    await comecar(user, '/jogos/radar', 'rlm');
    for (let i = 0; i < 10; i++) {
      const texto = (await screen.findByTestId('radar-afirmacao')).textContent!;
      const item = AFIRMACOES.find((a) => a.texto === texto)!;
      expect(item.disciplina).toBe('rlm');
      expect(screen.getByText(`${i + 1} de 10`)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: i < 8 ? (item.certo ? 'Certo' : 'Errado') : (item.certo ? 'Errado' : 'Certo') }));
      expect(await screen.findByText(item.explicacao)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(i < 8 ? 'Acertou!' : 'Errou');
      await user.click(screen.getByRole('button', { name: i < 9 ? 'Próxima' : 'Ver resultado' }));
    }
    const fim = await screen.findByRole('region', { name: 'Resultado' });
    expect(fim).toHaveTextContent('Você acertou 8 de 10');
    expect(fim).toHaveTextContent('+8 XP');
    expect(fim).toHaveTextContent('Novo recorde!');
    await waitFor(() => expect(screen.getByTitle('Pontos de experiência')).toHaveTextContent('8'));
    expect(within(fim).getByRole('link', { name: 'Voltar aos jogos' })).toHaveAttribute('href', '/jogos');
    // jogar de novo: rodada nova, desde a primeira afirmação
    await user.click(within(fim).getByRole('button', { name: 'Jogar de novo' }));
    expect(await screen.findByText('1 de 10')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('sair no meio encerra a rodada sem XP', async () => {
    setup();
    const user = userEvent.setup();
    await comecar(user, '/jogos/radar');
    await screen.findByTestId('radar-afirmacao');
    await user.click(screen.getByRole('button', { name: 'Sair do jogo' }));
    const fim = await screen.findByRole('region', { name: 'Resultado' });
    expect(fim).toHaveTextContent('Rodada encerrada antes do fim');
    expect(fim).not.toHaveTextContent('XP');
  });
});

describe('Memória do Tico', () => {
  it('virar duas cartas do mesmo par deixa as duas abertas; achar os 6 pares termina a rodada', async () => {
    setup();
    vi.useFakeTimers({ toFake: ['Date'] }); // o servidor recusa rodada de menos de 5 s
    const user = userEvent.setup();
    await comecar(user, '/jogos/memoria', 'informatica');
    const cartas = await screen.findAllByRole('button', { name: /^Carta \d+, virada para baixo$/ });
    expect(cartas).toHaveLength(12);
    const pares = new Map<string, HTMLElement[]>();
    for (const c of cartas) pares.set(c.dataset.par!, [...(pares.get(c.dataset.par!) ?? []), c]);
    let n = 0;
    for (const [, [a, b]] of pares) {
      if (++n === 6) vi.setSystemTime(new Date(Date.now() + 30_000));
      await user.click(a!);
      await user.click(b!);
      const textos = [a!.textContent!, b!.textContent!];
      const termo = GLOSSARIO.find((t) => textos.includes(t.termo) && t.disciplina === 'informatica')!;
      expect(textos).toContain(termo.dica);
    }
    const fim = await screen.findByRole('region', { name: 'Resultado' });
    expect(fim).toHaveTextContent('Você achou os 6 pares em 6 jogadas');
    expect(fim).toHaveTextContent(`+${JOGO_XP.memoria} XP`);
  });
});

// Acha a palavra na grade (→ ↓ ↘) e devolve a primeira e a última casa.
function localizar(grade: string[], palavra: string): [number, number, number, number] {
  for (let l = 0; l < grade.length; l++) for (let c = 0; c < grade.length; c++) {
    for (const [dl, dc] of [[0, 1], [1, 0], [1, 1]] as const) {
      const lida = [...palavra].map((_, i) => grade[l + dl * i]?.[c + dc * i]).join('');
      if (lida === palavra) return [l, c, l + dl * (palavra.length - 1), c + dc * (palavra.length - 1)];
    }
  }
  throw new Error(`não achei ${palavra}`);
}

describe('Caça-palavras', () => {
  it('tocar na primeira e na última letra marca a palavra; achar todas termina', async () => {
    setup();
    const user = userEvent.setup();
    await comecar(user, '/jogos/caca-palavras', 'portugues');
    const grid = await screen.findByRole('grid', { name: 'Grade do caça-palavras' });
    const cell = (l: number, c: number) => within(grid).getByRole('gridcell', { name: new RegExp(`^Linha ${l + 1}, coluna ${c + 1}:`) });
    const grade = Array.from({ length: 10 }, (_, l) => Array.from({ length: 10 }, (_, c) => cell(l, c).textContent).join(''));
    const lista = screen.getByRole('list', { name: 'Palavras para achar' });
    const palavras = within(lista).getAllByRole('listitem').map((li) => li.dataset.palavra!);
    expect(palavras.length).toBeGreaterThanOrEqual(6);
    for (const p of palavras) expect(GLOSSARIO.some((t) => t.disciplina === 'portugues' && letras(t.termo) === p)).toBe(true);

    // seleção que não forma palavra da lista: avisa e não conta
    await user.click(cell(0, 0));
    await user.click(cell(0, 1));
    expect(await screen.findByRole('status')).toHaveTextContent(/não está na lista/);

    for (const [i, p] of palavras.entries()) {
      const [l1, c1, l2, c2] = localizar(grade, p);
      await user.click(cell(l1, c1));
      await user.click(cell(l2, c2));
      if (i < palavras.length - 1) await waitFor(() => expect(within(lista).getAllByRole('listitem')[i]).toHaveClass('is-found'));
    }
    const fim = await screen.findByRole('region', { name: 'Resultado' });
    expect(fim).toHaveTextContent('Você achou todas as palavras em');
    expect(fim).toHaveTextContent(`+${JOGO_XP.caca} XP`);
  });
});

describe('Cruzadinha', () => {
  it('preencher pelas dicas, conferir mostra o que falta; tudo certo termina', async () => {
    setup();
    const user = userEvent.setup();
    await comecar(user, '/jogos/cruzadinha', 'administrativo');
    const pistas = await screen.findAllByTestId('cruz-pista');
    expect(pistas.length).toBeGreaterThanOrEqual(5);

    // primeira conferida com a grade vazia: nada certo ainda
    await user.click(screen.getByRole('button', { name: 'Conferir' }));
    expect(await screen.findByRole('status')).toHaveTextContent(`0 de ${pistas.length} certas`);

    // A 1ª palavra é digitada tecla a tecla (como no celular); as outras são
    // preenchidas direto no campo, para o teste não passar do tempo limite.
    for (const [n, p] of pistas.entries()) {
      const termo = letras(GLOSSARIO.find((t) => t.dica === p.dataset.dica)!.termo);
      const [l, c] = [Number(p.dataset.linha), Number(p.dataset.coluna)];
      for (let i = 0; i < termo.length; i++) {
        const input = screen.getByRole('textbox', {
          name: `Linha ${l + 1 + (p.dataset.direcao === 'V' ? i : 0)}, coluna ${c + 1 + (p.dataset.direcao === 'H' ? i : 0)}`,
        }) as HTMLInputElement;
        if (n === 0) {
          await user.clear(input);
          await user.type(input, termo[i]!.toLowerCase());
        } else {
          fireEvent.change(input, { target: { value: termo[i]!.toLowerCase() } });
        }
        expect(input.value).toBe(termo[i]);
      }
    }
    await user.click(screen.getByRole('button', { name: 'Conferir' }));
    const fim = await screen.findByRole('region', { name: 'Resultado' });
    expect(fim).toHaveTextContent('Você completou a cruzadinha em');
    expect(fim).toHaveTextContent(`+${JOGO_XP.cruzadinha} XP`);
  }, 15_000);
});

describe('Desafio relâmpago', () => {
  it('continua em /jogos/desafio, com o aviso de concluir uma fase antes', async () => {
    setup();
    const user = userEvent.setup();
    renderAt('/jogos/desafio', signedIn, { progress: true });
    await user.click(await screen.findByRole('button', { name: 'Começar desafio' }));
    expect(await screen.findByText(/Conclua pelo menos uma fase/)).toBeInTheDocument();
  });
});

