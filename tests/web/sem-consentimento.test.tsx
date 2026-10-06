// @vitest-environment jsdom
// Modo temporário: VITE_EXIGIR_CONSENTIMENTO != 'true' mede todo mundo, sem aviso de cookies.
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieBanner } from '../../src/components/CookieBanner';
import { limparOrigemParaTestes, origemSalva } from '../../src/lib/atribuicao';
import { consentimentoEfetivo, limparConsentimentoParaTestes } from '../../src/lib/consentimento';
import { iniciarMarketing, pararMarketingParaTestes, track } from '../../src/lib/marketing';
import { resetMetaPixelForTests } from '../../src/lib/meta-pixel';

type Fbq = ((...args: unknown[]) => void) & { queue: unknown[][] };
const chamadas = () => ((window as unknown as { fbq?: Fbq }).fbq?.queue ?? []).map((c) => [...c]);

let parar: () => void;
beforeEach(() => {
  vi.stubEnv('VITE_EXIGIR_CONSENTIMENTO', 'false');
  limparConsentimentoParaTestes();
  limparOrigemParaTestes();
  window.history.replaceState({}, '', '/?utm_source=meta&utm_content=c001');
});
afterEach(() => {
  parar?.();
  pararMarketingParaTestes();
  resetMetaPixelForTests();
  limparOrigemParaTestes();
  cleanup();
  vi.unstubAllEnvs();
});

describe('sem exigir consentimento', () => {
  it('o consentimento efetivo é aceito, sem escolha nenhuma', () => {
    expect(consentimentoEfetivo()).toBe('aceito');
  });

  it('o pixel carrega sozinho, manda PageView e o track() envia', () => {
    parar = iniciarMarketing();
    expect(chamadas().some((c) => c[0] === 'track' && c[1] === 'PageView')).toBe(true);
    expect(track('Lead', { content_name: 'landing' })).toMatch(/^[0-9a-f-]{8,}$/);
  });

  it('guarda a origem do anúncio', () => {
    parar = iniciarMarketing();
    expect(origemSalva()?.utm_source).toBe('meta');
  });

  it('o aviso de cookies não aparece', () => {
    render(<MemoryRouter><CookieBanner /></MemoryRouter>);
    expect(screen.queryByRole('region', { name: 'Cookies e privacidade' })).toBeNull();
  });
});
