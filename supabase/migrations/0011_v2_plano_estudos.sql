-- Missão Aprendizado V2 — Marco 1: plano de estudos, revisão espaçada e
-- domínio por assunto. Idempotente (pode rodar mais de uma vez).

CREATE SCHEMA IF NOT EXISTS v2;

-- O que o aluno conta no começo (onboarding).
CREATE TABLE IF NOT EXISTS v2.study_plans (
  user_id     text PRIMARY KEY,
  prova       text NOT NULL CHECK (char_length(prova) BETWEEN 2 AND 80),
  banca       text CHECK (banca IN ('FGV', 'FCC', 'Cebraspe', 'Vunesp', 'Cesgranrio')),
  data_prova  date,
  minutos_dia smallint NOT NULL CHECK (minutos_dia IN (30, 60, 120, 180)),
  nivel       text NOT NULL CHECK (nivel IN ('iniciante', 'intermediario', 'avancado')),
  disciplinas text[] NOT NULL CHECK (cardinality(disciplinas) >= 1),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE v2.study_plans ENABLE ROW LEVEL SECURITY;

-- Revisão espaçada (hoje, amanhã, 7 e 30 dias) e dados do domínio por
-- assunto em cada questão que o aluno já respondeu.
ALTER TABLE v2.question_state ADD COLUMN IF NOT EXISTS times_right integer NOT NULL DEFAULT 0;
ALTER TABLE v2.question_state ADD COLUMN IF NOT EXISTS review_stage smallint NOT NULL DEFAULT 0;
ALTER TABLE v2.question_state ADD COLUMN IF NOT EXISTS review_due date;
ALTER TABLE v2.question_state ADD COLUMN IF NOT EXISTS last_answer_at timestamptz;

-- Preenche o que já existe a partir do histórico de respostas (só nas
-- linhas ainda não preenchidas, para poder rodar de novo sem estragar nada).
UPDATE v2.question_state qs
SET times_right = h.acertos,
    last_answer_at = h.ultima
FROM (
  SELECT user_id, question_id, count(*) FILTER (WHERE correct)::int AS acertos, max(created_at) AS ultima
  FROM v2.answers
  GROUP BY user_id, question_id
) h
WHERE qs.user_id = h.user_id AND qs.question_id = h.question_id AND qs.last_answer_at IS NULL;

-- Quem errou por último e ainda não corrigiu entra na revisão de hoje.
UPDATE v2.question_state
SET review_due = (now() AT TIME ZONE 'America/Sao_Paulo')::date
WHERE last_correct = false AND review_due IS NULL AND review_stage = 0;

CREATE INDEX IF NOT EXISTS question_state_review_idx ON v2.question_state (user_id, review_due) WHERE review_due IS NOT NULL;
