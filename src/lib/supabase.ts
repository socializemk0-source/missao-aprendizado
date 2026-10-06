// Cliente do Supabase no navegador. A configuração vem do servidor
// (/api/config/supabase) e o cliente é criado uma única vez.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient> | null = null;
let captchaSiteKey: string | null = null;
let metaPixelId: string | null = null;

export class LoginUnavailableError extends Error {}

async function createFromServerConfig(): Promise<SupabaseClient> {
  const res = await fetch('/api/config/supabase');
  if (!res.ok) throw new LoginUnavailableError('Login indisponível no momento.');
  const config = (await res.json()) as { supabaseUrl: string; supabaseAnonKey: string; captchaSiteKey?: string | null; metaPixelId?: string | null };
  const { supabaseUrl, supabaseAnonKey } = config;
  captchaSiteKey = config.captchaSiteKey ?? null;
  metaPixelId = config.metaPixelId ?? null;
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

// Chave pública do CAPTCHA (null = CAPTCHA desligado).
export async function getCaptchaSiteKey(): Promise<string | null> {
  await getSupabase();
  return captchaSiteKey;
}

// Id do pixel da Meta (null = pixel desligado).
export async function getMetaPixelId(): Promise<string | null> {
  await getSupabase();
  return metaPixelId;
}

// Só para os testes injetarem um cliente falso (e, se quiserem, o CAPTCHA).
export function setSupabaseForTests(client: SupabaseClient | null, captcha: string | null = null, pixel: string | null = null): void {
  clientPromise = client ? Promise.resolve(client) : null;
  captchaSiteKey = captcha;
  metaPixelId = pixel;
}
