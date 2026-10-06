// @vitest-environment jsdom
// Consentimento de cookies de marketing: guarda a escolha no aparelho e avisa quem depende dela.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consentimentoAtual, definirConsentimento, aoMudarConsentimento, limparConsentimentoParaTestes } from '../../src/lib/consentimento';

beforeEach(() => limparConsentimentoParaTestes());
afterEach(() => vi.restoreAllMocks());

describe('consentimento de marketing', () => {
  it('sem escolha, está pendente (e nada de marketing pode rodar)', () => {
    expect(consentimentoAtual()).toBe('pendente');
  });

  it('guarda aceite e recusa com a data da escolha', () => {
    definirConsentimento(true);
    expect(consentimentoAtual()).toBe('aceito');
    const salvo = JSON.parse(localStorage.getItem('aprova-tico:consent-marketing')!);
    expect(salvo.aceito).toBe(true);
    expect(Number.isNaN(Date.parse(salvo.em))).toBe(false);
    definirConsentimento(false);
    expect(consentimentoAtual()).toBe('recusado');
  });

  it('avisa quem acompanha a escolha, e deixa de avisar depois de cancelar', () => {
    const ouvinte = vi.fn();
    const cancelar = aoMudarConsentimento(ouvinte);
    definirConsentimento(true);
    expect(ouvinte).toHaveBeenLastCalledWith('aceito');
    cancelar();
    definirConsentimento(false);
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('conteúdo guardado corrompido conta como pendente, sem quebrar', () => {
    localStorage.setItem('aprova-tico:consent-marketing', '{não é json');
    expect(consentimentoAtual()).toBe('pendente');
  });

  it('se o navegador bloqueia o armazenamento, continua pendente e não quebra', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(consentimentoAtual()).toBe('pendente');
  });
});
