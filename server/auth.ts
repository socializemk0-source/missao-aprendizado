// Autenticação das rotas privadas: o único jeito de saber QUEM está
// chamando é o access token do Supabase no header Authorization. Nenhuma
// rota confia em id de usuário vindo do corpo ou da URL.

import { header, type ApiRequest, type ApiResponse } from './http.js';

export interface Identity {
  id: string;
  email: string | null;
  name: string | null;
}

export type VerifyToken = (token: string) => Promise<Identity | null>;

export function bearerToken(req: ApiRequest): string | null {
  const match = /^Bearer\s+(.+)$/i.exec((header(req, 'authorization') ?? '').trim());
  return match?.[1]?.trim() || null;
}

// Devolve a identidade, ou responde 401 e devolve null — o chamador só
// precisa de `if (!user) return;`.
export async function authenticate(req: ApiRequest, res: ApiResponse, verifyToken: VerifyToken): Promise<Identity | null> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Faça login para continuar.' });
    return null;
  }
  let identity: Identity | null = null;
  try {
    identity = await verifyToken(token);
  } catch (err) {
    console.warn('[auth] falha ao verificar token:', err instanceof Error ? err.message : err);
  }
  if (!identity?.id) {
    res.status(401).json({ error: 'Sua sessão expirou. Entre de novo.' });
    return null;
  }
  return identity;
}
