-- Missão Aprendizado V2 — limite de chamadas da API (por aluno e por IP),
-- contado aqui para valer entre todas as instâncias da Vercel. Idempotente.
-- Só o servidor usa (RLS ligado, sem políticas: a chave pública não lê nada).

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.rate_limits (
  chave  text NOT NULL,          -- ex.: "ip:1.2.3.4" ou "jogo:<id do aluno>"
  janela timestamptz NOT NULL,   -- começo da janela (ex.: o minuto)
  n      integer NOT NULL DEFAULT 1,
  PRIMARY KEY (chave, janela)
);
CREATE INDEX IF NOT EXISTS rate_limits_janela_idx ON v2.rate_limits (janela);

ALTER TABLE v2.rate_limits ENABLE ROW LEVEL SECURITY;
