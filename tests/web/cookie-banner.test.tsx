// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CookieBanner } from '../../src/components/CookieBanner';
import { consentimentoAtual, limparConsentimentoParaTestes } from '../../src/lib/consentimento';

beforeEach(() => limparConsentimentoParaTestes());
afterEach(() => { cleanup(); limparConsentimentoParaTestes(); });

const ver = () => render(<MemoryRouter><CookieBanner /></MemoryRouter>);

describe('aviso de cookies', () => {
  it('aparece enquanto o aluno não escolheu, com Aceitar e Recusar com o mesmo destaque', () => {
    ver();
    expect(screen.getByRole('region', { name: 'Cookies e privacidade' })).toBeInTheDocument();
    const aceitar = screen.getByRole('button', { name: 'Aceitar' });
    const recusar = screen.getByRole('button', { name: 'Recusar' });
    expect(aceitar.className).toBe(recusar.className);
    expect(screen.getByRole('link', { name: /política de privacidade/i })).toHaveAttribute('href', '/privacidade#cookies');
  });

  it('Aceitar grava o aceite e some', async () => {
    ver();
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(consentimentoAtual()).toBe('aceito');
    expect(screen.queryByRole('region', { name: 'Cookies e privacidade' })).toBeNull();
  });

  it('Recusar grava a recusa e some', async () => {
    ver();
    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(consentimentoAtual()).toBe('recusado');
    expect(screen.queryByRole('region', { name: 'Cookies e privacidade' })).toBeNull();
  });

  it('quem já escolheu não vê o aviso de novo', () => {
    localStorage.setItem('aprova-tico:consent-marketing', JSON.stringify({ v: 1, aceito: false, em: new Date().toISOString() }));
    ver();
    expect(screen.queryByRole('region', { name: 'Cookies e privacidade' })).toBeNull();
  });
});
