// /api/me — o aluno logado e o perfil dele no V2.
//   GET   → perfil (criado no primeiro acesso)
//   PATCH → atualiza campos do perfil (só os permitidos, validados)

import { authenticate, type VerifyToken } from '../server/auth.js';
import { jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { postgresProfiles, type ProfileStore, type ProfileUpdate } from '../server/profiles.js';
import { verifySupabaseToken } from '../server/supabase.js';

// Campo editável → tamanho máximo. Obrigatórios não aceitam vazio/null.
const EDITABLE: Record<keyof ProfileUpdate, { max: number; required: boolean }> = {
  displayName: { max: 60, required: true },
  targetExam: { max: 80, required: false },
  preferredBanca: { max: 40, required: false },
  city: { max: 80, required: false },
};

export function parseProfileUpdate(body: Record<string, unknown> | null): ProfileUpdate | string {
  if (!body) return 'Corpo inválido.';
  const update: ProfileUpdate = {};
  for (const [key, raw] of Object.entries(body)) {
    const rule = EDITABLE[key as keyof ProfileUpdate];
    if (!rule) return `Campo não editável: ${key}.`;
    if (raw === null && !rule.required) {
      update[key as keyof ProfileUpdate] = null as never;
      continue;
    }
    if (typeof raw !== 'string') return `Valor inválido em ${key}.`;
    const value = raw.trim();
    if (!value && rule.required) return `${key} não pode ficar vazio.`;
    if (value.length > rule.max) return `${key} passa de ${rule.max} caracteres.`;
    update[key as keyof ProfileUpdate] = (value || null) as never;
  }
  if (Object.keys(update).length === 0) return 'Nada para atualizar.';
  return update;
}

export function createMeHandler(deps: { verifyToken: VerifyToken; profiles: ProfileStore }) {
  return async function meHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'PATCH') return methodNotAllowed(res, ['GET', 'PATCH']);

    const user = await authenticate(req, res, deps.verifyToken);
    if (!user) return;

    try {
      let profile = await deps.profiles.ensure(user);
      if (req.method === 'PATCH') {
        const update = parseProfileUpdate(jsonBody(req));
        if (typeof update === 'string') {
          res.status(400).json({ error: update });
          return;
        }
        profile = (await deps.profiles.update(user.id, update)) ?? profile;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ user: { id: user.id, email: user.email }, profile });
    } catch (err) {
      console.error('[me] erro:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Não foi possível carregar seu perfil agora.' });
    }
  };
}

export default createMeHandler({ verifyToken: verifySupabaseToken, profiles: postgresProfiles });
