-- Missão Aprendizado V2 — jogo: XP, vidas, sequência, respostas, fases,
-- missões e validade do PRO. Idempotente.

CREATE SCHEMA IF NOT EXISTS v2;

-- Validade do PRO (preenchida pelos pagamentos, etapa 5). NULL = grátis.
ALTER TABLE v2.profiles ADD COLUMN IF NOT EXISTS pro_until timestamptz;

CREATE TABLE IF NOT EXISTS v2.user_stats (
  user_id           text PRIMARY KEY,
  xp                integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  hearts            integer NOT NULL DEFAULT 5 CHECK (hearts BETWEEN 0 AND 5),
  hearts_updated_at timestamptz NOT NULL DEFAULT now(),
  streak            integer NOT NULL DEFAULT 0 CHECK (streak >= 0),
  best_streak       integer NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  last_study_day    date,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_stats_xp_idx ON v2.user_stats (xp DESC);

CREATE TABLE IF NOT EXISTS v2.question_state (
  user_id      text NOT NULL,
  question_id  text NOT NULL,
  ever_correct boolean NOT NULL,
  last_correct boolean NOT NULL,
  times_wrong  integer NOT NULL DEFAULT 0 CHECK (times_wrong >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS v2.answers (
  id          bigserial PRIMARY KEY,
  user_id     text NOT NULL,
  question_id text NOT NULL,
  choice      smallint NOT NULL,
  correct     boolean NOT NULL,
  mode        text NOT NULL CHECK (mode IN ('trilha', 'revisar', 'pratica', 'desafio')),
  day         date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS answers_user_day_idx ON v2.answers (user_id, day);

CREATE TABLE IF NOT EXISTS v2.phase_completions (
  user_id      text NOT NULL,
  phase_id     text NOT NULL,
  day          date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, phase_id)
);

CREATE TABLE IF NOT EXISTS v2.mission_claims (
  user_id    text NOT NULL,
  day        date NOT NULL,
  mission_id text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day, mission_id)
);

ALTER TABLE v2.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.question_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.phase_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.mission_claims ENABLE ROW LEVEL SECURITY;
