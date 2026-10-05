// @vitest-environment jsdom
// Telas do app chegam sob demanda: quem só abre a página inicial não baixa o
// app inteiro. Enquanto a tela carrega, aparece "Carregando…".
import type { ReactElement } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { lazyPage, preloadPages } from '../../src/app/lazyPage';

describe('tela sob demanda', () => {
  it('mostra "Carregando…" e depois a tela; já carregada, aparece direto', async () => {
    let resolve!: (c: () => ReactElement) => void;
    const Tela = lazyPage(() => new Promise((r) => { resolve = r; }));
    const primeira = render(<Tela />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    await act(async () => resolve(() => <h1>Minha tela</h1>));
    expect(await screen.findByRole('heading', { name: 'Minha tela' })).toBeInTheDocument();
    primeira.unmount();
    render(<Tela />);
    expect(screen.getByRole('heading', { name: 'Minha tela' })).toBeInTheDocument();
  });

  it('preloadPages carrega antes, e a tela aparece sem esperar', async () => {
    const Tela = lazyPage(async () => () => <h1>Outra tela</h1>);
    await preloadPages();
    render(<Tela />);
    expect(screen.getByRole('heading', { name: 'Outra tela' })).toBeInTheDocument();
  });
});
