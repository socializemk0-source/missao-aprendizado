-- Missão Aprendizado V2 — lista de contatos da página inicial (captura).
-- Idempotente. Só guarda quem marcou o consentimento (LGPD).

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.leads (
  email       text PRIMARY KEY CHECK (char_length(email) BETWEEN 3 AND 254 AND email = lower(email)),
  name        text CHECK (char_length(name) <= 60),
  source      text NOT NULL DEFAULT 'landing' CHECK (char_length(source) <= 40),
  consent_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE v2.leads ENABLE ROW LEVEL SECURITY;
