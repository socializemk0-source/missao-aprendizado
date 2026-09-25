// Chamadas às rotas /api com o token da sessão. Toda rota privada passa
// por aqui — nunca um fetch cru, para nunca esquecer o token.

import { getSupabase } from './supabase';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);

  const res = await fetch(path, { ...init, headers });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(payload.error ?? 'Algo deu errado. Tente de novo.', res.status);
  return payload as T;
}

export interface Profile {
  displayName: string;
  targetExam: string | null;
  preferredBanca: string | null;
  city: string | null;
}

export interface Me {
  user: { id: string; email: string | null };
  profile: Profile;
}
