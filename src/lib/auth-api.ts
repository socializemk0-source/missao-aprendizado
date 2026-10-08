// Cadastro e "esqueci a senha" passam por /api/auth, que confere o CAPTCHA
// no servidor antes de falar com o Supabase. Erros já vêm em português.

import { ApiError } from './api';

export async function pedirAuth(
  action: 'signup' | 'recover', body: Record<string, unknown>,
): Promise<{ ok: true; confirmar?: boolean }> {
  const res = await fetch(`/api/auth?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string; code?: string } & Record<string, unknown>;
  if (!res.ok) throw new ApiError(payload.error ?? 'Não foi possível concluir agora. Tente de novo.', res.status, payload.code, payload);
  return payload as { ok: true; confirmar?: boolean };
}
