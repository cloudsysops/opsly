-- Peskids operations tenant isolation.
-- Fixes the previous policies that exposed every active pool and scheduled class
-- to any authenticated or anonymous PostgREST caller.

BEGIN;

-- The application accesses these tables through server-side service_role clients.
-- Do not expose them directly to anon/authenticated clients; API routes perform
-- their own staff/family authorization before using the service client.
REVOKE ALL ON peskids.pools FROM anon, authenticated;
REVOKE ALL ON peskids.classes FROM anon, authenticated;
REVOKE ALL ON peskids.class_enrollments FROM anon, authenticated;
REVOKE ALL ON peskids.payments FROM anon, authenticated;

DROP POLICY IF EXISTS "authenticated_read_active_pools" ON peskids.pools;
DROP POLICY IF EXISTS "authenticated_read_scheduled_classes" ON peskids.classes;
DROP POLICY IF EXISTS "family_read_own_enrollments" ON peskids.class_enrollments;
DROP POLICY IF EXISTS "family_insert_own_enrollments" ON peskids.class_enrollments;

-- Keep explicit service-role policies for environments where the role does not
-- rely solely on Supabase's bypassrls behavior.
DROP POLICY IF EXISTS "service_role_full_pools" ON peskids.pools;
CREATE POLICY "service_role_full_pools" ON peskids.pools
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_classes" ON peskids.classes;
CREATE POLICY "service_role_full_classes" ON peskids.classes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_class_enrollments" ON peskids.class_enrollments;
CREATE POLICY "service_role_full_class_enrollments" ON peskids.class_enrollments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_payments" ON peskids.payments;
CREATE POLICY "service_role_full_payments" ON peskids.payments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- These policies are intentionally restrictive and are defense-in-depth for
-- authenticated PostgREST callers if table grants are later reintroduced.
-- Both metadata locations are supported because existing Peskids auth uses
-- user_metadata while platform-issued sessions may use app_metadata.
CREATE POLICY "tenant_read_active_pools" ON peskids.pools
  FOR SELECT TO authenticated
  USING (
    active = true
    AND tenant_slug = COALESCE(
      auth.jwt() #>> '{user_metadata,tenant_slug}',
      auth.jwt() #>> '{app_metadata,tenant_slug}'
    )
  );

CREATE POLICY "tenant_read_scheduled_classes" ON peskids.classes
  FOR SELECT TO authenticated
  USING (
    status = 'scheduled'
    AND tenant_slug = COALESCE(
      auth.jwt() #>> '{user_metadata,tenant_slug}',
      auth.jwt() #>> '{app_metadata,tenant_slug}'
    )
  );

CREATE POLICY "tenant_family_read_own_enrollments" ON peskids.class_enrollments
  FOR SELECT TO authenticated
  USING (
    family_user_id = auth.uid()
    AND tenant_slug = COALESCE(
      auth.jwt() #>> '{user_metadata,tenant_slug}',
      auth.jwt() #>> '{app_metadata,tenant_slug}'
    )
  );

CREATE POLICY "tenant_family_insert_own_enrollments" ON peskids.class_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    family_user_id = auth.uid()
    AND tenant_slug = COALESCE(
      auth.jwt() #>> '{user_metadata,tenant_slug}',
      auth.jwt() #>> '{app_metadata,tenant_slug}'
    )
  );

COMMENT ON TABLE peskids.pools IS
  'Tenant-scoped operations data. Direct public access is denied; use authorized server APIs.';
COMMENT ON TABLE peskids.classes IS
  'Tenant-scoped operations data. Direct public access is denied; use authorized server APIs.';

COMMIT;
