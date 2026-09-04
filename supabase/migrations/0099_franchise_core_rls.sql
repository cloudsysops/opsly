-- Additive Franchise OS RLS + integrity (after 0098).
-- Does NOT drop platform.peskids_franchises (0090) or rewrite 0098.
-- NEEDS_PRODUCTION_MIGRATION_APPROVAL — do not apply to prod from this PR.

BEGIN;

-- ---------------------------------------------------------------------------
-- Integrity CHECKs
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_franchise_agreements_dates'
  ) THEN
    ALTER TABLE platform.franchise_agreements
      ADD CONSTRAINT chk_franchise_agreements_dates
      CHECK (expiration_date >= effective_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_reports_nonneg'
  ) THEN
    ALTER TABLE platform.sales_reports
      ADD CONSTRAINT chk_sales_reports_nonneg
      CHECK (
        gross_sales >= 0
        AND refunds >= 0
        AND taxes >= 0
        AND excluded_sales >= 0
        AND net_sales >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_royalty_calculations_nonneg'
  ) THEN
    ALTER TABLE platform.royalty_calculations
      ADD CONSTRAINT chk_royalty_calculations_nonneg
      CHECK (royalty_due >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_royalty_payments_nonneg'
  ) THEN
    ALTER TABLE platform.royalty_payments
      ADD CONSTRAINT chk_royalty_payments_nonneg
      CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_franchise_agreements_fee_nonneg'
  ) THEN
    ALTER TABLE platform.franchise_agreements
      ADD CONSTRAINT chk_franchise_agreements_fee_nonneg
      CHECK (
        canonical_fee IS NULL
        OR (
          jsonb_typeof(canonical_fee) = 'object'
          AND canonical_fee ? 'amount'
          AND (canonical_fee->>'amount')::numeric >= 0
        )
      );
  END IF;
END $$;

ALTER TABLE platform.sales_reports
  DROP CONSTRAINT IF EXISTS sales_reports_unit_id_period_start_period_end_source_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_reports_idempotency
  ON platform.sales_reports (
    tenant_id,
    unit_id,
    period_start,
    period_end,
    source,
    COALESCE(source_reference, '')
  );

-- ---------------------------------------------------------------------------
-- Tenant-consistency triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION platform.franchise_assert_unit_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  unit_tenant uuid;
BEGIN
  IF NEW.unit_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT tenant_id INTO unit_tenant FROM platform.franchise_units WHERE id = NEW.unit_id;
  IF unit_tenant IS NULL OR unit_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'franchise unit tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS franchise_territories_unit_tenant ON platform.franchise_territories;
CREATE TRIGGER franchise_territories_unit_tenant
  BEFORE INSERT OR UPDATE ON platform.franchise_territories
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_unit_tenant();

DROP TRIGGER IF EXISTS sales_reports_unit_tenant ON platform.sales_reports;
CREATE TRIGGER sales_reports_unit_tenant
  BEFORE INSERT OR UPDATE ON platform.sales_reports
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_unit_tenant();

DROP TRIGGER IF EXISTS royalty_calculations_unit_tenant ON platform.royalty_calculations;
CREATE TRIGGER royalty_calculations_unit_tenant
  BEFORE INSERT OR UPDATE ON platform.royalty_calculations
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_unit_tenant();

DROP TRIGGER IF EXISTS audits_unit_tenant ON platform.audits;
CREATE TRIGGER audits_unit_tenant
  BEFORE INSERT OR UPDATE ON platform.audits
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_unit_tenant();

DROP TRIGGER IF EXISTS audit_findings_unit_tenant ON platform.audit_findings;
CREATE TRIGGER audit_findings_unit_tenant
  BEFORE INSERT OR UPDATE ON platform.audit_findings
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_unit_tenant();

DROP TRIGGER IF EXISTS corrective_actions_unit_tenant ON platform.corrective_actions;
CREATE TRIGGER corrective_actions_unit_tenant
  BEFORE INSERT OR UPDATE ON platform.corrective_actions
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_unit_tenant();

