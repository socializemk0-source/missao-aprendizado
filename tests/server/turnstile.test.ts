// verifyTurnstile: só a resposta da Cloudflare vale — success, site (hostname)
// e formulário (action) conferidos; erro de rede recusa.
import { describe, expect, it } from 'vitest';
import { textoLimpo, escapeHtml } from '../../server/sanitize.js';
import { verifyTurnstile } from '../../server/turnstile.js';

function cloudflare(resposta: unknown, status = 200) {
  const pedidos: { url: string; body: URLSearchParams }[] = [];
  const send = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, body: init.body as URLSearchParams });
    return new Response(JSON.stringify(resposta), { status });
  }) as unknown as typeof fetch;
  return { send, pedidos };
}

const bom = { success: true, hostname: 'www.aprovatico.com.br', action: 'lead' };

describe('verifyTurnstile', () => {
  it('manda segredo, token e IP para o siteverify e aceita o token bom', async () => {
    const { send, pedidos } = cloudflare(bom);
    expect(await verifyTurnstile('tok', 'segredo', { send, remoteip: '1.2.3.4', action: 'lead' })).toEqual({ ok: true });
    expect(pedidos[0]!.url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(Object.fromEntries(pedidos[0]!.body)).toEqual({ secret: 'segredo', response: 'tok', remoteip: '1.2.3.4' });
  });

  it('success=false, hostname de outro site ou outro formulário → recusa', async () => {
    const casos: [unknown, string][] = [
      [{ ...bom, success: false, 'error-codes': ['invalid-input-response'] }, 'recusado'],
      [{ ...bom, success: 'true' }, 'recusado'],
      [{ ...bom, hostname: 'site-do-golpe.com' }, 'hostname'],
      [{ ...bom, hostname: 'aprovatico.com.br.golpe.com' }, 'hostname'],
      [{ ...bom, hostname: undefined }, 'hostname'],
      [{ ...bom, action: 'login' }, 'action'],
    ];
    for (const [resposta, motivo] of casos) {
      expect(await verifyTurnstile('tok', 's', { send: cloudflare(resposta).send, action: 'lead' })).toEqual({ ok: false, motivo });
    }
  });

  it('hostnames configurados substituem o padrão', async () => {
    const { send } = cloudflare({ ...bom, hostname: 'preview.aprovatico.dev' });
    expect(await verifyTurnstile('tok', 's', { send, hostnames: ['preview.aprovatico.dev'] })).toEqual({ ok: true });
  });

  it('sem token não chama a Cloudflare; erro de rede ou HTTP → indisponível', async () => {
    const { send, pedidos } = cloudflare(bom);
    for (const token of [undefined, '', 42, 'x'.repeat(3000)]) expect(await verifyTurnstile(token, 's', { send })).toEqual({ ok: false, motivo: 'sem-token' });
    expect(pedidos).toHaveLength(0);
    expect(await verifyTurnstile('tok', 's', { send: cloudflare(bom, 500).send })).toEqual({ ok: false, motivo: 'indisponivel' });
    const caiu = (async () => { throw new Error('rede'); }) as unknown as typeof fetch;
    expect(await verifyTurnstile('tok', 's', { send: caiu })).toEqual({ ok: false, motivo: 'indisponivel' });
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
