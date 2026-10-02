// @vitest-environment jsdom
// Marco 1 pela tela, contra o motor de verdade (api/game.ts + store em
// memória): onboarding, "Hoje", domínio por assunto e agenda da revisão.
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game';
import { questao } from '../../content/trilha';
import { saveStudyProfile } from '../../server/estudo';
import { answer } from '../../server/game';
import { memoryGameStore } from '../../server/game-memory';
import type { PerfilEstudo } from '../../shared/estudo';
import { fakeVerify } from '../server/helpers';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;
const signedIn = { status: 'signedIn' as const, session: tokenSession, me };

const PERFIL: PerfilEstudo = {
  prova: 'INSS — Técnico do Seguro Social', banca: 'Cebraspe', dataProva: null,
  minutosDia: 30, nivel: 'iniciante', disciplinas: ['portugues', 'rlm'],
};

function setup() {
  const store = memoryGameStore();
  fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
  bridgeApi({ '/api/game': createGameHandler({ verifyToken: fakeVerify, store }) });
  return store;
}

const errar = (store: ReturnType<typeof memoryGameStore>, id: string) =>
  answer(store, 'u1', { questionId: id, choice: (questao(id)!.correta + 1) % questao(id)!.alternativas.length, mode: 'trilha' });

afterEach(cleanup);

describe('onboarding', () => {
  it('sem plano, "Hoje" leva ao onboarding; 5 passos montam o plano e voltam para "Hoje"', async () => {
    const store = setup();
    const user = userEvent.setup();
    const { router } = renderAt('/hoje', signedIn, { progress: true });
    expect(await screen.findByRole('heading', { name: 'Qual concurso você vai prestar?' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/comecar');
    expect(screen.getByText(/Passo 1 de 5/)).toBeInTheDocument();

    // não avança sem responder
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Conte qual concurso');

    await user.type(screen.getByLabelText('Concurso ou cargo'), 'TRT — Técnico Judiciário');
    await user.click(screen.getByRole('radio', { name: 'FCC' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByRole('heading', { name: 'Quando é a prova?' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Ainda não tem data/ }));
    expect(screen.getByLabelText('Data da prova')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await user.click(screen.getByRole('radio', { name: '1 hora' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await user.click(screen.getByRole('radio', { name: /Começando agora/ }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByRole('heading', { name: 'Quais matérias caem na sua prova?' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Direito Constitucional' }));
    await user.click(screen.getByRole('checkbox', { name: 'Direito Administrativo' }));
    await user.click(screen.getByRole('button', { name: 'Montar meu plano' }));

    expect(await screen.findByRole('heading', { name: 'O que estudar hoje' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/hoje');
    expect(screen.getByText(/TRT — Técnico Judiciário · FCC · sem data de prova/)).toBeInTheDocument();
    expect(screen.getByText('0 de 20 questões hoje')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Começar: Avance 1 fase na trilha' })).toHaveAttribute('href', '/fase/fase-01-1');

    const salvo = await store.withUser('u1', (tx) => tx.studyProfile());
    expect(salvo).toEqual({
      prova: 'TRT — Técnico Judiciário', banca: 'FCC', dataProva: null, minutosDia: 60, nivel: 'iniciante',
      disciplinas: ['portugues', 'rlm', 'informatica'],
    });
  });

  it('"Ajustar plano" abre o onboarding já preenchido', async () => {
    const store = setup();
    await saveStudyProfile(store, 'u1', PERFIL);
    const user = userEvent.setup();
    renderAt('/hoje', signedIn, { progress: true });
    await user.click(await screen.findByRole('link', { name: 'Ajustar plano' }));
    expect(await screen.findByText(/Ajustar meu plano/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Concurso ou cargo')).toHaveValue(PERFIL.prova));
    expect(screen.getByRole('radio', { name: 'Cebraspe' })).toBeChecked();
  });
});

describe('Hoje', () => {
  it('mostra tarefas, como estou, onde erro, quanto falta e a semana', async () => {
    const store = setup();
    await saveStudyProfile(store, 'u1', { ...PERFIL, dataProva: null });
    await errar(store, 'pt-acent-1');
    renderAt('/hoje', signedIn, { progress: true });

    const tarefas = await screen.findByRole('list', { name: 'Tarefas de hoje' });
    const itens = within(tarefas).getAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Revise seus erros');
    expect(within(itens[0]!).getByRole('link', { name: 'Começar: Revise seus erros' })).toHaveAttribute('href', '/revisar');
    expect(screen.getByText('1 de 10 questões hoje')).toBeInTheDocument();

    const como = screen.getByRole('region', { name: 'Como estou' });
    expect(within(como).getByText('Acerto na semana').nextSibling).toHaveTextContent('0%');
    const onde = screen.getByRole('region', { name: 'Onde erro' });
    expect(within(onde).getByText('Acentuação gráfica')).toBeInTheDocument();
    expect(within(onde).getByRole('link', { name: 'Praticar Português' })).toHaveAttribute('href', '/praticar/portugues');
    const falta = screen.getByRole('region', { name: 'Quanto falta' });
    expect(falta).toHaveTextContent('0 de 8 fases');
    const semana = within(screen.getByRole('region', { name: 'Sua semana' })).getAllByRole('listitem');
    expect(semana).toHaveLength(7);
    expect(semana[0]).toHaveTextContent('Hoje');
  });

  it('o menu começa por "Hoje"', async () => {
    setup();
    renderAt('/jogar', signedIn, { progress: true });
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(within(nav).getAllByRole('link')[1]).toHaveAccessibleName('Hoje');
  });
});

describe('domínio e revisão', () => {
  it('Disciplinas mostra o domínio por assunto com a situação', async () => {
    const store = setup();
    await errar(store, 'pt-acent-1');
    renderAt('/disciplinas', signedIn, { progress: true });
    const dominio = await screen.findByRole('region', { name: 'Domínio por assunto' });
    const item = within(dominio).getByText('Acentuação gráfica').closest('li')!;
    expect(item).toHaveTextContent('Domínio 0% · 1 de 4 questões vistas');
    expect(item).toHaveTextContent('Fraco');
    expect(within(dominio).getByText('Crase').closest('li')).toHaveTextContent('Ainda não visto');
  });

  it('revisão: acertou → some de hoje e a tela mostra quando volta', async () => {
    const store = setup();
    const q = questao('pt-acent-1')!;
    await errar(store, q.id);
    await answer(store, 'u1', { questionId: q.id, choice: q.correta, mode: 'revisar' });
    renderAt('/revisar', signedIn, { progress: true });
    expect(await screen.findByRole('heading', { name: 'Nenhuma revisão para hoje' })).toBeInTheDocument();
    expect(screen.getByText('Próximas revisões: amanhã 1')).toBeInTheDocument();
  });
});
