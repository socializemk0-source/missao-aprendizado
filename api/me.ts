// /api/me — o aluno logado e o perfil dele no V2.
//   GET    → perfil (criado no primeiro acesso)
//   PATCH  → atualiza campos do perfil (só os permitidos, validados)
//   DELETE { confirmar: "EXCLUIR" } → exclui a conta: dados do app e login

import { authenticate, type VerifyToken } from '../server/auth.js';
import { jsonBody, methodNotAllowed, type ApiRequest, type ApiResponse } from '../server/http.js';
import { postgresProfiles, type ProfileStore, type ProfileUpdate } from '../server/profiles.js';
import { verifySupabaseToken } from '../server/supabase.js';
import { errorText } from '../server/log.js';
import { LIMITES, limitarAluno, limitarIp, postgresLimiter, type RateLimiter } from '../server/limite.js';
import { postgresConta, supabaseRemoverLogin, type ContaStore, type RemoverLogin } from '../server/conta.js';

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

export function createMeHandler(deps: {
  verifyToken: VerifyToken;
  profiles: ProfileStore;
  limiter?: RateLimiter | null;
  conta?: ContaStore;
  removerLogin?: RemoverLogin | null; // null = sem chave de administrador
}) {
  return async function meHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'PATCH' && req.method !== 'DELETE') return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
    if (!(await limitarIp(deps.limiter, req, res))) return;

    const user = await authenticate(req, res, deps.verifyToken);
    if (!user) return;
    if (!(await limitarAluno(deps.limiter, res, 'perfil', user.id, LIMITES.perfilPorMinuto))) return;

    if (req.method === 'DELETE') {
      res.setHeader('Cache-Control', 'no-store');
      if (jsonBody(req)?.confirmar !== 'EXCLUIR') {
        res.status(400).json({ error: 'Para excluir a conta, digite EXCLUIR no campo de confirmação.', code: 'CONFIRMACAO' });
        return;
      }
      if (!deps.conta || !deps.removerLogin) {
        console.error('[me] exclusão de conta sem SUPABASE_SERVICE_ROLE_KEY configurada');
        res.status(503).json({ error: 'A exclusão automática não está disponível agora. Escreva para o contato da Política de Privacidade e nós excluímos para você.', code: 'EXCLUSAO_INDISPONIVEL' });
        return;
      }
      try {
        await deps.conta.excluir(user.id, user.email);
      } catch (err) {
        console.error('[me] erro ao apagar os dados da conta:', errorText(err));
        res.status(500).json({ error: 'Não foi possível excluir a conta agora. Nada foi perdido; tente de novo.' });
        return;
      }
      try {
        await deps.removerLogin(user.id);
      } catch (err) {
        console.error('[me] dados apagados, mas o login não foi removido:', errorText(err));
        res.status(502).json({ error: 'Seus dados foram apagados, mas não conseguimos remover o login. Tente de novo em instantes.', code: 'LOGIN_NAO_REMOVIDO' });
        return;
      }
      res.status(200).json({ excluida: true });
      return;
    }

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
      console.error('[me] erro:', errorText(err));
      res.status(500).json({ error: 'Não foi possível carregar seu perfil agora.' });
    }
  };
}

export default createMeHandler({
  verifyToken: verifySupabaseToken, profiles: postgresProfiles, limiter: postgresLimiter,
  conta: postgresConta, removerLogin: supabaseRemoverLogin(),
});
