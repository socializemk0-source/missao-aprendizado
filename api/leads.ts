// POST /api/leads — entra na lista de contatos da página inicial.
// Público (sem login), então: consentimento obrigatório, campo-isca para
// robôs, limite de envios por IP e resposta igual para e-mail repetido.

import { header, jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { postgresLeads, type LeadStore } from '../server/leads.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCES = new Set(['landing', 'landing-final']);

export function createLeadsHandler({ store, now = Date.now, limitPerMinute = 5 }: { store: LeadStore; now?: () => number; limitPerMinute?: number }) {
  // Limite em memória por instância: freio contra abuso, não cota exata.
  const hits = new Map<string, number[]>();

  return async function leadsHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    const ip = (header(req, 'x-forwarded-for') ?? 'desconhecido').split(',')[0]!.trim();
    const recent = (hits.get(ip) ?? []).filter((t) => now() - t < 60_000);
    if (recent.length >= limitPerMinute) {
      res.status(429).json({ error: 'Muitos envios seguidos. Tente de novo em um minuto.' });
      return;
    }
    hits.set(ip, [...recent, now()]);

    const body = jsonBody(req);
    if (!body) {
      res.status(400).json({ error: 'Envio inválido.' });
      return;
    }
    // Campo escondido na página: gente não preenche, robô preenche.
    if (typeof body.website === 'string' && body.website.trim()) {
      res.status(201).json({ ok: true });
      return;
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!EMAIL.test(email) || email.length > 254) {
      res.status(400).json({ error: 'Confira o e-mail digitado.' });
      return;
    }
    if (name.length > 60) {
      res.status(400).json({ error: 'Nome longo demais.' });
      return;
    }
    if (body.consent !== true) {
      res.status(400).json({ error: 'Marque a autorização para receber nossos e-mails.' });
      return;
    }
    const source = typeof body.source === 'string' && SOURCES.has(body.source) ? body.source : 'landing';

    try {
      await store.save({ email, name: name || null, source });
      res.status(201).json({ ok: true });
    } catch (err) {
      console.error('[leads] erro ao salvar:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Não foi possível salvar agora. Tente de novo.' });
    }
  };
}

export default createLeadsHandler({ store: postgresLeads });
