// @vitest-environment jsdom
// Pixel da Meta: carrega uma vez, conta a primeira visita e cada troca de tela.
import { afterEach, describe, expect, it } from 'vitest';
import { META_PIXEL_ID, iniciarMetaPixel, registrarVisita, resetMetaPixelForTests } from '../../src/lib/meta-pixel';

type Fbq = ((...args: unknown[]) => void) & { queue: unknown[][] };
const fbq = () => (window as unknown as { fbq: Fbq }).fbq;

afterEach(() => {
  resetMetaPixelForTests();
  document.querySelectorAll('script[src*="connect.facebook.net"]').forEach((s) => s.remove());
});

describe('Pixel da Meta (Facebook)', () => {
  it('carrega o script do Facebook, inicia o pixel e conta a primeira visita', () => {
    iniciarMetaPixel();
    const script = document.querySelector<HTMLScriptElement>('script[src="https://connect.facebook.net/en_US/fbevents.js"]');
    expect(script).not.toBeNull();
    expect(script!.async).toBe(true);
    expect(fbq().queue.map((c) => [...c])).toEqual([
      ['init', META_PIXEL_ID],
      ['track', 'PageView'],
    ]);
  });

  it('não carrega duas vezes', () => {
    iniciarMetaPixel();
    iniciarMetaPixel();
    expect(document.querySelectorAll('script[src*="connect.facebook.net"]')).toHaveLength(1);
    expect(fbq().queue.filter((c) => c[0] === 'init')).toHaveLength(1);
  });

  it('conta uma nova visita quando o aluno troca de tela, mas não quando só a mesma tela redesenha', () => {
    iniciarMetaPixel();
    registrarVisita('/');
    registrarVisita('/');
    registrarVisita('/hoje');
    expect(fbq().queue.filter((c) => c[1] === 'PageView')).toHaveLength(2);
  });

  it('antes de iniciar, trocar de tela não faz nada (nem quebra)', () => {
    expect(() => registrarVisita('/hoje')).not.toThrow();
    expect((window as unknown as { fbq?: Fbq }).fbq).toBeUndefined();
  });
});
