// Limite de chamadas: janela fixa por chave (aluno ou IP), contada num lugar
// só (o banco) para valer entre todas as instâncias da Vercel.
import { describe, expect, it } from 'vitest';
import { clientIp, limitar, memoryLimiter, type RateLimiter } from '../../server/limite.js';
import { makeReq, makeRes } from './helpers.js';

const T0 = new Date('2026-10-02T12:00:10Z');
const at = (s: number) => new Date(T0.getTime() + s * 1000);

describe('memoryLimiter', () => {
  it('libera até o limite na janela; o seguinte é barrado; a próxima janela zera', async () => {
    const l = memoryLimiter();
    for (let i = 0; i < 3; i++) expect(await l.hit('u1', 3, 60, at(i))).toBe(true);
    expect(await l.hit('u1', 3, 60, at(5))).toBe(false);
    expect(await l.hit('u2', 3, 60, at(5))).toBe(true); // outra chave, outra conta
    expect(await l.hit('u1', 3, 60, at(60))).toBe(true); // 12:01:10 → janela nova
  });
});

describe('limitar', () => {
  it('responde 429 em português, com Retry-After, quando passa do limite', async () => {
    const l = memoryLimiter();
    const res = makeRes();
    expect(await limitar(l, res, 'u1', 1, 60, at(0))).toBe(true);
    expect(await limitar(l, res, 'u1', 1, 60, at(1))).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: 'Muitas ações seguidas. Espere um pouco e tente de novo.', code: 'MUITAS_TENTATIVAS' });
    expect(res.headers['Retry-After']).toBe('49'); // 12:00:11 → a janela vira às 12:01:00
  });

  it('se o contador falhar (banco fora do ar), deixa passar: o limite nunca derruba o app', async () => {
    const quebrado: RateLimiter = { hit: async () => { throw new Error('ECONNREFUSED'); } };
    const res = makeRes();
    expect(await limitar(quebrado, res, 'u1', 1, 60, at(0))).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('sem limitador (testes, desenvolvimento) não limita', async () => {
    expect(await limitar(null, makeRes(), 'u1', 0, 60)).toBe(true);
  });
});

describe('clientIp', () => {
  it('usa o IP que a Vercel informa (x-real-ip), senão o primeiro do x-forwarded-for', () => {
    expect(clientIp(makeReq({ headers: { 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' } }))).toBe('9.9.9.9');
    expect(clientIp(makeReq({ headers: { 'x-forwarded-for': ' 1.1.1.1 , 2.2.2.2' } }))).toBe('1.1.1.1');
    expect(clientIp(makeReq())).toBe('desconhecido');
  });
});
