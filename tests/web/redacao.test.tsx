// @vitest-environment jsdom
// Tela de redação contra a rota de verdade (api/redacao.ts), com a IA simulada.
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRedacaoHandler } from '../../api/redacao';
import { memoryEssays } from '../../server/essays';
import type { GradeResult } from '../../server/essay';
import { report } from '../server/essay-fixtures';
import { fakeVerify } from '../server/helpers';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, me, renderAt, session } from './render';

const tokenSession = { ...session, access_token: 'ok:u1' } as typeof session;
const signedIn = { status: 'signedIn' as const, session: tokenSession, me: { ...me, profile: { ...me.profile, preferredBanca: 'Cebraspe' } } };
const essay = Array.from({ length: 85 }, (_, i) => `termo${i}`).join(' ') + '\nAdemais, a tecnologia amplia o controle das fronteiras.';

function setup(grade: GradeResult = { ok: true, report: report() }) {
  const store = memoryEssays();
  const gradeFn = vi.fn(async () => grade);
  fakeSupabase({ getSession: async () => ({ data: { session: tokenSession } }) });
  bridgeApi({ '/api/redacao': createRedacaoHandler({ verifyToken: fakeVerify, store, grade: gradeFn }) });
  return { store, gradeFn };
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('redação', () => {
  it('começa na banca do perfil; mínimo de 80 palavras; corrige e mostra o relatório com trechos marcados', async () => {
    const { gradeFn } = setup();
    const user = userEvent.setup();
    const { router } = renderAt('/redacao', signedIn);
    expect(await screen.findByRole('radio', { name: /Cebraspe/ })).toBeChecked();
    expect(screen.getByText(/disponível agora/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Corrigir com IA' });
    const box = screen.getByLabelText('Seu texto');
    fireEvent.change(box, { target: { value: 'curto demais' } });
    expect(screen.getByText(/2 palavras · mínimo 80/)).toBeInTheDocument();
    expect(button).toBeDisabled();

    fireEvent.change(box, { target: { value: essay } });
    await user.click(button);
    expect(await screen.findByLabelText('Nota 78 de 100')).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/redacao\/.+/);
    expect(gradeFn).toHaveBeenCalledWith(expect.objectContaining({ bank: 'Cebraspe', text: essay }));
    const mark = screen.getByText('a tecnologia amplia o controle das fronteiras', { selector: 'mark' });
    expect(mark).toHaveAttribute('id', 'trecho-1');
    expect(screen.getByRole('progressbar', { name: 'Tema e tese: 16 de 20' })).toBeInTheDocument();
    expect(screen.getByText('Traga dados concretos.')).toBeInTheDocument();
  });

  it('depois da correção grátis: histórico, aviso da próxima data e botão travado', async () => {
    const { store } = setup();
    await store.reserve('u1', { topicId: 'cebraspe-seguranca', topicTitle: 'Segurança integrada', banca: 'Cebraspe', content: essay }, null, new Date());
    await store.complete(store.rows[0]!.id, report(), 78);
    renderAt('/redacao', signedIn);
    const history = await screen.findByRole('region', { name: 'Suas redações' });
    expect(within(history).getByRole('link', { name: /Segurança integrada/ })).toHaveAttribute('href', `/redacao/${store.rows[0]!.id}`);
    expect(screen.getByText(/próxima correção em/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Correções ilimitadas no PRO' })).toHaveAttribute('href', '/planos');
    expect(screen.getByRole('button', { name: 'Corrigir com IA' })).toBeDisabled();
  });

  it('rascunho fica salvo por tema; trocar de banca troca o tema e o guia', async () => {
    setup();
    const user = userEvent.setup();
    renderAt('/redacao', signedIn);
    fireEvent.change(await screen.findByLabelText('Seu texto'), { target: { value: 'meu rascunho' } });
    await new Promise((r) => setTimeout(r, 450));
    await user.click(screen.getByRole('radio', { name: /FGV/ }));
    expect(screen.getByText(/Como a FGV corrige/)).toBeInTheDocument();
    expect(screen.getByLabelText('Seu texto')).toHaveValue('');
    cleanup();
    renderAt('/redacao', signedIn);
    expect(await screen.findByLabelText('Seu texto')).toHaveValue('meu rascunho');
  });

  it('falha da IA: explica, mantém o texto e não desconta', async () => {
    setup({ ok: false, code: 'IA_LIMITE_API', message: 'Limite.' });
    const user = userEvent.setup();
    renderAt('/redacao', signedIn);
    fireEvent.change(await screen.findByLabelText('Seu texto'), { target: { value: essay } });
    await user.click(screen.getByRole('button', { name: 'Corrigir com IA' }));
    expect(await screen.findByText(/Nenhuma correção foi descontada/)).toBeInTheDocument();
    expect(screen.getByLabelText('Seu texto')).toHaveValue(essay);
    expect(screen.getByRole('button', { name: 'Corrigir com IA' })).toBeEnabled();
  });
});
