// @vitest-environment jsdom
// Tela do professor (/professor) contra a rota de verdade (api/professor.ts
// + store em memória): ver a questão com o gabarito, aprovar, pedir correção.
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { createProfessorHandler } from '../../api/professor';
import type { Questao } from '../../content/types';
import { memoryProfessor } from '../../server/professor';
import { fakeVerify } from '../server/helpers';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

const q = (id: string, enunciado: string): Questao & { status: 'revisao' } => ({
  id, disciplina: 'portugues', assunto: 'Crase', enunciado, alternativas: ['Vou à escola.', 'Vou a escola.'],
  correta: 0, dificuldade: 1, explicacao: 'Ir a + a escola = à.', fonte: { tipo: 'autoral', estilo: 'FGV' }, status: 'revisao',
});

function setup(user: string) {
  const tokenSession = { ...session, access_token: `ok:${user}` } as typeof session;
  const store = memoryProfessor({
    revisores: [{ email: 'prof@teste.dev', nome: 'Profa. Ana', disciplinas: ['portugues'] }],
    trilha: [],
    banco: [q('bn-1', 'Assinale a frase com crase correta.'), q('bn-2', 'Em qual frase a crase é obrigatória?')],
  });
  fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
  bridgeApi({ '/api/professor': createProfessorHandler({ verifyToken: fakeVerify, store }) });
  renderAt('/professor', { status: 'signedIn', session: tokenSession, me });
  return store;
}

afterEach(cleanup);

describe('revisão por professor', () => {
  it('mostra a questão com gabarito e explicação; aprovar libera para os alunos e passa para a próxima', async () => {
    const store = setup('prof');
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { level: 1, name: 'Revisão de questões' })).toBeInTheDocument();
    expect(screen.getByText(/2 para revisar/)).toBeInTheDocument();
    expect(screen.getByText('Assinale a frase com crase correta.')).toBeInTheDocument();
    expect(screen.getByText('Gabarito')).toBeInTheDocument();
    expect(screen.getByText('Ir a + a escola = à.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByText('Em qual frase a crase é obrigatória?')).toBeInTheDocument();
    expect(screen.getByText(/Aprovada\. Ela já pode aparecer para os alunos/)).toBeInTheDocument();
    expect(screen.getByText(/1 para revisar/)).toBeInTheDocument();
    expect(store.status('bn-1')).toBe('ativa');
  });

  it('pedir correção exige o comentário; a questão vai para "Correção pedida"', async () => {
    const store = setup('prof');
    const user = userEvent.setup();
    await screen.findByText('Assinale a frase com crase correta.');
    await user.click(screen.getByRole('button', { name: 'Pedir correção' }));
    const enviar = screen.getByRole('button', { name: 'Enviar pedido de correção' });
    expect(enviar).toBeDisabled();
    await user.type(screen.getByLabelText('O que precisa mudar?'), 'A alternativa B também pode estar certa.');
    await user.click(enviar);
    await waitFor(() => expect(store.registros).toHaveLength(1));
    expect(store.registros[0]).toMatchObject({ questionId: 'bn-1', acao: 'corrigir' });
    expect(store.status('bn-1')).toBe('revisao');
    expect(await screen.findByRole('button', { name: /Correção pedida \(1\)/ })).toBeInTheDocument();
  });

  it('quem não é professor revisor vê um aviso e nada da fila', async () => {
    setup('aluno');
    expect(await screen.findByText(/só para os professores/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
  });
});
