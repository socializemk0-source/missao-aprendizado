// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventosHandler } from '../../api/eventos.js';
import { memoryMarketing } from '../../server/marketing.js';
import type { EventoParaPixel } from '../../shared/medicao';
import { escolherCookies, limparCookiesParaTestes } from '../../src/lib/consentimento';
import { definirDisparo, iniciarMedicao, ligarMedicaoParaTestes, registrar } from '../../src/lib/medicao';
import { capturarOrigem, lerOrigem, limparOrigemParaTestes } from '../../src/lib/origem';
import { fakeVerify } from '../server/helpers.js';
import { bridgeApi } from './api-bridge';
import { fakeSupabase, renderAt, session } from './render';

const AD = 'https://aprovatico.com.br/?utm_source=meta&utm_medium=paid_social&utm_campaign=cadastro_medio-adm_202610&utm_content=c001-cronograma-v1&fbclid=IwAR0abc';

beforeEach(() => {
  limparCookiesParaTestes();
  limparOrigemParaTestes();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  ligarMedicaoParaTestes(false);
  definirDisparo(null);
});

describe('primeira origem (UTM)', () => {
  it('guarda as etiquetas e o código de clique da 1ª visita', () => {
    capturarOrigem(AD, new Date('2026-10-01T10:00:00Z'));
    expect(lerOrigem(new Date('2026-10-02T10:00:00Z'))).toEqual({
      utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: 'cadastro_medio-adm_202610', utm_content: 'c001-cronograma-v1',
      fbclid: 'IwAR0abc', pagina: '/', em: '2026-10-01T10:00:00.000Z',
    });
  });

  it('visita sem etiqueta não apaga; outra etiqueta dentro de 30 dias não troca', () => {
    capturarOrigem(AD, new Date('2026-10-01T10:00:00Z'));
    capturarOrigem('https://aprovatico.com.br/planos', new Date('2026-10-03T10:00:00Z'));
    capturarOrigem('https://aprovatico.com.br/?utm_source=google&utm_content=c002', new Date('2026-10-20T10:00:00Z'));
    expect(lerOrigem(new Date('2026-10-20T10:00:00Z'))!.utm_content).toBe('c001-cronograma-v1');
  });

  it('depois de 30 dias a origem vence e uma nova visita com etiqueta vale', () => {
    capturarOrigem(AD, new Date('2026-10-01T10:00:00Z'));
    expect(lerOrigem(new Date('2026-11-01T10:00:00Z'))).toBeNull();
    capturarOrigem('https://aprovatico.com.br/?utm_source=google&utm_content=c002', new Date('2026-11-01T10:00:00Z'));
    expect(lerOrigem(new Date('2026-11-01T11:00:00Z'))!.utm_source).toBe('google');
  });
});

describe('eventos no navegador', () => {
  function ligar(token: string | null = null) {
    const store = memoryMarketing();
    fakeSupabase({ getSession: async () => ({ data: { session: token ? { ...session, access_token: token } : null } }) });
    const { calls } = bridgeApi({ '/api/eventos': createEventosHandler({ verifyToken: fakeVerify, store }) });
    const pixel: EventoParaPixel[] = [];
    definirDisparo((e) => pixel.push(e));
    ligarMedicaoParaTestes(true);
    return { store, calls, pixel };
  }

  it('sem aceite: vai só para o registro próprio, nada para o pixel', async () => {
    const { store, pixel } = ligar();
    registrar('ViewContent', { content_name: 'planos' });
    await vi.waitFor(() => expect(store.eventos).toHaveLength(1));
    expect(pixel).toEqual([]);
    expect(store.eventos[0]).toMatchObject({ nome: 'ViewContent', consentimento: false });
  });

  it('com aceite: pixel e registro com o MESMO event_id', async () => {
    escolherCookies('aceito');
    const { store, pixel } = ligar();
    registrar('InitiateCheckout', { plano: 'monthly' });
    await vi.waitFor(() => expect(store.eventos).toHaveLength(1));
    expect(pixel).toHaveLength(1);
    expect(pixel[0]!.eventId).toBe(store.eventos[0]!.eventId);
    expect(store.eventos[0]).toMatchObject({ consentimento: true, valor: 29.9, moeda: 'BRL' });
  });

  it('PageView a cada página; a origem da visita vai junto; com login e aceite, o cadastro volta para o pixel', async () => {
    escolherCookies('aceito');
    window.history.replaceState(null, '', '/?utm_source=meta&utm_content=c001-cronograma-v1');
    const { store, pixel } = ligar('ok:u1');
    const ouvintes: ((s: { location: { pathname: string } }) => void)[] = [];
    iniciarMedicao({ state: { location: { pathname: '/' } }, subscribe: (fn) => { ouvintes.push(fn); return () => {}; } });
    await vi.waitFor(() => expect(pixel.map((p) => p.nome)).toEqual(['PageView', 'CompleteRegistration']));
    ouvintes[0]!({ location: { pathname: '/hoje' } });
    ouvintes[0]!({ location: { pathname: '/hoje' } }); // mesma página: não repete
    await vi.waitFor(() => expect(store.eventos.filter((e) => e.nome === 'PageView')).toHaveLength(2));
    expect(store.usuarios.get('u1')!.origem).toMatchObject({ utm_source: 'meta', utm_content: 'c001-cronograma-v1' });
    const cadastro = store.eventos.find((e) => e.nome === 'CompleteRegistration')!;
    expect(pixel.find((p) => p.nome === 'CompleteRegistration')!.eventId).toBe(cadastro.eventId);
    window.history.replaceState(null, '', '/');
  });

  it('servidor fora do ar: nada quebra', async () => {
    ligarMedicaoParaTestes(true);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('sem internet'); }));
    expect(() => registrar('PageView', { pagina: '/' })).not.toThrow();
  });
});

describe('eventos nas telas', () => {
  it('questão de demonstração registra acertou sim/não', async () => {
    const { store } = (() => {
      const store = memoryMarketing();
      bridgeApi({ '/api/eventos': createEventosHandler({ verifyToken: fakeVerify, store }) });
      fakeSupabase();
      ligarMedicaoParaTestes(true);
      return { store };
    })();
    renderAt('/', { status: 'signedOut' });
    await userEvent.click(screen.getByRole('radio', { name: /80%/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Conferir resposta' }));
    await vi.waitFor(() => expect(store.eventos.map((e) => [e.nome, e.dados])).toEqual([['DemoQuestionAnswered', { acertou: 'nao' }]]));
  });
});
