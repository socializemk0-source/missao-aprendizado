import { describe, expect, it } from 'vitest';
import { createMeHandler } from '../../api/me.js';
import { fakeVerify, makeReq, makeRes, memoryProfiles } from './helpers.js';

function setup() {
  const profiles = memoryProfiles();
  const handler = createMeHandler({ verifyToken: fakeVerify, profiles });
  return { profiles, handler };
}

describe('GET /api/me', () => {
  it('sem login → 401', async () => {
    const { handler } = setup();
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('token inválido ou expirado → 401', async () => {
    const { handler } = setup();
    const res = makeRes();
    await handler(makeReq({ token: 'forjado' }), res);
    expect(res.statusCode).toBe(401);
  });

  it('primeiro acesso cria o perfil com o nome do cadastro', async () => {
    const { handler, profiles } = setup();
    const res = makeRes();
    await handler(makeReq({ token: 'ok:u1' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toEqual({ id: 'u1', email: 'u1@teste.dev' });
    expect(res.body.profile.displayName).toBe('Aluno u1');
    expect(profiles.rows.has('u1')).toBe(true);
  });

  it('sem nome no cadastro (ex.: Google sem nome) usa o começo do e-mail', async () => {
    const { handler } = setup();
    const res = makeRes();
    await handler(makeReq({ token: 'ok:sem-nome' }), res);
    expect(res.body.profile.displayName).toBe('sem-nome');
  });

  it('o id vem SEMPRE do token — um userId na URL é ignorado', async () => {
    const { handler, profiles } = setup();
    const res = makeRes();
    await handler(makeReq({ token: 'ok:u1', query: { userId: 'u2' } }), res);
    expect(res.body.user.id).toBe('u1');
    expect(profiles.rows.has('u2')).toBe(false);
  });
});

describe('PATCH /api/me', () => {
  it('atualiza só os campos enviados e devolve o perfil novo', async () => {
    const { handler } = setup();
    const res = makeRes();
    await handler(makeReq({ method: 'PATCH', token: 'ok:u1', body: { displayName: '  Maria  ', preferredBanca: 'FGV' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.profile).toMatchObject({ displayName: 'Maria', preferredBanca: 'FGV', city: null });
  });

  it('campo desconhecido, nome vazio ou texto longo demais → 400 e nada muda', async () => {
    const { handler, profiles } = setup();
    await handler(makeReq({ token: 'ok:u1' }), makeRes());
    for (const body of [{ plan: 'pro' }, { displayName: '   ' }, { city: 'x'.repeat(81) }, { targetExam: 42 }]) {
      const res = makeRes();
      await handler(makeReq({ method: 'PATCH', token: 'ok:u1', body }), res);
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
    }
    expect(profiles.rows.get('u1')?.displayName).toBe('Aluno u1');
  });

  it('valor null limpa um campo opcional', async () => {
    const { handler } = setup();
    await handler(makeReq({ method: 'PATCH', token: 'ok:u1', body: { city: 'Recife' } }), makeRes());
    const res = makeRes();
    await handler(makeReq({ method: 'PATCH', token: 'ok:u1', body: { city: null } }), res);
    expect(res.body.profile.city).toBeNull();
  });

  it('outros métodos → 405', async () => {
    const { handler } = setup();
    const res = makeRes();
    await handler(makeReq({ method: 'PUT', token: 'ok:u1' }), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET, PATCH, DELETE');
  });
});

describe('DELETE /api/me — excluir a conta (LGPD)', () => {
  function setupExcluir(opts: { authFalha?: boolean; semAdmin?: boolean } = {}) {
    const profiles = memoryProfiles();
    const apagados: { userId: string; email: string | null }[] = [];
    const loginsRemovidos: string[] = [];
    const handler = createMeHandler({
      verifyToken: fakeVerify, profiles,
      conta: { excluir: async (userId, email) => { apagados.push({ userId, email }); } },
      removerLogin: opts.semAdmin ? null : async (userId) => {
        if (opts.authFalha) throw new Error('HTTP 500');
        loginsRemovidos.push(userId);
      },
    });
    const call = async (body: unknown, token = 'ok:u1') => {
      const res = makeRes();
      await handler(makeReq({ method: 'DELETE', token, body }), res);
      return res;
    };
    return { call, apagados, loginsRemovidos };
  }

  it('sem login → 401; sem a confirmação escrita → 400 e nada é apagado', async () => {
    const { call, apagados } = setupExcluir();
    expect((await call({ confirmar: 'EXCLUIR' }, 'forjado')).statusCode).toBe(401);
    for (const body of [{}, { confirmar: 'excluir ' }, { confirmar: 'sim' }, null]) {
      const res = await call(body);
      expect([res.statusCode, res.body.code]).toEqual([400, 'CONFIRMACAO']);
    }
    expect(apagados).toEqual([]);
  });

  it('apaga os dados do app e depois o login; só os do próprio aluno', async () => {
    const { call, apagados, loginsRemovidos } = setupExcluir();
    const res = await call({ confirmar: 'EXCLUIR' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ excluida: true });
    expect(apagados).toEqual([{ userId: 'u1', email: 'u1@teste.dev' }]);
    expect(loginsRemovidos).toEqual(['u1']);
  });

  it('se o login não puder ser removido, avisa (os dados do app já foram apagados; tentar de novo funciona)', async () => {
    const { call, apagados } = setupExcluir({ authFalha: true });
    const res = await call({ confirmar: 'EXCLUIR' });
    expect([res.statusCode, res.body.code]).toEqual([502, 'LOGIN_NAO_REMOVIDO']);
    expect(apagados).toHaveLength(1);
  });

  it('sem a chave de administrador configurada, não apaga nada e explica', async () => {
    const { call, apagados } = setupExcluir({ semAdmin: true });
    const res = await call({ confirmar: 'EXCLUIR' });
    expect([res.statusCode, res.body.code]).toEqual([503, 'EXCLUSAO_INDISPONIVEL']);
    expect(apagados).toEqual([]);
  });
});
