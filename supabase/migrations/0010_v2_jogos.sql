-- Missão Aprendizado V2 — rodadas dos jogos (Radar do Tico, Memória,
-- Caça-palavras e Cruzadinha). Idempotente.
-- "estado" guarda o gabarito e o andamento da rodada: só o servidor lê.
-- pontos: acertos (Radar), jogadas (Memória) ou segundos (Caça-palavras e
-- Cruzadinha); null = rodada não completada.

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.game_rounds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('radar', 'memoria', 'caca', 'cruzadinha')),
  disciplina  text,
  day         date NOT NULL,
  estado      jsonb NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  pontos      integer CHECK (pontos >= 0),
  xp          integer NOT NULL DEFAULT 0 CHECK (xp >= 0)
);
CREATE INDEX IF NOT EXISTS game_rounds_user_day_idx ON v2.game_rounds (user_id, day);
CREATE INDEX IF NOT EXISTS game_rounds_user_tipo_idx ON v2.game_rounds (user_id, tipo) WHERE pontos IS NOT NULL;

ALTER TABLE v2.game_rounds ENABLE ROW LEVEL SECURITY;
