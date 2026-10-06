// @vitest-environment jsdom
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { escolherCookies, limparCookiesParaTestes } from '../../src/lib/consentimento';
import { ligarMedicaoParaTestes, registrar } from '../../src/lib/medicao';
import { PIXEL_SCRIPT, enderecoSensivel, ligarPixel, paramsMeta, reiniciarPixelParaTestes } from '../../src/lib/pixel';
import { setSupabaseForTests } from '../../src/lib/supabase';

const ID = '999000111222333'; // id de teste (o real fica só na Vercel, em META_PIXEL_ID)
const fila = () => ((window as unknown as { fbq?: { queue: unknown[][] } }).fbq?.queue ?? []);
const script = () => document.querySelector(`script[src="${PIXEL_SCRIPT}"]`);

function config(pixel: string | null = ID) {
  const auth = { getSession: async () => ({ data: { session: null } }) };
  setSupabaseForTests({ auth } as unknown as SupabaseClient, null, pixel);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ pendentes: [] }), { status: 200 })));
}

beforeEach(() => {
  limparCookiesParaTestes();
  reiniciarPixelParaTestes();
  ligarMedicaoParaTestes(true);
});
afterEach(() => {
  vi.unstubAllGlobals();
  ligarMedicaoParaTestes(false);
  reiniciarPixelParaTestes();
  window.history.replaceState(null, '', '/');
});

describe('pixel da Meta', () => {
  it('sem aceite: o script nem carrega e nada é enviado', async () => {
    config();
    await ligarPixel();
    registrar('PageView', { pagina: '/' });
    expect(script()).toBeNull();
    expect(fila()).toEqual([]);
  });

  it('recusou: continua sem nada', async () => {
    config();
    escolherCookies('recusado');
    await ligarPixel();
    registrar('ViewContent', { content_name: 'planos' });
    expect(script()).toBeNull();
  });

  it('com aceite: carrega só o script da Meta, sem eventos automáticos nem dados do aluno, e cada evento leva o event_id', async () => {
    config();
    escolherCookies('aceito');
    await ligarPixel();
    registrar('InitiateCheckout', { plano: 'annual' });
    expect(script()).not.toBeNull();
    const q = fila();
    expect(q[0]).toEqual(['consent', 'grant']);
    expect(q[1]).toEqual(['set', 'autoConfig', false, ID]);
    expect(q[2]).toEqual(['init', ID]); // nenhum dado do aluno no init
    const [cmd, nome, params, opts] = q[3] as [string, string, Record<string, unknown>, { eventID: string }];
    expect([cmd, nome]).toEqual(['track', 'InitiateCheckout']);
    expect(params).toMatchObject({ value: 239.9, currency: 'BRL', content_name: 'annual' });
    expect(opts.eventID).toMatch(/^[\w-]{8,}$/);
    expect((window as unknown as { fbq: { disablePushState: boolean } }).fbq.disablePushState).toBe(true);
  });

  it('eventos personalizados vão como trackCustom', async () => {
    config();
    escolherCookies('aceito');
    await ligarPixel();
    registrar('DemoQuestionAnswered', { acertou: 'sim' });
    expect(fila().at(-1)!.slice(0, 3)).toEqual(['trackCustom', 'DemoQuestionAnswered', { acertou: 'sim' }]);
  });

  it('aceitou depois: carrega na hora e conta a página atual; recusou depois: revoga e para de enviar', async () => {
    config();
    await ligarPixel();
    expect(script()).toBeNull();
    escolherCookies('aceito');
    expect(script()).not.toBeNull();
    expect(fila().some((c) => c[0] === 'track' && c[1] === 'PageView')).toBe(true);
    escolherCookies('recusado');
    expect(fila().at(-1)).toEqual(['consent', 'revoke']);
    const antes = fila().length;
    registrar('ViewContent', { content_name: 'planos' });
    expect(fila()).toHaveLength(antes);
  });

  it('endereço com segredo (volta do login, troca de senha) nunca vai para a Meta', async () => {
    config();
    escolherCookies('aceito');
    await ligarPixel();
    window.history.replaceState(null, '', '/redefinir-senha#access_token=abc&type=recovery');
    const antes = fila().length;
    registrar('PageView', { pagina: '/redefinir-senha' });
    expect(fila()).toHaveLength(antes);
    expect(enderecoSensivel('https://aprovatico.com.br/entrar?code=xyz')).toBe(true);
    expect(enderecoSensivel('https://aprovatico.com.br/?utm_source=meta&fbclid=IwAR0')).toBe(false);
  });

  it('sem META_PIXEL_ID configurado: nada carrega, mesmo com aceite', async () => {
    config(null);
    escolherCookies('aceito');
    await ligarPixel();
    registrar('PageView', { pagina: '/' });
    expect(script()).toBeNull();
  });

  it('parâmetros: nenhum dado pessoal', () => {
    expect(paramsMeta({ nome: 'PageView', eventId: 'x', dados: { pagina: '/hoje' } })).toEqual({});
    expect(paramsMeta({ nome: 'CompleteRegistration', eventId: 'x', dados: {} })).toEqual({});
  });
});