CREATE OR REPLACE FUNCTION platform.franchise_assert_franchisee_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  franchisee_tenant uuid;
BEGIN
  SELECT tenant_id INTO franchisee_tenant FROM platform.franchisees WHERE id = NEW.franchisee_id;
  IF franchisee_tenant IS NULL OR franchisee_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'agreement franchisee tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS franchise_agreements_franchisee_tenant ON platform.franchise_agreements;
CREATE TRIGGER franchise_agreements_franchisee_tenant
  BEFORE INSERT OR UPDATE ON platform.franchise_agreements
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_franchisee_tenant();

CREATE OR REPLACE FUNCTION platform.franchise_assert_calc_report_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  report_tenant uuid;
  report_unit uuid;
BEGIN
  SELECT tenant_id, unit_id INTO report_tenant, report_unit
  FROM platform.sales_reports WHERE id = NEW.sales_report_id;
  IF report_tenant IS DISTINCT FROM NEW.tenant_id OR report_unit IS DISTINCT FROM NEW.unit_id THEN
    RAISE EXCEPTION 'calculation sales report tenant/unit mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS royalty_calculations_report_tenant ON platform.royalty_calculations;
CREATE TRIGGER royalty_calculations_report_tenant
  BEFORE INSERT OR UPDATE ON platform.royalty_calculations
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_calc_report_tenant();

-- ---------------------------------------------------------------------------
-- Royalty rule immutability (new version = new row)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION platform.forbid_royalty_rule_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'royalty_rules are immutable; insert a new version row';
END;
$$;

DROP TRIGGER IF EXISTS royalty_rules_immutable_upd ON platform.royalty_rules;
CREATE TRIGGER royalty_rules_immutable_upd
  BEFORE UPDATE ON platform.royalty_rules
  FOR EACH ROW EXECUTE FUNCTION platform.forbid_royalty_rule_rewrite();

DROP TRIGGER IF EXISTS royalty_rules_immutable_del ON platform.royalty_rules;
CREATE TRIGGER royalty_rules_immutable_del
  BEFORE DELETE ON platform.royalty_rules
  FOR EACH ROW EXECUTE FUNCTION platform.forbid_royalty_rule_rewrite();

-- ---------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER to avoid policy recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION platform.franchise_jwt_staff_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(
    auth.jwt() #>> '{user_metadata,tenant_role}',
    auth.jwt() #>> '{user_metadata,role}',
    auth.jwt() #>> '{app_metadata,role}',
    ''
  ));
$$;

