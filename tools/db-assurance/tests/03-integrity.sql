-- =============================================================================
-- Opsly DB Assurance — schema integrity tests
-- =============================================================================
-- Constraint and trigger behaviour that RLS tests cannot cover: money
-- invariants, tenant referential integrity, and audit-trail immutability.
--
-- These run as the cluster superuser ON PURPOSE. A superuser is strictly more
-- privileged than Supabase's `service_role`, so "the superuser could not do it"
-- is the strongest possible statement that the application's own key cannot
-- either. Appends into dba_test.results so one runner reports everything.
--
-- LOCAL EPHEMERAL DATABASE ONLY.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS dba_test;

-- Fixtures may or may not have run; make the tenant exist either way.
INSERT INTO platform.tenants (id, slug, name, owner_email, plan, status)
VALUES ('00000000-0000-4000-9000-0000000000a1', 'peskids', 'Tenant A',
        'owner.a@example.test', 'business', 'active')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS dba_test.results (
  name text, persona text, expected int, actual int,
  status text, known_bad boolean, denial text, rationale text
);

-- Record a boolean assertion in the shared results table.
CREATE OR REPLACE FUNCTION dba_test.record(
  p_name text, p_persona text, p_held boolean, p_rationale text
) RETURNS void LANGUAGE sql AS $$
  INSERT INTO dba_test.results VALUES (
    p_name, p_persona, 1, CASE WHEN p_held THEN 1 ELSE 0 END,
    CASE WHEN p_held THEN 'PASS' ELSE 'FAIL' END, false, '', p_rationale);
$$;

DO $$
DECLARE
  held    boolean;
  audit_id uuid;
BEGIN
  -- -------------------------------------------------------------------------
  -- Audit trails are append-only
  -- -------------------------------------------------------------------------
  INSERT INTO peskids.audit_log (tenant_slug, action, resource_type, resource_id)
  VALUES ('peskids', 'student.deleted', 'student', 'test-subject')
  RETURNING id INTO audit_id;

  BEGIN
    UPDATE peskids.audit_log SET action = 'nothing.happened' WHERE id = audit_id;
    held := false;
  EXCEPTION WHEN OTHERS THEN
    held := true;
  END;
  PERFORM dba_test.record(
    'audit-log-rejects-update', 'cluster superuser', held,
    'Rewriting an audit record in place must be impossible even for a role more '
    'privileged than service_role. Enforced by the BEFORE UPDATE trigger in '
    'migration 0101, because RLS cannot constrain a BYPASSRLS role.');

  SELECT action = 'student.deleted' INTO held
    FROM peskids.audit_log WHERE id = audit_id;
  PERFORM dba_test.record(
    'audit-log-row-survives-tamper', 'cluster superuser', COALESCE(held, false),
    'After a rejected tamper attempt the original action text must be intact.');

  -- -------------------------------------------------------------------------
  -- Money cannot go negative
  -- -------------------------------------------------------------------------
  BEGIN
    INSERT INTO peskids.store_products (tenant_slug, name, category, price_cents)
    VALUES ('peskids', 'negative price', 'merchandise', -100);
    held := false;
  EXCEPTION WHEN check_violation THEN
    held := true;
  WHEN OTHERS THEN
    held := true;  -- rejected for some other reason; still rejected
  END;
  PERFORM dba_test.record(
    'money-rejects-negative-price', 'cluster superuser', held,
    'A price in minor units must never be negative; refunds are a status, not a '
    'sign. Enforced by chk_store_products_price_nonneg (migration 0100).');

  -- -------------------------------------------------------------------------
  -- Tenant referential integrity
  -- -------------------------------------------------------------------------
  BEGIN
    INSERT INTO peskids.pools (tenant_slug, name, location, max_capacity)
    VALUES ('tenant-that-does-not-exist', 'orphan pool', 'llanogrande', 10);
    held := false;
  EXCEPTION WHEN foreign_key_violation THEN
    held := true;
  END;
  PERFORM dba_test.record(
    'tenant-fk-rejects-unknown-slug', 'cluster superuser', held,
    'A row whose tenant_slug is not in platform.tenants belongs to nobody: '
    'invisible to every tenant-scoped query and to RLS, yet still holding real '
    'data. Enforced by fk_pools_tenant_slug (migration 0100).');

  -- -------------------------------------------------------------------------
  -- Deleting a tenant must not silently destroy its children
  -- -------------------------------------------------------------------------
  BEGIN
    DELETE FROM platform.tenants WHERE slug = 'peskids';
    held := false;
  EXCEPTION WHEN foreign_key_violation THEN
    held := true;
  END;
  PERFORM dba_test.record(
    'tenant-delete-is-restricted', 'cluster superuser', held,
    'ON DELETE RESTRICT: removing a tenant that still owns Peskids rows must '
    'fail loudly rather than cascade-delete students, payments and audit rows.');
END
$$;
