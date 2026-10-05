-- Missão Aprendizado V2 — revisão das questões por professor. Idempotente.
-- Só o servidor usa (RLS ligado, sem políticas: a chave pública não lê nada).
-- Como cadastrar um professor: docs/revisao-professores.md.

CREATE SCHEMA IF NOT EXISTS v2;

-- Quem pode revisar, pelo e-mail do login. disciplinas NULL = todas as matérias.
CREATE TABLE IF NOT EXISTS v2.revisores (
  email       text PRIMARY KEY,
  nome        text,
  disciplinas text[],
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS revisores_email_lower_idx ON v2.revisores (lower(email));

-- Cada decisão do professor, com a versão do texto que ele viu.
-- acao: 'aprovar' | 'corrigir' | 'descartar'.
CREATE TABLE IF NOT EXISTS v2.question_reviews (
  id            bigserial PRIMARY KEY,
  question_id   text NOT NULL,
  versao        text NOT NULL,
  acao          text NOT NULL CHECK (acao IN ('aprovar', 'corrigir', 'descartar')),
  nota          text,
  user_id       text NOT NULL,
  revisor_email text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_reviews_questao_idx ON v2.question_reviews (question_id, created_at DESC);

ALTER TABLE v2.revisores ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.question_reviews ENABLE ROW LEVEL SECURITY;
