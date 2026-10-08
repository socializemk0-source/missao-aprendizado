// O único uso da chave de administrador (service_role): remover o login do
// próprio aluno. Ela ignora a RLS, então o dono tem de estar fixo no código.
import { describe, expect, it } from 'vitest';
import { supabaseRemoverLogin } from '../../server/conta.js';

const env = { SUPABASE_URL: 'https://proj.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'chave-admin' };

describe('supabaseRemoverLogin (service_role)', () => {
  it('sem a chave, não existe (a exclusão avisa que está indisponível)', () => {
    expect(supabaseRemoverLogin({ SUPABASE_URL: env.SUPABASE_URL })).toBeNull();
  });

  it('apaga só o login do id recebido, e a chave só vai para o Supabase Auth', async () => {
    const chamadas: { url: string; init: RequestInit }[] = [];
    const remover = supabaseRemoverLogin(env, async (url, init) => {
      chamadas.push({ url: String(url), init: init! });
      return new Response(null, { status: 200 });
    })!;
    const id = crypto.randomUUID();
    await remover(id);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]!.url).toBe(`https://proj.supabase.co/auth/v1/admin/users/${id}`);
    expect(chamadas[0]!.init.method).toBe('DELETE');
  });

  it('recusa id que não é uuid antes de chamar o Supabase (nada de "../" ou listas)', async () => {
    let chamou = false;
    const remover = supabaseRemoverLogin(env, async () => { chamou = true; return new Response(null); })!;
    for (const id of ['', '../users', 'u1', `${crypto.randomUUID()}/../outro`, '*']) {
      await expect(remover(id)).rejects.toThrow('id de login inválido');
    }
    expect(chamou).toBe(false);
  });
});
