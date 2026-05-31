-- Peskids operations MVP: PostgREST grants + RLS policies (mirrors apps/peskids/migrations/010_*)

BEGIN;

GRANT USAGE ON SCHEMA peskids TO service_role, authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.pools TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.classes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.class_enrollments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.payments TO service_role;

GRANT SELECT ON peskids.pools TO authenticated, anon;
GRANT SELECT ON peskids.classes TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA peskids
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

DO $$ BEGIN
  CREATE POLICY "service_role_full_pools" ON peskids.pools
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_full_classes" ON peskids.classes
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_full_class_enrollments" ON peskids.class_enrollments
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_full_payments" ON peskids.payments
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated_read_active_pools" ON peskids.pools
    FOR SELECT USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated_read_scheduled_classes" ON peskids.classes
    FOR SELECT USING (status = 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "family_read_own_enrollments" ON peskids.class_enrollments
    FOR SELECT USING (family_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "family_insert_own_enrollments" ON peskids.class_enrollments
    FOR INSERT WITH CHECK (family_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
