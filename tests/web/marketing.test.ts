// @vitest-environment jsdom
// Marketing: o consentimento liga e desliga tudo; track() é o único caminho para eventos.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { definirConsentimento, limparConsentimentoParaTestes } from '../../src/lib/consentimento';
import { iniciarMarketing, track, pararMarketingParaTestes } from '../../src/lib/marketing';
import { resetMetaPixelForTests } from '../../src/lib/meta-pixel';
import { limparOrigemParaTestes, origemSalva } from '../../src/lib/atribuicao';

type Fbq = ((...args: unknown[]) => void) & { queue: unknown[][] };
const fbq = () => (window as unknown as { fbq?: Fbq }).fbq;
const chamadas = () => (fbq()?.queue ?? []).map((c) => [...c]);

let parar: () => void;
beforeEach(() => {
  limparConsentimentoParaTestes();
  limparOrigemParaTestes();
  window.history.replaceState({}, '', '/?utm_source=meta&utm_content=c001-cronograma-v1');
});
afterEach(() => {
  parar?.();
  pararMarketingParaTestes();
  resetMetaPixelForTests();
  document.querySelectorAll('script[src*="connect.facebook.net"]').forEach((s) => s.remove());
  limparConsentimentoParaTestes();
});

describe('marketing e consentimento', () => {
  it('pendente: não carrega o pixel, não envia nada e track() não faz nada', () => {
    parar = iniciarMarketing();
    expect(fbq()).toBeUndefined();
    expect(track('Lead', {})).toBeNull();
  });

  it('pendente: já guarda a origem do anúncio, só na aba', () => {
    parar = iniciarMarketing();
    expect(origemSalva()?.utm_content).toBe('c001-cronograma-v1');
    expect(document.cookie).not.toContain('at_first_touch');
  });

  it('recusado: nada carrega', () => {
    definirConsentimento(false);
    parar = iniciarMarketing();
    expect(fbq()).toBeUndefined();
    expect(track('Lead', {})).toBeNull();
  });

  it('aceitar depois: carrega o pixel, conta a visita e persiste a origem', () => {
    parar = iniciarMarketing();
    definirConsentimento(true);
    expect(chamadas().some((c) => c[0] === 'init')).toBe(true);
    expect(chamadas().some((c) => c[1] === 'PageView')).toBe(true);
    expect(document.cookie).toContain('at_first_touch');
  });

  it('já aceito ao abrir o site: carrega direto', () => {
    definirConsentimento(true);
    parar = iniciarMarketing();
    expect(chamadas().some((c) => c[0] === 'init')).toBe(true);
  });

  it('track() devolve o event_id usado e manda o evento padrão com a origem do anúncio', () => {
    definirConsentimento(true);
    parar = iniciarMarketing();
    const id = track('InitiateCheckout', { value: 29.9, currency: 'BRL' });
    expect(id).toBeTruthy();
    expect(chamadas()).toContainEqual(['track', 'InitiateCheckout', { value: 29.9, currency: 'BRL' }, { eventID: id }]);
  });

  it('track() aceita um event_id já escolhido (para parear com o servidor depois)', () => {
    definirConsentimento(true);
    parar = iniciarMarketing();
    expect(track('CompleteRegistration', { status: 'email' }, { eventId: 'fixo-123' })).toBe('fixo-123');
    expect(chamadas()).toContainEqual(['track', 'CompleteRegistration', { status: 'email' }, { eventID: 'fixo-123' }]);
  });

  it('eventos próprios (at_*) vão como trackCustom', () => {
    definirConsentimento(true);
    parar = iniciarMarketing();
    track('at_demo_question_viewed', {}, { proprio: true });
    expect(chamadas().some((c) => c[0] === 'trackCustom' && c[1] === 'at_demo_question_viewed')).toBe(true);
  });

  it('revogar: para de enviar, apaga os cookies e a origem do aparelho', () => {
    definirConsentimento(true);
    parar = iniciarMarketing();
    definirConsentimento(false);
    expect(chamadas()).toContainEqual(['consent', 'revoke']);
    expect(track('Lead', {})).toBeNull();
    expect(document.cookie).not.toContain('at_first_touch');
    expect(localStorage.getItem('aprova-tico:first-touch')).toBeNull();
  });
});
