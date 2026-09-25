-- Missão Aprendizado V2 — perfis.
-- Tudo do V2 fica no schema "v2": o V1 (schema "public") continua intacto
-- no mesmo projeto Supabase. Idempotente: pode rodar mais de uma vez.

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.profiles (
  user_id         text PRIMARY KEY,           -- id do usuário no Supabase Auth
  display_name    text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  target_exam     text CHECK (char_length(target_exam) <= 80),
  preferred_banca text CHECK (char_length(preferred_banca) <= 40),
  city            text CHECK (char_length(city) <= 80),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- O acesso é só pelo servidor (conexão direta ao Postgres). RLS ligado e
-- sem políticas: a API pública do Supabase (chave anon) não lê nem escreve.
ALTER TABLE v2.profiles ENABLE ROW LEVEL SECURITY;
