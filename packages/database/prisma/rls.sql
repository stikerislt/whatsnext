-- Row-Level Security policies for tenant isolation
-- Run after Prisma migrations: psql $DATABASE_URL -f prisma/rls.sql

CREATE OR REPLACE FUNCTION current_company_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_company', true), '')::uuid;
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'companies', 'departments', 'users', 'roles', 'user_roles',
      'strategic_goals', 'tactics', 'kpis', 'strategy_documents',
      'projects', 'project_members', 'tasks', 'employees', 'skills',
      'employee_skills', 'cv_documents', 'work_allocations', 'integrations',
      'marketplace_requests', 'marketplace_matches', 'decisions', 'signals',
      'bonus_cycles', 'bonus_criteria', 'bonus_scores', 'ai_conversations',
      'audit_logs', 'embeddings'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    IF t = 'companies' THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I FOR ALL USING (id = current_company_id()) WITH CHECK (id = current_company_id())',
        t
      );
    ELSIF t IN ('roles', 'user_roles') THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I FOR ALL USING (
          EXISTS (SELECT 1 FROM users u WHERE u.id = user_roles.user_id AND u.company_id = current_company_id())
          OR EXISTS (SELECT 1 FROM roles r WHERE r.id = user_roles.role_id AND r.company_id = current_company_id())
        )',
        t
      );
    ELSIF t = 'user_roles' THEN
      NULL;
    ELSE
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I FOR ALL USING ("companyId" = current_company_id()) WITH CHECK ("companyId" = current_company_id())',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Partial index for unlinked projects (performance at scale)
CREATE INDEX IF NOT EXISTS idx_projects_unlinked
  ON projects ("companyId")
  WHERE type = 'unlinked';
