// @vitest-environment jsdom
// Eventos de comportamento (at_*): rolagem, saída da página e cliques. Só com aceite.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { definirConsentimento, limparConsentimentoParaTestes } from '../../src/lib/consentimento';
import { iniciarMarketing, pararMarketingParaTestes } from '../../src/lib/marketing';
import { reiniciarPaginaComportamento } from '../../src/lib/comportamento';
import { resetMetaPixelForTests } from '../../src/lib/meta-pixel';

type Fbq = ((...args: unknown[]) => void) & { queue: unknown[][] };
const eventos = (nome?: string) =>
  ((window as unknown as { fbq?: Fbq }).fbq?.queue ?? []).map((c) => [...c]).filter((c) => c[0] === 'trackCustom' && (!nome || c[1] === nome));

function rolarPara(scrollY: number, altura = 4000, janela = 800) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: altura });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: janela });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY });
  window.dispatchEvent(new Event('scroll'));
}

let parar: () => void;
beforeEach(() => {
  limparConsentimentoParaTestes();
  window.history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  vi.useFakeTimers();
  definirConsentimento(true);
  parar = iniciarMarketing();
});
afterEach(() => {
  parar();
  pararMarketingParaTestes();
  resetMetaPixelForTests();
  document.querySelectorAll('script[src*="connect.facebook.net"]').forEach((s) => s.remove());
  limparConsentimentoParaTestes();
  vi.useRealTimers();
});

describe('at_scroll_depth', () => {
  it('dispara cada marco uma vez só (25, 50, 75, 90), mesmo rolando de novo', () => {
    rolarPara(1000 - 800 + 400); // ~ 600+800=1400/4000 = 35% -> marco 25
    expect(eventos('at_scroll_depth').map((c) => (c[2] as { depth: number }).depth)).toEqual([25]);
    rolarPara(3000); // (3000+800)/4000 = 95% -> 50, 75, 90
    expect(eventos('at_scroll_depth').map((c) => (c[2] as { depth: number }).depth)).toEqual([25, 50, 75, 90]);
    rolarPara(0);
    rolarPara(3000);
    expect(eventos('at_scroll_depth')).toHaveLength(4);
  });

  it('trocou de tela: os marcos valem de novo', () => {
    rolarPara(3000);
    reiniciarPaginaComportamento('/hoje');
    rolarPara(3000);
    expect(eventos('at_scroll_depth')).toHaveLength(8);
  });
});

describe('at_page_exit', () => {
  it('ao sair da página, manda o tempo na página e a rolagem máxima, uma vez só', () => {
    rolarPara(1400); // 55% -> max_scroll 50
    vi.advanceTimersByTime(12_000);
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pagehide'));
    const saidas = eventos('at_page_exit');
    expect(saidas).toHaveLength(1);
    expect(saidas[0]![2]).toMatchObject({ page: '/', seconds_on_page: 12 });
    expect((saidas[0]![2] as { max_scroll: number }).max_scroll).toBeGreaterThanOrEqual(50);
  });
});

describe('cliques', () => {
  it('botão de chamada principal vira at_cta_click com o texto e a página', () => {
    document.body.innerHTML = '<a href="/cadastro" class="btn btn-primary">Começar grátis</a>';
    document.querySelector('a')!.click();
    const c = eventos('at_cta_click');
    expect(c).toHaveLength(1);
    expect(c[0]![2]).toMatchObject({ cta_text: 'Começar grátis', page: '/' });
  });

  it('link comum vira at_link_click, sem query string e marcando se é externo', () => {
    document.body.innerHTML = '<a id="a" href="/termos?email=x@y.com">Termos</a><a id="b" href="https://instagram.com/aprovatico?igsh=123">Instagram</a>';
    document.getElementById('a')!.click();
    document.getElementById('b')!.click();
    const c = eventos('at_link_click').map((x) => x[2] as Record<string, unknown>);
    expect(c[0]).toMatchObject({ link_url: '/termos', is_external: false });
    expect(c[1]).toMatchObject({ link_url: 'https://instagram.com/aprovatico', is_external: true });
    expect(JSON.stringify(c)).not.toContain('email=');
    expect(JSON.stringify(c)).not.toContain('igsh');
  });

  it('botão que não é chamada principal não gera evento', () => {
    document.body.innerHTML = '<button class="btn btn-secondary">Voltar</button>';
    document.querySelector('button')!.click();
    expect(eventos('at_cta_click')).toHaveLength(0);
    expect(eventos('at_link_click')).toHaveLength(0);
  });

  it('no máximo 20 cliques por visita', () => {
    document.body.innerHTML = '<a href="/x" class="btn btn-primary">Ir</a>';
    for (let i = 0; i < 30; i++) document.querySelector('a')!.click();
    expect(eventos('at_cta_click')).toHaveLength(20);
  });

  it('sem aceite (revogou), nada é enviado', () => {
    definirConsentimento(false);
    document.body.innerHTML = '<a href="/cadastro" class="btn btn-primary">Começar</a>';
    const antes = eventos().length;
    document.querySelector('a')!.click();
    rolarPara(3000);
    expect(eventos()).toHaveLength(antes);
  });
});
