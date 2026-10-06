-- Missão Aprendizado V2 — consentimento de cookies de anúncio (medição,
-- fase A). Idempotente (pode rodar mais de uma vez).
-- Só o servidor usa (RLS ligado, sem políticas: a chave pública não lê nada).

CREATE SCHEMA IF NOT EXISTS v2;

-- Uma linha por aluno: aceitou ou recusou os cookies de anúncio, e quando.
-- Fica fora de v2.profiles para não misturar marketing com o perfil.
CREATE TABLE IF NOT EXISTS v2.marketing_usuarios (
  user_id          text PRIMARY KEY,           -- id do usuário no Supabase Auth
  consentimento    boolean,                    -- null = ainda não escolheu
  consentimento_em timestamptz,                -- quando escolheu (ou mudou)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE v2.marketing_usuarios ENABLE ROW LEVEL SECURITY;
