// @vitest-environment jsdom
// Questão de prova com contexto (situação hipotética, proposição, comando da
// banca) + item: o contexto vem em texto corrido e o item em destaque.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Enunciado } from '../../src/game/Enunciado';

afterEach(cleanup);

describe('Enunciado', () => {
  it('sem contexto: só o título com o enunciado', () => {
    render(<Enunciado id="q" texto="Quanto é 2 + 2?" />);
    expect(screen.getByRole('heading', { name: 'Quanto é 2 + 2?' })).toHaveAttribute('id', 'q');
    expect(document.querySelector('.quiz-contexto')).toBeNull();
  });

  it('com contexto: o contexto em parágrafos e o item (último bloco) no título', () => {
    render(<Enunciado id="q" texto={'P: se chover, não saio.\n\nJulgue o item.\n\nA tabela-verdade de P tem 4 linhas.'} />);
    expect(screen.getByRole('heading', { name: 'A tabela-verdade de P tem 4 linhas.' })).toHaveAttribute('id', 'q');
    const ctx = document.querySelector('.quiz-contexto')!;
    expect(ctx.querySelectorAll('p')).toHaveLength(2);
    expect(ctx).toHaveTextContent('P: se chover, não saio.');
  });
});
