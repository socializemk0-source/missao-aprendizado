-- Missão Aprendizado V2 — compras iniciadas no Mercado Pago. Idempotente.
-- Cada ida ao checkout grava a external_reference enviada. Se o aviso do
-- Mercado Pago não chegar, o botão "Verificar meu pagamento" procura os
-- pagamentos dessas referências e libera o PRO (sempre conferindo na API).

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.checkouts (
  reference  text PRIMARY KEY,
  user_id    text NOT NULL,
  cycle      text NOT NULL CHECK (cycle IN ('monthly', 'annual')),
  paid       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkouts_user_idx ON v2.checkouts (user_id, created_at DESC);

ALTER TABLE v2.checkouts ENABLE ROW LEVEL SECURITY;
