-- Missão Aprendizado V2 — Casa do Tico: onde cada item está no quarto de cada
-- aluno ({ itemId: lugar }). Os itens e o que libera cada um estão no código
-- (shared/casa.ts); aqui fica só a arrumação. Idempotente.

CREATE SCHEMA IF NOT EXISTS v2;

CREATE TABLE IF NOT EXISTS v2.casa_tico (
  user_id    text PRIMARY KEY,
  itens      jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(itens) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Como as outras tabelas do v2 (migrações 0016 e 0017): só o servidor lê e
-- grava. A chave pública e o JWT do aluno não alcançam nada.
ALTER TABLE v2.casa_tico ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE NOTICE 'papéis anon/authenticated não existem: nada a fazer';
    RETURN;
  END IF;
  REVOKE ALL ON v2.casa_tico FROM anon, authenticated;
  DROP POLICY IF EXISTS "select: so o servidor" ON v2.casa_tico;
  DROP POLICY IF EXISTS "insert: so o servidor" ON v2.casa_tico;
  DROP POLICY IF EXISTS "update: so o servidor" ON v2.casa_tico;
  DROP POLICY IF EXISTS "delete: so o servidor" ON v2.casa_tico;
  CREATE POLICY "select: so o servidor" ON v2.casa_tico AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false);
  CREATE POLICY "insert: so o servidor" ON v2.casa_tico AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
  CREATE POLICY "update: so o servidor" ON v2.casa_tico AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
  CREATE POLICY "delete: so o servidor" ON v2.casa_tico AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);
END $$;
