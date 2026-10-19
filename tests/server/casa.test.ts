// Casa do Tico pelo /api/game: cada conquista libera um item; o aluno escolhe
// o lugar. O servidor decide o que está liberado e confere o lugar.
import { describe, expect, it } from 'vitest';
import { createGameHandler } from '../../api/game.js';
import { memoryGameStore } from '../../server/game-memory.js';
import { ARRUMACAO_INICIAL, ITENS_CASA, LUGARES } from '../../shared/casa.js';
import { fakeVerify, makeReq, makeRes } from './helpers.js';

function setup() {
  const store = memoryGameStore();
  const handler = createGameHandler({ verifyToken: fakeVerify, store });
  const call = async (method: string, action: string, body?: unknown, token = 'ok:u1') => {
    const res = makeRes();
    const headers = method === 'POST' ? { 'idempotency-key': crypto.randomUUID() } : undefined;
    await handler(makeReq({ method, query: { action }, body, token, headers }), res);
    return res;
  };
  const concluirFase = (userId = 'u1') => store.withUser(userId, (tx) => tx.completePhase('fase-01-1', '2026-10-19'));
  type Item = { id: string; liberado: boolean; lugarAtual: string | null; comoLiberar: { titulo: string } | null };
  const item = (body: { itens: Item[] }, id: string) => body.itens.find((i) => i.id === id)!;
  return { store, call, concluirFase, item };
}

describe('casa do Tico', () => {
  it('sem login → 401', async () => {
    const { call } = setup();
    expect((await call('GET', 'casa', undefined, 'forjado')).statusCode).toBe(401);
  });

  it('casa nova: cama e relógio já vêm arrumados; o resto está bloqueado, com a conquista que libera', async () => {
    const { call, item } = setup();
    const res = await call('GET', 'casa');
    expect(res.statusCode).toBe(200);
    expect(res.body.itens).toHaveLength(ITENS_CASA.length);
    expect(item(res.body, 'cama')).toMatchObject({ liberado: true, lugarAtual: ARRUMACAO_INICIAL.cama, comoLiberar: null });
    expect(item(res.body, 'relogio')).toMatchObject({ liberado: true, lugarAtual: ARRUMACAO_INICIAL.relogio });
    expect(item(res.body, 'cadeira')).toMatchObject({ liberado: false, lugarAtual: null, comoLiberar: { titulo: 'Primeiro passo' } });
  });

  it('item bloqueado não entra na casa → 409 ITEM_BLOQUEADO', async () => {
    const { call } = setup();
    const res = await call('POST', 'casa-colocar', { item: 'cadeira', lugar: 'chao-2' });
    expect([res.statusCode, res.body.code]).toEqual([409, 'ITEM_BLOQUEADO']);
  });

  it('a conquista libera o item; o aluno escolhe o lugar e a escolha fica salva', async () => {
    const { call, concluirFase, item } = setup();
    await concluirFase();
    const antes = await call('GET', 'casa');
    expect(item(antes.body, 'cadeira')).toMatchObject({ liberado: true, lugarAtual: null });
    const res = await call('POST', 'casa-colocar', { item: 'cadeira', lugar: 'chao-4' });
    expect(res.statusCode).toBe(200);
    expect(item(res.body, 'cadeira').lugarAtual).toBe('chao-4');
    expect(item((await call('GET', 'casa')).body, 'cadeira').lugarAtual).toBe('chao-4');
  });

  it('lugar ocupado: o item que estava lá volta para a caixa', async () => {
    const { call, concluirFase, item } = setup();
    await concluirFase();
    const res = await call('POST', 'casa-colocar', { item: 'cadeira', lugar: ARRUMACAO_INICIAL.cama });
    expect(item(res.body, 'cadeira').lugarAtual).toBe(ARRUMACAO_INICIAL.cama);
    expect(item(res.body, 'cama').lugarAtual).toBeNull();
  });

  it('mudar de lugar e guardar na caixa (lugar null)', async () => {
    const { call, item } = setup();
    expect(item((await call('POST', 'casa-colocar', { item: 'cama', lugar: 'chao-6' })).body, 'cama').lugarAtual).toBe('chao-6');
    expect(item((await call('POST', 'casa-colocar', { item: 'relogio', lugar: null })).body, 'relogio').lugarAtual).toBeNull();
    const casa = (await call('GET', 'casa')).body;
    expect([item(casa, 'cama').lugarAtual, item(casa, 'relogio').lugarAtual]).toEqual(['chao-6', null]);
  });

  it('item de parede não vai para o chão (e vice-versa) → 400 LUGAR_INVALIDO', async () => {
    const { call } = setup();
    const a = await call('POST', 'casa-colocar', { item: 'relogio', lugar: LUGARES.chao[0] });
    const b = await call('POST', 'casa-colocar', { item: 'cama', lugar: LUGARES.parede[0] });
    expect([a.statusCode, a.body.code, b.statusCode, b.body.code]).toEqual([400, 'LUGAR_INVALIDO', 400, 'LUGAR_INVALIDO']);
  });

  it('item ou lugar que não existe → 400', async () => {
    const { call } = setup();
    for (const body of [{ item: 'piscina', lugar: 'chao-1' }, { item: 'cama', lugar: 'telhado' }, { item: 'cama' }, null]) {
      expect((await call('POST', 'casa-colocar', body)).statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it('cada aluno tem a sua casa', async () => {
    const { call, item } = setup();
    await call('POST', 'casa-colocar', { item: 'cama', lugar: 'chao-5' });
    expect(item((await call('GET', 'casa', undefined, 'ok:u2')).body, 'cama').lugarAtual).toBe(ARRUMACAO_INICIAL.cama);
  });
});
