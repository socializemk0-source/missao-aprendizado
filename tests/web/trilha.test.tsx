// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase, me, renderAt, session } from './render';

const signedIn = { status: 'signedIn' as const, session, me };

const question = {
  id: 'port-crase-001',
  subject: 'portugues',
  topic: 'Crase',
  difficulty: 1,
  statement: 'Assinale a alternativa em que a crase está correta.',
  options: ['Fui à escola.', 'Comecei à estudar.', 'Cara à cara.', 'Refiro-me à todos.'],
  style: 'FGV',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  fakeSupabase({ getSession: vi.fn(async () => ({ data: { session } })) });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('treino na trilha', () => {
  it('escolhe a matéria, responde e o servidor confere: acerto mostra a explicação', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith('/api/questions')
        ? json({ questions: [question] })
        : json({ correct: true, correctIndex: 0, explanation: 'Ir a + a escola = à.', legalBasis: null }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderAt('/jogar', signedIn);

    await user.click(screen.getByRole('button', { name: 'Português' }));
    expect(await screen.findByRole('heading', { name: question.statement })).toBeInTheDocument();
    const [listUrl, listInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(listUrl).toBe('/api/questions?subject=portugues&limit=5');
    expect(new Headers(listInit.headers).get('Authorization')).toBe('Bearer tok');

    const conferir = screen.getByRole('button', { name: 'Conferir resposta' });
    expect(conferir).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Fui à escola/ }));
    await user.click(conferir);

    expect(await screen.findByText('Acertou!')).toBeInTheDocument();
    expect(screen.getByText('Ir a + a escola = à.')).toBeInTheDocument();
    const [answerUrl, answerInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(answerUrl).toBe('/api/answer');
    expect(JSON.parse(answerInit.body as string)).toEqual({ questionId: question.id, choice: 0 });

    await user.click(screen.getByRole('button', { name: 'Ver resultado' }));
    expect(screen.getByText('Você acertou 1 de 1.')).toBeInTheDocument();
  });

  it('erro: mostra a letra certa e a base legal', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.startsWith('/api/questions')
        ? json({ questions: [question] })
        : json({ correct: false, correctIndex: 0, explanation: 'Explicação.', legalBasis: 'CF/88, art. 5º' }),
    ));
    const user = userEvent.setup();
    renderAt('/jogar', signedIn);
    await user.click(screen.getByRole('button', { name: 'Português' }));
    await user.click(await screen.findByRole('radio', { name: /Comecei à estudar/ }));
    await user.click(screen.getByRole('button', { name: 'Conferir resposta' }));

    const feedback = await screen.findByText(/Não foi dessa vez/);
    expect(feedback).toHaveTextContent('letra A');
    expect(screen.getByText('Base legal: CF/88, art. 5º')).toBeInTheDocument();
    expect(within(screen.getByRole('radiogroup')).getByRole('radio', { name: /Comecei/ })).toHaveClass('is-wrong');
  });

  it('matéria sem questões publicadas avisa que estão em revisão', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ questions: [] })));
    const user = userEvent.setup();
    renderAt('/jogar', signedIn);
    await user.click(screen.getByRole('button', { name: 'Informática' }));
    expect(await screen.findByText(/questões de Informática estão em revisão/)).toBeInTheDocument();
  });

  it('falha ao carregar mostra a mensagem do servidor', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'Faça login para continuar.' }, 401)));
    const user = userEvent.setup();
    renderAt('/jogar', signedIn);
    await user.click(screen.getByRole('button', { name: 'Português' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Faça login para continuar.');
  });
});
