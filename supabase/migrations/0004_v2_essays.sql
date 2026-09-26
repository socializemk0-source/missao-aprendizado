-- Missão Aprendizado V2 — redações corrigidas pela IA. Idempotente.
-- status 'reservada' = vaga do Plano Grátis segura enquanto a IA corrige;
-- vira 'corrigida' com a nota, ou é apagada se a correção falhar.

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.essays (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  topic_id    text NOT NULL,
  topic_title text NOT NULL,
  banca       text NOT NULL,
  content     text NOT NULL CHECK (char_length(content) <= 10000),
  status      text NOT NULL CHECK (status IN ('reservada', 'corrigida')),
  score       smallint CHECK (score BETWEEN 0 AND 100),
  report      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  graded_at   timestamptz
);
CREATE INDEX IF NOT EXISTS essays_user_created_idx ON v2.essays (user_id, created_at DESC);

-- Só o servidor (conexão direta) acessa; a chave pública do Supabase não.
ALTER TABLE v2.essays ENABLE ROW LEVEL SECURITY;
