-- Missão Aprendizado V2 — políticas EXPLÍCITAS de RLS em todas as tabelas do
-- v2. Idempotente. Rode de novo depois de criar tabela nova no v2 (vale para
-- todas as tabelas que existirem; tests/server/rls-postgrest.pg.test.ts
-- confere os 4 comandos em cada uma).
--
-- O v2 é acessado só pelo servidor (conexão do dono das tabelas, que não
-- passa pela RLS). A chave pública (anon) e o JWT de um aluno (authenticated)
-- não leem nem gravam nada aqui. A RLS já estava ligada e sem políticas (=
-- nada visível) e a 0016 tirou as permissões; agora a negação fica escrita,
-- comando por comando (SELECT, INSERT, UPDATE, DELETE), como política
-- restritiva "false". Nenhuma política permissiva: nada é liberado.
-- Também apaga qualquer política criada fora das migrações (dashboard).

DO $$
DECLARE
  t record;
  pol record;
BEGIN
  IF to_regnamespace('v2') IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE NOTICE 'papéis anon/authenticated não existem: nada a fazer';
    RETURN;
  END IF;

  FOR t IN SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'v2'::regnamespace AND c.relkind IN ('r', 'p') ORDER BY 1 LOOP
    EXECUTE format('ALTER TABLE v2.%I ENABLE ROW LEVEL SECURITY', t.relname);
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'v2' AND tablename = t.relname LOOP
      EXECUTE format('DROP POLICY %I ON v2.%I', pol.policyname, t.relname);
    END LOOP;
    EXECUTE format('CREATE POLICY "select: so o servidor" ON v2.%I AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (false)', t.relname);
    EXECUTE format('CREATE POLICY "insert: so o servidor" ON v2.%I AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false)', t.relname);
    EXECUTE format('CREATE POLICY "update: so o servidor" ON v2.%I AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false)', t.relname);
    EXECUTE format('CREATE POLICY "delete: so o servidor" ON v2.%I AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false)', t.relname);
  END LOOP;
END $$;
