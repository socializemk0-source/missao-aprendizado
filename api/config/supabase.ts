// GET /api/config/supabase — URL e chave pública (anon) do Supabase para o
// navegador, a chave pública do CAPTCHA (Cloudflare Turnstile) e o id do
// pixel da Meta (META_PIXEL_ID), se houver. Todas são feitas para serem
// públicas (o token da API de Conversões, META_CAPI_TOKEN, nunca sai daqui); a proteção real está no servidor
// (que valida o token de cada requisição) e no Supabase (que confere o CAPTCHA).

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
  // Id do pixel: só números (nada de outro valor ir parar no navegador).
  const pixel = process.env.META_PIXEL_ID?.trim();
  res.status(200).json({
    supabaseUrl, supabaseAnonKey,
    captchaSiteKey: process.env.TURNSTILE_SITE_KEY?.trim() || null,
    metaPixelId: pixel && /^\d{6,20}$/.test(pixel) ? pixel : null,
  });
}