CREATE OR REPLACE FUNCTION platform.franchise_is_network_admin(p_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM platform.tenant_memberships tm
    WHERE tm.tenant_id = p_tenant
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION platform.franchise_assigned_to_unit(p_unit uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
        FROM platform.peskids_franchise_staff_memberships m
        JOIN platform.franchise_units u
          ON u.external_source = 'platform.peskids_franchises'
         AND u.external_ref = m.franchise_id::text
        WHERE u.id = p_unit
          AND m.user_id = auth.uid()
          AND m.active = true
  );
$$;

CREATE OR REPLACE FUNCTION platform.franchise_can_access_unit(p_tenant uuid, p_unit uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, pg_temp
AS $$
  SELECT platform.franchise_is_network_admin(p_tenant)
      OR platform.franchise_assigned_to_unit(p_unit);
$$;

CREATE OR REPLACE FUNCTION platform.franchise_has_tenant_assignment(p_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, pg_temp
AS $$
  SELECT platform.franchise_is_network_admin(p_tenant)
      OR EXISTS (
        SELECT 1
        FROM platform.peskids_franchise_staff_memberships m
        JOIN platform.franchise_units u
          ON u.external_source = 'platform.peskids_franchises'
         AND u.external_ref = m.franchise_id::text
        WHERE u.tenant_id = p_tenant
          AND m.user_id = auth.uid()
          AND m.active = true
      );
$$;

CREATE OR REPLACE FUNCTION platform.franchise_is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, pg_temp
AS $$
  SELECT platform.franchise_jwt_staff_role() = 'teacher'
      OR EXISTS (
        SELECT 1
        FROM platform.peskids_franchise_staff_memberships m
        WHERE m.user_id = auth.uid()
          AND m.active = true
          AND m.role = 'teacher'
      );
$$;

CREATE OR REPLACE FUNCTION platform.franchise_is_auditor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, pg_temp
AS $$
  SELECT platform.franchise_jwt_staff_role() IN ('auditor')
      OR EXISTS (
        SELECT 1
        FROM platform.peskids_franchise_staff_memberships m
        WHERE m.user_id = auth.uid()
          AND m.active = true
          AND m.role = 'auditor'
      );
$$;

CREATE OR REPLACE FUNCTION platform.franchise_financial_ok(p_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, pg_temp
AS $$
  SELECT platform.franchise_has_tenant_assignment(p_tenant)
     AND NOT platform.franchise_is_teacher()
     AND NOT platform.franchise_is_auditor();
$$;

REVOKE ALL ON FUNCTION platform.franchise_is_network_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.franchise_assigned_to_unit(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.franchise_can_access_unit(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.franchise_has_tenant_assignment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.franchise_is_teacher() FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.franchise_is_auditor() FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.franchise_financial_ok(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.franchise_is_network_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION platform.franchise_assigned_to_unit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION platform.franchise_can_access_unit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION platform.franchise_has_tenant_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION platform.franchise_is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION platform.franchise_is_auditor() TO authenticated;
GRANT EXECUTE ON FUNCTION platform.franchise_jwt_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION platform.franchise_financial_ok(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Authenticated policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS franchise_territories_authenticated_select ON platform.franchise_territories;
CREATE POLICY franchise_territories_authenticated_select
  ON platform.franchise_territories FOR SELECT TO authenticated
  USING (
    platform.franchise_financial_ok(tenant_id)
    AND (unit_id IS NULL OR platform.franchise_can_access_unit(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS franchise_territories_authenticated_insert ON platform.franchise_territories;
CREATE POLICY franchise_territories_authenticated_insert
  ON platform.franchise_territories FOR INSERT TO authenticated
  WITH CHECK (
    platform.franchise_financial_ok(tenant_id)
    AND (unit_id IS NULL OR platform.franchise_can_access_unit(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS franchise_agreements_authenticated_select ON platform.franchise_agreements;
CREATE POLICY franchise_agreements_authenticated_select
  ON platform.franchise_agreements FOR SELECT TO authenticated
  USING (
    platform.franchise_financial_ok(tenant_id)
    AND (
      platform.franchise_is_network_admin(tenant_id)
      OR EXISTS (
        SELECT 1
        FROM platform.franchise_agreement_units au
        WHERE au.agreement_id = franchise_agreements.id
          AND platform.franchise_assigned_to_unit(au.unit_id)
      )
    )
  );

DROP POLICY IF EXISTS franchise_agreements_authenticated_insert ON platform.franchise_agreements;
CREATE POLICY franchise_agreements_authenticated_insert
  ON platform.franchise_agreements FOR INSERT TO authenticated
  WITH CHECK (platform.franchise_financial_ok(tenant_id));

DROP POLICY IF EXISTS royalty_rules_authenticated_select ON platform.royalty_rules;
CREATE POLICY royalty_rules_authenticated_select
  ON platform.royalty_rules FOR SELECT TO authenticated
  USING (platform.franchise_financial_ok(tenant_id));

DROP POLICY IF EXISTS royalty_rules_authenticated_insert ON platform.royalty_rules;
CREATE POLICY royalty_rules_authenticated_insert
  ON platform.royalty_rules FOR INSERT TO authenticated
  WITH CHECK (platform.franchise_financial_ok(tenant_id));

DROP POLICY IF EXISTS sales_reports_authenticated_select ON platform.sales_reports;
CREATE POLICY sales_reports_authenticated_select
  ON platform.sales_reports FOR SELECT TO authenticated
  USING (
    platform.franchise_financial_ok(tenant_id)
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS sales_reports_authenticated_insert ON platform.sales_reports;
CREATE POLICY sales_reports_authenticated_insert
  ON platform.sales_reports FOR INSERT TO authenticated
  WITH CHECK (
    platform.franchise_financial_ok(tenant_id)
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS royalty_calculations_authenticated_select ON platform.royalty_calculations;
CREATE POLICY royalty_calculations_authenticated_select
  ON platform.royalty_calculations FOR SELECT TO authenticated
  USING (
    platform.franchise_financial_ok(tenant_id)
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS royalty_calculations_authenticated_insert ON platform.royalty_calculations;
CREATE POLICY royalty_calculations_authenticated_insert
  ON platform.royalty_calculations FOR INSERT TO authenticated
  WITH CHECK (
    platform.franchise_financial_ok(tenant_id)
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS royalty_calculations_authenticated_update ON platform.royalty_calculations;
CREATE POLICY royalty_calculations_authenticated_update
  ON platform.royalty_calculations FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS royalty_payments_authenticated_select ON platform.royalty_payments;
CREATE POLICY royalty_payments_authenticated_select
  ON platform.royalty_payments FOR SELECT TO authenticated
  USING (platform.franchise_financial_ok(tenant_id));

DROP POLICY IF EXISTS royalty_payments_authenticated_insert ON platform.royalty_payments;
CREATE POLICY royalty_payments_authenticated_insert
  ON platform.royalty_payments FOR INSERT TO authenticated
  WITH CHECK (platform.franchise_financial_ok(tenant_id));

DROP POLICY IF EXISTS franchisees_authenticated_select ON platform.franchisees;
CREATE POLICY franchisees_authenticated_select
  ON platform.franchisees FOR SELECT TO authenticated
  USING (platform.franchise_financial_ok(tenant_id));

DROP POLICY IF EXISTS franchisees_authenticated_insert ON platform.franchisees;
CREATE POLICY franchisees_authenticated_insert
  ON platform.franchisees FOR INSERT TO authenticated
  WITH CHECK (platform.franchise_financial_ok(tenant_id));

DROP POLICY IF EXISTS audits_authenticated_select ON platform.audits;
CREATE POLICY audits_authenticated_select
  ON platform.audits FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS audits_authenticated_insert ON platform.audits;
CREATE POLICY audits_authenticated_insert
  ON platform.audits FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS audit_findings_authenticated_select ON platform.audit_findings;
CREATE POLICY audit_findings_authenticated_select
  ON platform.audit_findings FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS audit_findings_authenticated_insert ON platform.audit_findings;
CREATE POLICY audit_findings_authenticated_insert
  ON platform.audit_findings FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS corrective_actions_authenticated_select ON platform.corrective_actions;
CREATE POLICY corrective_actions_authenticated_select
  ON platform.corrective_actions FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS corrective_actions_authenticated_insert ON platform.corrective_actions;
CREATE POLICY corrective_actions_authenticated_insert
  ON platform.corrective_actions FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

GRANT USAGE ON SCHEMA platform TO authenticated;
GRANT SELECT, INSERT ON
  platform.franchisees,
  platform.franchise_territories,
  platform.franchise_agreements,
  platform.royalty_rules,
  platform.sales_reports,
  platform.royalty_calculations,
  platform.royalty_payments,
  platform.audit_templates,
  platform.audits,
  platform.audit_findings,
  platform.corrective_actions
TO authenticated;
GRANT SELECT ON
  platform.franchise_networks,
  platform.franchise_units,
  platform.franchise_locations
TO authenticated;

COMMENT ON FUNCTION platform.franchise_financial_ok(uuid) IS
  'Teachers and auditors cannot read franchise financial tables. Network admins see the tenant; others need unit assignment.';

COMMIT;
