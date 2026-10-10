-- Missão Aprendizado V2 — o schema v2 fechado para a chave pública. Idempotente.
-- Todo acesso ao v2 é pelo servidor (Vercel Functions, conexão do dono das
-- tabelas). A RLS já está ligada em todas as tabelas, sem políticas; aqui os
-- papéis do PostgREST (anon e authenticated) perdem também qualquer
-- permissão no schema, inclusive para tabelas criadas no futuro. Assim, mesmo
-- que alguém exponha o v2 na Data API, a chave pública com o JWT de um aluno
-- não lê nem grava nada (camada extra, além da RLS).

DO $$
DECLARE
  papel text;
BEGIN
  IF to_regnamespace('v2') IS NULL THEN RETURN; END IF;
  FOREACH papel IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA v2 FROM %I', papel);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA v2 FROM %I', papel);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA v2 FROM %I', papel);
      EXECUTE format('REVOKE USAGE ON SCHEMA v2 FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA v2 REVOKE ALL ON TABLES FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA v2 REVOKE ALL ON SEQUENCES FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA v2 REVOKE ALL ON FUNCTIONS FROM %I', papel);
    END IF;
  END LOOP;
END $$;
