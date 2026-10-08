-- Missão Aprendizado V2 — /api/game à prova de repetição. Idempotente.
-- 1) Chave de idempotência: cada tentativa de resposta, missão, simulado ou
--    jogada leva um Idempotency-Key (uuid). Repetir a mesma chave devolve a
--    mesma resposta, sem creditar XP de novo. Vale por 24 horas.
-- 2) Versão em user_stats (trava otimista): XP, vidas e sequência só são
--    gravados se ninguém gravou depois da leitura.
-- Só o servidor usa (RLS ligado, sem políticas: a chave pública não lê nada).

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.idempotency_keys (
  user_id    text NOT NULL,
  key        uuid NOT NULL,
  action     text NOT NULL,
  body_hash  text NOT NULL,          -- sha256 da ação + parâmetros validados
  status     integer,                -- null = ainda processando
  response   jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS idempotency_keys_created_idx ON v2.idempotency_keys (created_at);

ALTER TABLE v2.idempotency_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE v2.user_stats ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
