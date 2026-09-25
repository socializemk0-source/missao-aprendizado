// GET /api/config/supabase — URL e chave pública (anon) do Supabase para o
// navegador. A chave anon é feita para ser pública; a proteção real está
// no servidor, que valida o token de cada requisição.

import type { ApiRequest, ApiResponse } from '../../server/http.js';

export default function handler(_req: ApiRequest, res: ApiResponse): void {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[config] SUPABASE_URL/SUPABASE_ANON_KEY não configuradas.');
    res.status(503).json({ error: 'Login indisponível no momento.' });
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ supabaseUrl, supabaseAnonKey });
}
