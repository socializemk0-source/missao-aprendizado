// @vitest-environment jsdom
// Token do CAPTCHA das ações do jogo (src/lib/turnstile.ts): um token novo
// por escrita, nunca o mesmo duas vezes, com o próximo já pedido em segundo
// plano; e o header X-Turnstile-Token em todo POST do jogo.
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { game } from '../../src/lib/game';
import { setSupabaseForTests } from '../../src/lib/supabase';
import { tokenDoJogo, zerarTokenDoJogo } from '../../src/lib/turnstile';
import { fakeSupabase } from './render';

let gerados = 0;
let opcoes: Record<string, unknown> = {};
const execucoes: string[] = [];

function comChave(chave: string | null) {
  setSupabaseForTests({ auth: fakeSupabase({ getSession: async () => ({ data: { session: { access_token: 'ok:u1' } } }) }) } as unknown as SupabaseClient, chave);
  window.turnstile = {
    render: (_el, o) => { opcoes = o; return 'wg'; },
    // Cada execução responde ao widget daquele momento (como a Cloudflare).
    execute: (id) => { execucoes.push(id); const o = opcoes; setTimeout(() => (o.callback as (t: string) => void)(`tok-${++gerados}`), 5); },
    reset: () => {},
    remove: () => {},
  };
}

afterEach(() => {
  zerarTokenDoJogo();
  delete window.turnstile;
  gerados = 0;
  execucoes.length = 0;
  vi.unstubAllGlobals();
});

describe('token do jogo', () => {
  it('sem chave de CAPTCHA: não há token', async () => {
    comChave(null);
    expect(await tokenDoJogo()).toBeNull();
    expect(execucoes).toHaveLength(0);
  });

  it('widget invisível do formulário "game"; cada pedido recebe um token diferente; o próximo já fica pronto', async () => {
    comChave('chave');
    const a = await tokenDoJogo();
    expect(opcoes).toMatchObject({ sitekey: 'chave', action: 'game', execution: 'execute', appearance: 'interaction-only' });
    await new Promise((r) => setTimeout(r, 20)); // o próximo chega em segundo plano
    const b = await tokenDoJogo();
    const c = await tokenDoJogo();
    expect(new Set([a, b, c]).size).toBe(3);
    expect([a, b]).toEqual(['tok-1', 'tok-2']);
  });

  it('pedidos ao mesmo tempo nunca dividem o mesmo token', async () => {
    comChave('chave');
    const tokens = await Promise.all([tokenDoJogo(), tokenDoJogo(), tokenDoJogo()]);
    expect(new Set(tokens).size).toBe(3);
  });

  it('erro do widget: a ação recebe o erro na hora, e a próxima pede de novo', async () => {
    comChave('chave');
    window.turnstile!.execute = () => { const o = opcoes; setTimeout(() => (o['error-callback'] as () => void)(), 5); };
    await expect(tokenDoJogo()).rejects.toThrow('Não deu para confirmar que você não é um robô');
    window.turnstile!.execute = () => { const o = opcoes; setTimeout(() => (o.callback as (t: string) => void)('tok-ok'), 5); };
    expect(await tokenDoJogo()).toBe('tok-ok');
  });

  it('todo POST do jogo manda X-Turnstile-Token (novo a cada envio)', async () => {
    comChave('chave');
    const headers: (string | null)[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      headers.push(new Headers(init.headers).get('X-Turnstile-Token'));
      return new Response(JSON.stringify({}), { status: 200 });
    }));
    await game.answer('pt-acent-1', 0, 'trilha');
    await game.claim('responder-10');
    await game.progress(); // leitura: sem token
    expect(headers[0]).toMatch(/^tok-/);
    expect(headers[1]).toMatch(/^tok-/);
    expect(headers[0]).not.toBe(headers[1]);
    expect(headers[2]).toBeNull();
  });
});
