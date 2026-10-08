// verifyTurnstile (server/turnstile.ts): só a resposta da Cloudflare vale —
// success, site aprovado e formulário certo; token usado uma vez, sem nova
// tentativa; 3 s de limite; erro de rede bloqueia; log só { ok, hostname, action }.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { textoLimpo, escapeHtml } from '../../server/sanitize.js';
import {
  ACOES, POLITICA_REDE, TURNSTILE_TIMEOUT_MS, hostnamesPermitidos, turnstileObrigatorio, verifyTurnstile,
} from '../../server/turnstile.js';

const env = { TURNSTILE_SECRET_KEY: 'segredo-super' } as NodeJS.ProcessEnv;
const TOKEN = 'tok-0123456789-secreto';

function cloudflare(resposta: unknown, status = 200) {
  const pedidos: { url: string; body: URLSearchParams; signal?: AbortSignal | null }[] = [];
  const send = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, body: init.body as URLSearchParams, signal: init.signal });
    return new Response(JSON.stringify(resposta), { status });
  }) as unknown as typeof fetch;
  return { send, pedidos };
}

const bom = (action = 'lead', hostname = 'www.aprovatico.com.br') => ({ success: true, hostname, action });

afterEach(() => vi.restoreAllMocks());

describe('verifyTurnstile', () => {
  it('manda segredo, token e IP para a siteverify (uma vez só) e devolve { ok, hostname, action }', async () => {
    const { send, pedidos } = cloudflare(bom());
    expect(await verifyTurnstile(TOKEN, { uso: 'lead', env, send, remoteip: '1.2.3.4' })).toEqual({ ok: true, hostname: 'www.aprovatico.com.br', action: 'lead' });
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]!.url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(Object.fromEntries(pedidos[0]!.body)).toEqual({ secret: 'segredo-super', response: TOKEN, remoteip: '1.2.3.4' });
    expect(pedidos[0]!.signal).toBeInstanceOf(AbortSignal);
  });

  it('cada uso exige a sua action: cadastro=signup, recuperar=recover, lead, jogo=game', async () => {
    for (const [uso, action] of Object.entries(ACOES) as [keyof typeof ACOES, string][]) {
      expect((await verifyTurnstile(TOKEN, { uso, env, send: cloudflare(bom(action)).send })).ok).toBe(true);
      const outra = await verifyTurnstile(TOKEN, { uso, env, send: cloudflare(bom(action === 'lead' ? 'game' : 'lead')).send });
      expect([uso, outra.ok, outra.motivo]).toEqual([uso, false, 'action']);
    }
  });

  it('success=false e site fora da lista → recusa', async () => {
    const casos: [unknown, string][] = [
      [{ ...bom(), success: false, 'error-codes': ['timeout-or-duplicate'] }, 'recusado'], // token já usado
      [{ ...bom(), success: 'true' }, 'recusado'],
      [bom('lead', 'site-do-golpe.com'), 'hostname'],
      [bom('lead', 'aprovatico.com.br.golpe.com'), 'hostname'],
      [bom('lead', 'missao-aprendizado.vercel.app'), 'hostname'],
      [bom('lead', 'qualquer-coisa.vercel.app'), 'hostname'],
      [{ success: true, action: 'lead' }, 'hostname'],
    ];
    for (const [resposta, motivo] of casos) {
      const r = await verifyTurnstile(TOKEN, { uso: 'lead', env, send: cloudflare(resposta).send });
      expect([JSON.stringify(resposta), r.ok, r.motivo]).toEqual([JSON.stringify(resposta), false, motivo]);
    }
  });

  it('sem token não chama a Cloudflare', async () => {
    const { send, pedidos } = cloudflare(bom());
    for (const token of [undefined, null, '', 42, 'x'.repeat(3000)]) {
      expect(await verifyTurnstile(token, { uso: 'lead', env, send })).toMatchObject({ ok: false, motivo: 'sem-token' });
    }
    expect(pedidos).toHaveLength(0);
  });

  it('erro de rede, HTTP 5xx ou demora de mais de 3 s → bloqueia (cadastro, senha, lista e jogo), sem tentar de novo', async () => {
    expect(TURNSTILE_TIMEOUT_MS).toBe(3000);
    expect(Object.values(POLITICA_REDE).every((p) => p === 'bloquear')).toBe(true);
    let chamadas = 0;
    const caiu = (async () => { chamadas++; throw new Error('rede'); }) as unknown as typeof fetch;
    for (const uso of Object.keys(ACOES) as (keyof typeof ACOES)[]) {
      expect(await verifyTurnstile(TOKEN, { uso, env, send: caiu })).toEqual({ ok: false, hostname: null, action: null, motivo: 'indisponivel' });
    }
    expect(chamadas).toBe(4); // uma por verificação, nenhuma repetição
    expect(await verifyTurnstile(TOKEN, { uso: 'lead', env, send: cloudflare(bom(), 500).send })).toMatchObject({ ok: false, motivo: 'indisponivel' });
    // Demora: a siteverify só responde depois do limite → o AbortSignal corta em 3 s.
    const lenta = ((_: string, init: RequestInit) => new Promise((_r, reject) => {
      init.signal!.addEventListener('abort', () => reject(new Error('abortado')));
    })) as unknown as typeof fetch;
    const inicio = Date.now();
    expect(await verifyTurnstile(TOKEN, { uso: 'jogo', env, send: lenta })).toMatchObject({ ok: false, motivo: 'indisponivel' });
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(2900);
    expect(Date.now() - inicio).toBeLessThan(4500);
  }, 10_000);

  it('sem a chave secreta: em produção recusa tudo (falha fechada); fora dela, desligado', async () => {
    const { send, pedidos } = cloudflare(bom());
    expect(await verifyTurnstile(TOKEN, { uso: 'lead', env: { VERCEL_ENV: 'production' }, send })).toMatchObject({ ok: false, motivo: 'sem-chave' });
    expect(await verifyTurnstile(undefined, { uso: 'lead', env: {}, send })).toMatchObject({ ok: true, motivo: 'desligado' });
    expect(pedidos).toHaveLength(0);
    expect(turnstileObrigatorio({ VERCEL_ENV: 'production' })).toBe(true);
    expect(turnstileObrigatorio({ TURNSTILE_SECRET_KEY: 'x' })).toBe(true);
    expect(turnstileObrigatorio({ VERCEL_ENV: 'preview' })).toBe(false);
  });

  it('log: só { ok, hostname, action } — nunca o token nem o segredo', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await verifyTurnstile(TOKEN, { uso: 'lead', env, send: cloudflare(bom()).send });
    await verifyTurnstile(TOKEN, { uso: 'lead', env, send: cloudflare(bom('lead', 'golpe.com')).send });
    await verifyTurnstile(TOKEN, { uso: 'lead', env, send: (async () => { throw new Error(TOKEN); }) as unknown as typeof fetch });
    const linhas = [...info.mock.calls, ...warn.mock.calls];
    expect(linhas).toHaveLength(3);
    for (const [prefixo, dados] of linhas) {
      expect(prefixo).toBe('[turnstile]');
      expect(Object.keys(dados as object).sort()).toEqual(['action', 'hostname', 'ok']);
    }
    const tudo = JSON.stringify(linhas);
    expect(tudo).not.toContain(TOKEN);
    expect(tudo).not.toContain('segredo-super');
  });
});

