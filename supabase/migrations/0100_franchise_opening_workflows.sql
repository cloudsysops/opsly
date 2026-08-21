-- Additive Franchise OS opening checklists + tasks (after 0098/0099).
-- Does NOT drop platform.peskids_franchises (0090) or rewrite 0098/0099.
-- NEEDS_PRODUCTION_MIGRATION_APPROVAL — do not apply to prod from this PR.

BEGIN;

CREATE TABLE IF NOT EXISTS platform.opening_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'ready', 'activated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, unit_id)
);

CREATE TABLE IF NOT EXISTS platform.opening_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  checklist_id uuid NOT NULL REFERENCES platform.opening_checklists (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (
    phase IN (
      'contract', 'territory', 'location', 'design', 'permits',
      'equipment', 'staff', 'training', 'soft_launch', 'opening'
    )
  ),
  title text NOT NULL,
  owner text,
  due_date date,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed', 'skipped')),
  evidence jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checklist_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_opening_checklists_tenant_unit
  ON platform.opening_checklists (tenant_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_opening_tasks_tenant_unit
  ON platform.opening_tasks (tenant_id, unit_id);

CREATE OR REPLACE FUNCTION platform.franchise_assert_opening_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  unit_tenant uuid;
  checklist_tenant uuid;
  checklist_unit uuid;
BEGIN
  SELECT tenant_id INTO unit_tenant FROM platform.franchise_units WHERE id = NEW.unit_id;
  IF unit_tenant IS NULL OR unit_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'opening unit tenant mismatch';
  END IF;
  IF TG_TABLE_NAME = 'opening_tasks' THEN
    SELECT tenant_id, unit_id INTO checklist_tenant, checklist_unit
      FROM platform.opening_checklists WHERE id = NEW.checklist_id;
    IF checklist_tenant IS NULL OR checklist_tenant <> NEW.tenant_id OR checklist_unit <> NEW.unit_id THEN
      RAISE EXCEPTION 'opening task checklist mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opening_checklists_tenant ON platform.opening_checklists;
CREATE TRIGGER trg_opening_checklists_tenant
  BEFORE INSERT OR UPDATE ON platform.opening_checklists
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_opening_tenant();

DROP TRIGGER IF EXISTS trg_opening_tasks_tenant ON platform.opening_tasks;
CREATE TRIGGER trg_opening_tasks_tenant
  BEFORE INSERT OR UPDATE ON platform.opening_tasks
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_opening_tenant();

ALTER TABLE platform.opening_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.opening_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_opening_checklists ON platform.opening_checklists;
CREATE POLICY service_role_all_opening_checklists
  ON platform.opening_checklists FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_opening_tasks ON platform.opening_tasks;
CREATE POLICY service_role_all_opening_tasks
  ON platform.opening_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS opening_checklists_authenticated_select ON platform.opening_checklists;
CREATE POLICY opening_checklists_authenticated_select
  ON platform.opening_checklists FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS opening_checklists_authenticated_insert ON platform.opening_checklists;
CREATE POLICY opening_checklists_authenticated_insert
  ON platform.opening_checklists FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS opening_checklists_authenticated_update ON platform.opening_checklists;
CREATE POLICY opening_checklists_authenticated_update
  ON platform.opening_checklists FOR UPDATE TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  )
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS opening_tasks_authenticated_select ON platform.opening_tasks;
CREATE POLICY opening_tasks_authenticated_select
  ON platform.opening_tasks FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS opening_tasks_authenticated_insert ON platform.opening_tasks;
CREATE POLICY opening_tasks_authenticated_insert
  ON platform.opening_tasks FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS opening_tasks_authenticated_update ON platform.opening_tasks;
CREATE POLICY opening_tasks_authenticated_update
  ON platform.opening_tasks FOR UPDATE TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  )
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS franchise_units_authenticated_update_opening ON platform.franchise_units;
CREATE POLICY franchise_units_authenticated_update_opening
  ON platform.franchise_units FOR UPDATE TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, id)
  )
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON
  platform.opening_checklists,
  platform.opening_tasks
TO service_role;

GRANT SELECT, INSERT, UPDATE ON
  platform.opening_checklists,
  platform.opening_tasks
TO authenticated;

GRANT UPDATE (status, opening_status, updated_at) ON platform.franchise_units TO authenticated;

COMMENT ON TABLE platform.opening_checklists IS
  'One opening checklist per franchise unit. Activation is app-gated by required tasks.';
COMMENT ON TABLE platform.opening_tasks IS
  'Opening phases for a unit. Evidence is a DocumentReference jsonb, not an e-signature vendor id.';

COMMIT;
