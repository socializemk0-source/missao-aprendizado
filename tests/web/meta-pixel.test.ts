// @vitest-environment jsdom
// Pixel da Meta: só existe depois do aceite; mede visitas e eventos com event_id; some quando o aluno revoga.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { META_PIXEL_ID, iniciarMetaPixel, registrarVisita, enviarEventoMeta, revogarMetaPixel, resetMetaPixelForTests } from '../../src/lib/meta-pixel';

type Fbq = ((...args: unknown[]) => void) & { queue: unknown[][] };
const fbq = () => (window as unknown as { fbq: Fbq }).fbq;
const chamadas = () => fbq().queue.map((c) => [...c]);

beforeEach(() => {
  document.cookie = '_fbp=fb.1.1.1; path=/';
  document.cookie = '_fbc=fb.1.1.abc; path=/';
});
afterEach(() => {
  resetMetaPixelForTests();
  document.querySelectorAll('script[src*="connect.facebook.net"]').forEach((s) => s.remove());
});

describe('Pixel da Meta (Facebook)', () => {
  it('antes de iniciar (sem aceite), nada é carregado nem enviado', () => {
    registrarVisita('/hoje');
    enviarEventoMeta('Lead', {}, 'abc');
    expect((window as unknown as { fbq?: Fbq }).fbq).toBeUndefined();
    expect(document.querySelectorAll('script[src*="connect.facebook.net"]')).toHaveLength(0);
  });

  it('ao iniciar, carrega o script, inicia o pixel e conta a primeira visita com event_id', () => {
    iniciarMetaPixel();
    const script = document.querySelector<HTMLScriptElement>('script[src="https://connect.facebook.net/en_US/fbevents.js"]');
    expect(script).not.toBeNull();
    expect(script!.async).toBe(true);
    const c = chamadas();
    expect(c[0]).toEqual(['init', META_PIXEL_ID]);
    expect(c[1]!.slice(0, 2)).toEqual(['track', 'PageView']);
    expect((c[1]![3] as { eventID: string }).eventID).toMatch(/^[0-9a-f-]{8,}$/);
  });

  it('não carrega duas vezes', () => {
    iniciarMetaPixel();
    iniciarMetaPixel();
    expect(document.querySelectorAll('script[src*="connect.facebook.net"]')).toHaveLength(1);
    expect(chamadas().filter((c) => c[0] === 'init')).toHaveLength(1);
  });

  it('conta uma nova visita quando o aluno troca de tela, mas não quando só a mesma tela redesenha', () => {
    iniciarMetaPixel();
    registrarVisita('/');
    registrarVisita('/');
    registrarVisita('/hoje');
    expect(chamadas().filter((c) => c[1] === 'PageView')).toHaveLength(2);
  });

  it('envia evento padrão com track e evento próprio com trackCustom, sempre com o event_id dado', () => {
    iniciarMetaPixel();
    enviarEventoMeta('Lead', { content_name: 'home' }, 'id-1');
    enviarEventoMeta('at_scroll_depth', { depth: 50 }, 'id-2', true);
    const c = chamadas();
    expect(c).toContainEqual(['track', 'Lead', { content_name: 'home' }, { eventID: 'id-1' }]);
    expect(c).toContainEqual(['trackCustom', 'at_scroll_depth', { depth: 50 }, { eventID: 'id-2' }]);
  });

  it('ao revogar: para de enviar, apaga os cookies _fbp e _fbc e avisa a Meta', () => {
    iniciarMetaPixel();
    revogarMetaPixel();
    expect(chamadas()).toContainEqual(['consent', 'revoke']);
    expect(document.cookie).not.toContain('_fbp');
    expect(document.cookie).not.toContain('_fbc');
    const antes = chamadas().length;
    enviarEventoMeta('Lead', {}, 'x');
    registrarVisita('/outra');
    expect(chamadas()).toHaveLength(antes);
  });

  it('depois de revogar, um novo aceite volta a medir sem carregar o script de novo', () => {
    iniciarMetaPixel();
    revogarMetaPixel();
    iniciarMetaPixel();
    expect(document.querySelectorAll('script[src*="connect.facebook.net"]')).toHaveLength(1);
    expect(chamadas()).toContainEqual(['consent', 'grant']);
    const antes = chamadas().length;
    enviarEventoMeta('Lead', {}, 'y');
    expect(chamadas().length).toBe(antes + 1);
  });
});
