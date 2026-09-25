// Cliente do Supabase no navegador. A configuração vem do servidor
// (/api/config/supabase) e o cliente é criado uma única vez.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient> | null = null;

export class LoginUnavailableError extends Error {}

async function createFromServerConfig(): Promise<SupabaseClient> {
  const res = await fetch('/api/config/supabase');
  if (!res.ok) throw new LoginUnavailableError('Login indisponível no momento.');
  const { supabaseUrl, supabaseAnonKey } = (await res.json()) as { supabaseUrl: string; supabaseAnonKey: string };
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

export function getSupabase(): Promise<SupabaseClient> {
  clientPromise ??= createFromServerConfig().catch((err: unknown) => {
    clientPromise = null; // deixa tentar de novo numa próxima chamada
    throw err;
  });
  return clientPromise;
}

// Só para os testes injetarem um cliente falso.
export function setSupabaseForTests(client: SupabaseClient | null): void {
  clientPromise = client ? Promise.resolve(client) : null;
}
