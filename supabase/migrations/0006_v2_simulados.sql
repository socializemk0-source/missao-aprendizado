-- Missão Aprendizado V2 — banco de questões, dificuldade real e simulados.
-- Idempotente.

CREATE SCHEMA IF NOT EXISTS v2;

-- Questões importadas das provas (as da trilha continuam no código).
CREATE TABLE IF NOT EXISTS v2.questions (
  id          text PRIMARY KEY,
  disciplina  text NOT NULL,
  assunto     text NOT NULL,
  enunciado   text NOT NULL,
  alternativas jsonb NOT NULL CHECK (jsonb_typeof(alternativas) = 'array' AND jsonb_array_length(alternativas) BETWEEN 2 AND 5),
  correta     smallint NOT NULL CHECK (correta BETWEEN 0 AND 4),
  explicacao  text NOT NULL,
  fonte       jsonb NOT NULL,
  dificuldade smallint NOT NULL CHECK (dificuldade BETWEEN 1 AND 3), -- estimada na importação
  status      text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'revisao', 'anulada')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questions_ativas_idx ON v2.questions (disciplina) WHERE status = 'ativa';

-- 1ª resposta de cada aluno a cada questão: é daqui que sai a dificuldade real.
CREATE TABLE IF NOT EXISTS v2.question_stats (
  question_id text PRIMARY KEY,
  respostas   integer NOT NULL DEFAULT 0 CHECK (respostas >= 0),
  acertos     integer NOT NULL DEFAULT 0 CHECK (acertos >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS v2.simulados (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        text NOT NULL,
  day            date NOT NULL,
  nivel          text NOT NULL CHECK (nivel IN ('facil', 'medio', 'dificil', 'misto')),
  disciplinas    text[] NOT NULL,
  banca          text,
  question_ids   text[] NOT NULL,
  time_limit_sec integer CHECK (time_limit_sec > 0),
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  acertos        integer,
  pct            smallint CHECK (pct BETWEEN 0 AND 100),
  result         jsonb
);
CREATE INDEX IF NOT EXISTS simulados_user_idx ON v2.simulados (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS simulados_nivel_idx ON v2.simulados (nivel, pct) WHERE finished_at IS NOT NULL;

-- Respostas dadas no simulado também contam (missões, revisão).
ALTER TABLE v2.answers DROP CONSTRAINT IF EXISTS answers_mode_check;
ALTER TABLE v2.answers ADD CONSTRAINT answers_mode_check
  CHECK (mode IN ('trilha', 'revisar', 'pratica', 'desafio', 'simulado'));

ALTER TABLE v2.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.question_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.simulados ENABLE ROW LEVEL SECURITY;
