-- Missão Aprendizado V2 — pagamentos do passe PRO (Mercado Pago). Idempotente.
-- payment_id é o id do pagamento no Mercado Pago: o mesmo pagamento nunca
-- soma dias duas vezes, venha pelo webhook ou pela volta do checkout.

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.payments (
  payment_id text PRIMARY KEY,
  user_id    text NOT NULL,
  cycle      text NOT NULL CHECK (cycle IN ('monthly', 'annual')),
  days       integer NOT NULL CHECK (days > 0),
  amount     numeric(10, 2) NOT NULL,
  status     text NOT NULL CHECK (status IN ('approved', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_user_idx ON v2.payments (user_id, created_at DESC);

ALTER TABLE v2.payments ENABLE ROW LEVEL SECURITY;
