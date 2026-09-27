-- Missão Aprendizado V2 — banco de questões.
-- Idempotente. Duas origens possíveis:
--   'propria' → escrita pela nossa equipe (enunciado e explicação nossos).
--               Pode dizer em que estilo de banca foi escrita, mas não finge
--               ser de prova oficial: banca/ano/órgão/cargo ficam vazios.
--   'oficial' → tirada de prova oficial. Só entra com a autorização por
--               escrito da banca registrada em "autorizacao" (os termos de
--               uso das bancas proíbem reproduzir sem autorização) e com a
--               origem completa: banca, ano, órgão, cargo e link da prova.

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.questions (
  id             text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(id) <= 60),
  subject        text NOT NULL CHECK (subject IN (
                   'portugues', 'raciocinio_logico', 'informatica',
                   'direito_constitucional', 'direito_administrativo')),
  topic          text NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 80),
  level          text NOT NULL DEFAULT 'medio' CHECK (level IN ('fundamental', 'medio', 'superior')),
  difficulty     smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  statement      text NOT NULL CHECK (char_length(statement) BETWEEN 10 AND 4000),
  options        jsonb NOT NULL CHECK (jsonb_typeof(options) = 'array'
                   AND jsonb_array_length(options) BETWEEN 2 AND 5),
  correct_index  smallint NOT NULL CHECK (correct_index >= 0),
  explanation    text NOT NULL CHECK (char_length(explanation) BETWEEN 10 AND 4000),
  legal_basis    text CHECK (char_length(legal_basis) <= 200),   -- ex.: "CF/88, art. 5º, XI"
  style          text CHECK (char_length(style) <= 40),          -- estilo de banca (só 'propria')
  origin         text NOT NULL CHECK (origin IN ('propria', 'oficial')),
  banca          text CHECK (char_length(banca) <= 40),
  exam_year      smallint CHECK (exam_year BETWEEN 1988 AND 2100),
  orgao          text CHECK (char_length(orgao) <= 120),
  cargo          text CHECK (char_length(cargo) <= 120),
  source_url     text CHECK (source_url ~ '^https://'),
  authorization_note text CHECK (char_length(authorization_note) <= 500),
  status         text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicada')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT questions_correct_in_range CHECK (correct_index < jsonb_array_length(options)),
  CONSTRAINT questions_origin_fields CHECK (
    (origin = 'propria'
      AND banca IS NULL AND exam_year IS NULL AND orgao IS NULL AND cargo IS NULL
      AND source_url IS NULL AND authorization_note IS NULL)
    OR
    (origin = 'oficial'
      AND banca IS NOT NULL AND exam_year IS NOT NULL AND orgao IS NOT NULL
      AND cargo IS NOT NULL AND source_url IS NOT NULL AND authorization_note IS NOT NULL
      AND style IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS questions_subject_published_idx
  ON v2.questions (subject, difficulty) WHERE status = 'publicada';

-- Acesso só pelo servidor. RLS ligado e sem políticas.
ALTER TABLE v2.questions ENABLE ROW LEVEL SECURITY;
