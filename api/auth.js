import { requireAuth } from '../middleware/requireAuth.js';
import { createMercadoPagoClient } from '../src/payments/mercadopago.js';
import {
  getOrCreateUser,
  getUserByUid,
  updateUser,
  syncLeaderboardEntry,
  getProfileByUserId,
  upsertProfile,
  getSubscriptionByUserId,
  upsertSubscription
} from '../src/db/queries.js';

// Credenciais e sessão são 100% responsabilidade do Supabase Auth
// (supabase.auth.signUp / signInWithPassword no frontend). Este backend
// nunca vê senha nem emite sessão — ele só aceita um access token do
// Supabase (Authorization: Bearer <token>), valida via requireAuth e usa
// exclusivamente req.user.uid como identidade (nunca body/query).

async function runRequireAuth(req, res) {
  let authorized = false;
  await requireAuth(req, res, () => { authorized = true; });
  return authorized; // se false, requireAuth já respondeu 401
}

export default async function authHandler(req, res, deps = {}) {
  res.setHeader('Content-Type', 'application/json');

  const { method } = req;

  // Sanitizar e extrair body com limite de segurança
  let body = req.body;
  if (!body && (method === 'POST' || method === 'PUT')) {
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 64 * 1024) { // Limite de 64KB para payload de auth
          return res.status(413).json({ error: 'Payload de requisição muito extenso.' });
        }
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString();
      body = raw ? JSON.parse(raw) : {};
    } catch (_) {
      return res.status(400).json({ error: 'Formato de requisição JSON inválido.' });
    }
  }
  body = body || {};

  // Proteção contra Prototype Pollution (chaves maliciosas explícitas no payload)
  if (
    Object.prototype.hasOwnProperty.call(body, '__proto__') ||
    Object.prototype.hasOwnProperty.call(body, 'constructor') ||
    Object.prototype.hasOwnProperty.call(body, 'prototype')
  ) {
    return res.status(400).json({ error: 'Payload malicioso detectado e bloqueado.' });
  }

  const action = req.query?.action || body.action;
  if (action !== 'get-profile' && method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST para alterar sua conta.' });
  }

  try {
    // ------------------------------------------------------------------------
    // SINCRONIZAÇÃO DE PERFIL APÓS CADASTRO/LOGIN NO SUPABASE AUTH
    // O frontend já autenticou via supabase.auth.signUp/signInWithPassword;
    // aqui só garantimos que existe uma linha de dados de aplicação (nome,
    // whatsapp, cidade, XP...) para o uid do Supabase Auth já autenticado.
    // ------------------------------------------------------------------------
    if (action === 'sync-profile') {
      if (!(await runRequireAuth(req, res))) return;
      const uid = req.user.uid;

      // Registration may be retried after a lost response. Never reset an
      // existing account's subscription, progress or personalized profile.
      const existingUser = await getUserByUid(uid);
      if (existingUser) {
        delete existingUser.passwordHash;
        return res.status(200).json({ success: true, user: existingUser });
      }

      const { name, whatsapp, cidade } = body;

      if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
        return res.status(400).json({ error: 'Por favor, informe seu nome completo (2 a 80 caracteres).' });
      }
      if (!whatsapp || typeof whatsapp !== 'string' || whatsapp.trim().length < 8 || whatsapp.trim().length > 25) {
        return res.status(400).json({ error: 'Por favor, informe um número de WhatsApp com DDD válido.' });
      }
      if (!cidade || typeof cidade !== 'string' || cidade.trim().length < 2 || cidade.trim().length > 80) {
        return res.status(400).json({ error: 'Por favor, informe sua cidade.' });
      }

      await getOrCreateUser({
        uid,
        name: name.trim(),
        email: req.user.email || '',
        targetExam: 'Concursos Públicos',
        preferredBanca: 'Cebraspe',
        city: cidade.trim(),
        whatsapp: whatsapp.trim(),
        plan: 'free',
        planPrice: 'R$ 29,90',
        xp: 0,
        streak: 1,
        hearts: 5,
      });

      await syncLeaderboardEntry({
        userId: uid,
        name: name.trim(),
        targetExam: 'Concursos Públicos',
        city: cidade.trim(),
        questionsAnswered: 0,
        streak: 1,
        xp: 0,
        plan: 'free',
      }).catch(() => {});

      await upsertProfile(uid, {
        fullName: name.trim(),
        bio: 'Estudante focado em concursos públicos.',
        city: cidade.trim(),
        phone: whatsapp.trim(),
        targetExam: 'Concursos Públicos',
        preferredBanca: 'Cebraspe',
      }).catch(() => {});

      const userRecord = await getUserByUid(uid);
      delete userRecord?.passwordHash;

      return res.status(200).json({
        success: true,
        message: 'Perfil sincronizado com sucesso.',
        user: userRecord,
      });
    }

    // ------------------------------------------------------------------------
    // DOWNGRADE PARA O PLANO GRÁTIS (autosserviço, sempre a própria conta)
    //
    // Virar PRO NUNCA passa mais por aqui: só o webhook do Mercado Pago
    // (api/payments/webhook.js), depois de confirmar uma assinatura
    // autorizada de verdade na API do Mercado Pago, pode setar plan='pro'.
    // Isso fecha o HIGH-1 da auditoria (qualquer usuário logado conseguia
    // se autopromover a PRO sem pagar nada).
    //
    // O Plano PRO é uma assinatura RECORRENTE (R$ 29,90/mês) — por isso,
    // se o usuário tiver uma assinatura ativa, o downgrade precisa
    // CANCELAR ela de verdade no Mercado Pago primeiro. Sem isso, o
    // usuário "vira grátis" só no nosso banco, mas continua sendo
    // cobrado todo mês.
    // ------------------------------------------------------------------------
    if (action === 'upgrade-plan' || action === 'downgrade-to-free') {
      if (!(await runRequireAuth(req, res))) return;

      const { plan } = body;
      if (plan === 'pro') {
        return res.status(403).json({
          error: 'A ativação do Plano PRO só é confirmada após uma assinatura aprovada. Use o checkout do Mercado Pago.',
        });
      }

      const targetUid = req.user.uid;

      const subscription = await getSubscriptionByUserId(targetUid);
      if (subscription?.mpPreapprovalId && subscription.status === 'authorized') {
        try {
          const mpClient = deps.mpClient || createMercadoPagoClient();
          await mpClient.cancelSubscription(subscription.mpPreapprovalId);
          await upsertSubscription({
            userId: targetUid,
            mpPreapprovalId: subscription.mpPreapprovalId,
            status: 'cancelled',
          });
        } catch (err) {
          console.error('[Auth Server] Falha ao cancelar assinatura no Mercado Pago:', err.message);
          return res.status(502).json({
            error: 'Não foi possível cancelar sua assinatura agora. Tente novamente em instantes.',
          });
        }
      }

      await updateUser(targetUid, { plan: 'free' });

      const currentUser = await getUserByUid(targetUid);
      if (currentUser) {
        await syncLeaderboardEntry({
          userId: targetUid,
          name: currentUser.name,
          targetExam: currentUser.targetExam || 'Polícia Federal',
          city: currentUser.city || 'Brasil',
          questionsAnswered: 0,
          streak: currentUser.streak || 1,
          xp: currentUser.xp || 0,
          plan: 'free',
        }).catch(() => {});
      }

      console.log(`[Auth Server] Plano do aluno ${targetUid} revertido para o modo gratuito.`);
      return res.status(200).json({
        success: true,
        plan: 'free',
        planPrice: 'R$ 29,90',
        message: 'Plano atualizado para o modo gratuito.',
      });
    }

    // ------------------------------------------------------------------------
    // CONSULTA DE PERFIL — sempre o do próprio chamador autenticado.
    //
    // Autorrecuperação: signUp() com confirmação de e-mail exigida devolve
    // session:null, então registerUser() nunca chega a chamar sync-profile.
    // Sem isso, o primeiro login de todo usuário que precisa confirmar
    // o e-mail (o caminho normal) nunca teria uma linha em users/profiles.
    // Criamos aqui, no primeiro get-profile autenticado que encontrar essa
    // lacuna, com os dados do cadastro (via req.user, quando disponíveis) e
    // valores de fallback nunca vazios.
    // ------------------------------------------------------------------------
    if (action === 'get-profile') {
      if (!(await runRequireAuth(req, res))) return;
      let [userRecord, profileRecord] = await Promise.all([
        getUserByUid(req.user.uid),
        getProfileByUserId(req.user.uid),
      ]);

      if (!userRecord) {
        const fallbackName = req.user.name?.trim() || req.user.email?.split('@')[0] || 'Concurseiro(a)';
        const fallbackCity = req.user.cidade?.trim() || 'Brasil';
        const fallbackWhatsapp = req.user.whatsapp?.trim() || '';

        userRecord = await getOrCreateUser({
          uid: req.user.uid,
          name: fallbackName,
          email: req.user.email || '',
          targetExam: 'Concursos Públicos',
          preferredBanca: 'Cebraspe',
          city: fallbackCity,
          whatsapp: fallbackWhatsapp,
          plan: 'free',
          planPrice: 'R$ 29,90',
          xp: 0,
          streak: 1,
          hearts: 5,
        });
        profileRecord = await upsertProfile(req.user.uid, {
          fullName: fallbackName,
          bio: 'Estudante focado em concursos públicos.',
          city: fallbackCity,
          phone: fallbackWhatsapp,
          targetExam: 'Concursos Públicos',
          preferredBanca: 'Cebraspe',
        }).catch(() => profileRecord);
      }

      if (userRecord) delete userRecord.passwordHash;
      const merged = {
        ...(userRecord || {}),
        ...(profileRecord || {}),
        uid: req.user.uid,
        email: req.user.email || userRecord?.email || null,
      };
      return res.status(200).json({
        success: true,
        profile: (userRecord || profileRecord) ? merged : null,
      });
    }

    // ------------------------------------------------------------------------
    // ATUALIZAÇÃO DE PERFIL — sempre o do próprio chamador autenticado.
    // ------------------------------------------------------------------------
    if (action === 'update-profile') {
      if (!(await runRequireAuth(req, res))) return;

      const fields = {};
      const definitions = [
        ['fullName', 'name', 2, 80], ['bio', null, 0, 500],
        ['avatarUrl', 'photoUrl', 0, 2048], ['targetExam', null, 1, 120],
        ['preferredBanca', null, 1, 80], ['city', null, 0, 80],
        ['phone', 'whatsapp', 0, 25],
      ];
      for (const [key, alias, min, max] of definitions) {
        const value = body[key] !== undefined ? body[key] : alias ? body[alias] : undefined;
        if (value === undefined) continue;
        if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
          return res.status(400).json({ error: `Campo ${key} inválido.` });
        }
        if (key === 'avatarUrl' && value && !/^https:\/\//i.test(value)) {
          return res.status(400).json({ error: 'A foto deve usar uma URL HTTPS.' });
        }
        fields[key] = value.trim();
      }
      if (!Object.keys(fields).length) return res.status(400).json({ error: 'Nenhum campo de perfil informado.' });
      const current = await getUserByUid(req.user.uid);
      const updated = await upsertProfile(req.user.uid, fields, current?.name || req.user.name || 'Concurseiro(a)');
      const userFields = {};
      for (const [profileKey, userKey] of Object.entries({ fullName: 'name', city: 'city', phone: 'whatsapp', targetExam: 'targetExam', preferredBanca: 'preferredBanca' })) {
        if (fields[profileKey] !== undefined) userFields[userKey] = fields[profileKey];
      }
      if (Object.keys(userFields).length) await updateUser(req.user.uid, userFields);

      return res.status(200).json({
        success: true,
        message: 'Perfil atualizado com sucesso!',
        profile: { ...updated, name: updated.fullName, whatsapp: updated.phone },
      });
    }

    return res.status(404).json({ error: 'Ação não reconhecida. Use sync-profile, get-profile, update-profile ou downgrade-to-free.' });
  } catch (err) {
    console.error('[Auth Server] Erro no processamento:', err.message);
    return res.status(500).json({ error: 'Erro no servidor ao processar autenticação. Tente novamente mais tarde.' });
  }
}
