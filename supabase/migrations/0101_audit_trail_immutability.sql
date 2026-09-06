-- =============================================================================
-- 0101 — Make audit trails actually immutable
-- =============================================================================
-- Classification: SAFE_ADDITIVE (see docs/database/MIGRATION-POLICY.md)
--
-- The Database Assurance audit found that `peskids.audit_log` and
-- `platform.audit_log` carry a single `FOR ALL` policy, so an UPDATE or DELETE
-- against them is permitted. `platform.audit_events` already does this
-- correctly — explicit `FOR UPDATE`/`FOR DELETE` policies whose USING clause is
-- `false` — and this migration brings the other two up to that standard.
--
-- RLS policies alone are not sufficient here. Supabase's `service_role` is
-- BYPASSRLS, and the applications write audit rows with the service key, so
-- policies never even evaluate for the account most likely to tamper with the
-- log — whether through a bug or through a stolen key. The real enforcement is
-- therefore a BEFORE UPDATE trigger, which fires for every role including
-- BYPASSRLS ones and the table owner. The policies are kept as a second layer
-- for any future non-service caller.
--
-- DELETE is deliberately NOT blocked: retention (see
-- docs/database/DATA-RETENTION-POLICY.md) requires the ability to remove aged
-- audit rows. What is blocked is *rewriting history in place*, which has no
-- legitimate use at all.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Immutability trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION platform.audit_row_is_immutable()
RETURNS trigger
LANGUAGE plpgsql
-- SECURITY INVOKER (the default) is correct: this function takes no privileged
-- action, and an explicit search_path keeps it from resolving to a shadowed
-- object if a caller sets a hostile search_path.
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION
    'audit records are append-only: UPDATE on %.% is not permitted (row id %)',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, OLD.id
    USING ERRCODE = 'restrict_violation',
          HINT = 'Append a correcting audit record instead of rewriting history.';
END
$$;

COMMENT ON FUNCTION platform.audit_row_is_immutable() IS
  'BEFORE UPDATE guard for append-only audit tables. Fires for every role, '
  'including BYPASSRLS roles such as Supabase service_role, which RLS policies '
  'cannot constrain.';

-- ---------------------------------------------------------------------------
-- 2. Apply to the audit tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('peskids',  'audit_log'),
      ('platform', 'audit_log'),
      ('platform', 'audit_events'),
      ('public',   'lead_status_audit'),
      ('platform', 'hermes_audit')
    ) AS v(sch, tbl)
  LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = spec.sch AND c.relname = spec.tbl AND c.relkind = 'r'
    );

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_immutable ON %I.%I',
                   spec.tbl, spec.sch, spec.tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_immutable BEFORE UPDATE ON %I.%I
         FOR EACH ROW EXECUTE FUNCTION platform.audit_row_is_immutable()',
      spec.tbl, spec.sch, spec.tbl);

    -- Second layer, for any caller that is not BYPASSRLS.
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', spec.sch, spec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   spec.tbl || '_no_update', spec.sch, spec.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR UPDATE USING (false)',
      spec.tbl || '_no_update', spec.sch, spec.tbl);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 3. Correlation id
-- ---------------------------------------------------------------------------
-- An audit row today records actor, action, resource and time, but nothing that
-- ties it to the HTTP request or background job that produced it. Without that,
-- reconstructing "what did this one request actually change" means guessing
-- from timestamps. Nullable and unindexed-by-default so this stays additive;
-- the application can start populating it whenever it is ready.
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('peskids',  'audit_log'),
      ('platform', 'audit_log'),
      ('platform', 'audit_events'),
      ('public',   'lead_status_audit')
    ) AS v(sch, tbl)
  LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = spec.sch AND c.relname = spec.tbl AND c.relkind = 'r'
    );
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS request_id text',
                   spec.sch, spec.tbl);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.%I (request_id) WHERE request_id IS NOT NULL',
      'idx_' || spec.tbl || '_request_id', spec.sch, spec.tbl);
  END LOOP;
END
$$;

COMMIT;

-- =============================================================================
-- Known remaining gap — needs a product decision, not a migration
-- =============================================================================
-- `peskids.audit_log` and `platform.audit_log` record WHAT changed
-- (action + resource_type + resource_id) but not the BEFORE and AFTER values.
-- `public.lead_status_audit` is the exception: it carries old_status/new_status.
--
-- Adding generic before/after columns is easy; populating them correctly is
-- not, because for child-data tables it means the audit log would itself hold
-- copies of personal data, with its own retention and access consequences.
-- That is a privacy decision for the data owner, so it is recorded here and in
-- docs/database/DATA-RETENTION-POLICY.md rather than being decided in SQL.
-- =============================================================================
