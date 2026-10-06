// Exclusão da conta (LGPD, art. 18, VI). Apaga tudo o que o V2 guarda do
// aluno. Ficam só os registros de pagamento (v2.payments e as compras pagas
// em v2.checkouts), que a lei manda guardar (obrigação fiscal e de defesa do
// consumidor; LGPD, art. 16, I) — sem nome nem e-mail, só o id que deixa de
// existir quando o login é removido.

import { sql } from 'drizzle-orm';
import { db } from './db.js';

export interface ContaStore {
  excluir(userId: string, email: string | null): Promise<void>;
}

// Tabelas com user_id que são apagadas por completo.
const TABELAS = [
  'question_state', 'answers', 'phase_completions', 'mission_claims', 'user_stats',
  'essays', 'simulados', 'game_rounds', 'study_plans', 'profiles', 'marketing_usuarios',
] as const;

export const postgresConta: ContaStore = {
  async excluir(userId, email) {
    await db().transaction(async (tx) => {
      for (const t of TABELAS) await tx.execute(sql`delete from ${sql.raw(`v2.${t}`)} where user_id = ${userId}`);
      await tx.execute(sql`delete from v2.checkouts where user_id = ${userId} and paid = false`);
      await tx.execute(sql`delete from v2.rate_limits where chave like ${`%:${userId}`}`);
      if (email) await tx.execute(sql`delete from v2.leads where email = ${email.trim().toLowerCase()}`);
    });
  },
};

// Remove o login no Supabase Auth. Precisa da chave de administrador
// (service_role), que fica SÓ no servidor (variável SUPABASE_SERVICE_ROLE_KEY
// na Vercel) e nunca vai para o navegador.
export type RemoverLogin = (userId: string) => Promise<void>;

export function supabaseRemoverLogin(env: NodeJS.ProcessEnv = process.env, send: typeof fetch = fetch): RemoverLogin | null {
  const url = env.SUPABASE_URL?.replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return async (userId) => {
    const res = await send(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    // 404: o login já não existe (exclusão repetida) — tudo bem.
    if (!res.ok && res.status !== 404) throw new Error(`Supabase Auth: HTTP ${res.status}`);
  };
}