describe('hostnamesPermitidos', () => {
  it('produção: só aprovatico.com.br e www', () => {
    expect(hostnamesPermitidos({ VERCEL_ENV: 'production', VERCEL_URL: 'missao-aprendizado-abc-time.vercel.app' })).toEqual(['aprovatico.com.br', 'www.aprovatico.com.br']);
  });

  it('prévia da Vercel: entra o endereço da própria prévia (deploy e branch), nenhum outro', async () => {
    const previa = { ...env, VERCEL_ENV: 'preview', VERCEL_URL: 'missao-aprendizado-abc123-time.vercel.app', VERCEL_BRANCH_URL: 'missao-aprendizado-git-feat-time.vercel.app' };
    expect(hostnamesPermitidos(previa)).toEqual(['aprovatico.com.br', 'www.aprovatico.com.br', 'missao-aprendizado-abc123-time.vercel.app', 'missao-aprendizado-git-feat-time.vercel.app']);
    expect((await verifyTurnstile(TOKEN, { uso: 'lead', env: previa, send: cloudflare(bom('lead', 'missao-aprendizado-abc123-time.vercel.app')).send })).ok).toBe(true);
    expect((await verifyTurnstile(TOKEN, { uso: 'lead', env: previa, send: cloudflare(bom('lead', 'outra-previa-time.vercel.app')).send })).ok).toBe(false);
  });

  it('TURNSTILE_HOSTNAMES acrescenta sites', () => {
    expect(hostnamesPermitidos({ TURNSTILE_HOSTNAMES: ' Novo.com.br , ' })).toContain('novo.com.br');
  });
});

describe('sanitize', () => {
  it('escapeHtml troca os 6 sinais de HTML', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&\`</a>`)).toBe('&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&#96;&lt;/a&gt;');
  });

  it('textoLimpo corta no tamanho máximo, depois de limpar', () => {
    expect(textoLimpo('<b>'.repeat(10) + 'Ana Maria', 3)).toBe('bbb');
    expect(textoLimpo('  @@=-Ana  ', 60)).toBe('Ana');
  });
});
