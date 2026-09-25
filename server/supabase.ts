// Verificação real do token: pergunta ao servidor de Auth do Supabase
// (confere assinatura, expiração e revogação). Import preguiçoso para que
// os testes, que injetam um verificador falso, nunca carreguem o SDK.

import type { Identity, VerifyToken } from './auth.js';

type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;
let clientPromise: Promise<SupabaseClient> | null = null;

function client(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_ANON_KEY ?? '', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }),
  );
  return clientPromise;
}

export const verifySupabaseToken: VerifyToken = async (token) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('[auth] SUPABASE_URL/SUPABASE_ANON_KEY ausentes — recusando (fail-closed).');
    return null;
  }
  const { data, error } = await (await client()).auth.getUser(token);
  if (error || !data.user?.id) return null;
  const name = data.user.user_metadata?.name;
  const identity: Identity = {
    id: data.user.id,
    email: data.user.email ?? null,
    name: typeof name === 'string' && name.trim() ? name.trim() : null,
  };
  return identity;
};
