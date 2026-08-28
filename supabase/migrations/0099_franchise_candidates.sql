-- Canonical Peskids franchise sales pipeline.
-- NEEDS_PRODUCTION_MIGRATION_APPROVAL: this migration is additive and must not
-- be applied automatically from the feature branch.

BEGIN;

CREATE TABLE IF NOT EXISTS platform.franchise_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 160),
  organization_name text,
  email text,
  phone text,
  source text,
  desired_territory text,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'qualified', 'discovery', 'financial_review', 'approved', 'agreement', 'opening', 'active', 'rejected', 'withdrawn')),
  assigned_to uuid,
  franchisee_id uuid REFERENCES platform.franchisees (id) ON DELETE SET NULL,
  proposed_unit_id uuid REFERENCES platform.franchise_units (id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_franchise_candidates_tenant_status
  ON platform.franchise_candidates (tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_franchise_candidates_assigned
  ON platform.franchise_candidates (tenant_id, assigned_to, status);

CREATE TABLE IF NOT EXISTS platform.franchise_candidate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES platform.franchise_candidates (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'candidate.created', 'candidate.updated', 'candidate.assigned',
    'candidate.stage_changed', 'candidate.approved', 'candidate.rejected',
    'candidate.withdrawn', 'candidate.converted'
  )),
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_franchise_candidate_events_candidate
  ON platform.franchise_candidate_events (candidate_id, created_at DESC);

DROP TRIGGER IF EXISTS franchise_candidates_updated_at ON platform.franchise_candidates;
CREATE TRIGGER franchise_candidates_updated_at
  BEFORE UPDATE ON platform.franchise_candidates
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

ALTER TABLE platform.franchise_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.franchise_candidate_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_franchise_candidates ON platform.franchise_candidates;
CREATE POLICY service_role_all_franchise_candidates
  ON platform.franchise_candidates FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS service_role_all_franchise_candidate_events ON platform.franchise_candidate_events;
CREATE POLICY service_role_all_franchise_candidate_events
  ON platform.franchise_candidate_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON platform.franchise_candidates TO service_role;
GRANT SELECT, INSERT ON platform.franchise_candidate_events TO service_role;

CREATE OR REPLACE FUNCTION platform.convert_franchise_candidate(
  p_candidate_id uuid,
  p_actor_id uuid
)
RETURNS TABLE (
  candidate_id uuid,
  franchisee_id uuid,
  proposed_unit_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = platform, public
AS $$
DECLARE
  candidate_row platform.franchise_candidates%ROWTYPE;
  network_row platform.franchise_networks%ROWTYPE;
  new_franchisee_id uuid;
  new_unit_id uuid;
BEGIN
  SELECT * INTO candidate_row
  FROM platform.franchise_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'franchise candidate not found';
  END IF;
  IF candidate_row.status NOT IN ('approved', 'agreement', 'opening') THEN
    RAISE EXCEPTION 'candidate must be approved before conversion';
  END IF;

  IF candidate_row.franchisee_id IS NOT NULL AND candidate_row.proposed_unit_id IS NOT NULL THEN
    RETURN QUERY SELECT candidate_row.id, candidate_row.franchisee_id, candidate_row.proposed_unit_id;
    RETURN;
  END IF;
  IF candidate_row.franchisee_id IS NOT NULL OR candidate_row.proposed_unit_id IS NOT NULL THEN
    RAISE EXCEPTION 'candidate conversion links are incomplete';
  END IF;

  SELECT * INTO network_row
  FROM platform.franchise_networks
  WHERE tenant_id = candidate_row.tenant_id AND slug = 'default'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'franchise network not configured';
  END IF;

  INSERT INTO platform.franchisees (tenant_id, legal_name, status, primary_contact)
  VALUES (
    candidate_row.tenant_id,
    COALESCE(NULLIF(candidate_row.organization_name, ''), candidate_row.display_name),
    'approved',
    jsonb_build_object('name', candidate_row.display_name, 'email', candidate_row.email, 'phone', candidate_row.phone)
  )
  RETURNING id INTO new_franchisee_id;

  INSERT INTO platform.franchise_units (
    tenant_id, network_id, franchisee_id, code, name, type, status, opening_status
  )
  VALUES (
    candidate_row.tenant_id,
    network_row.id,
    new_franchisee_id,
    'proposed-' || replace(candidate_row.id::text, '-', ''),
    'Proposed unit — ' || candidate_row.display_name,
    'franchise',
    'prospect',
    'contract'
  )
  RETURNING id INTO new_unit_id;

  UPDATE platform.franchise_candidates
  SET franchisee_id = new_franchisee_id,
      proposed_unit_id = new_unit_id,
      status = 'agreement'
  WHERE id = candidate_row.id;

  INSERT INTO platform.franchise_candidate_events (tenant_id, candidate_id, event_type, actor_id, payload)
  VALUES (
    candidate_row.tenant_id,
    candidate_row.id,
    'candidate.converted',
    p_actor_id,
    jsonb_build_object('franchisee_id', new_franchisee_id, 'proposed_unit_id', new_unit_id)
  );

  RETURN QUERY SELECT candidate_row.id, new_franchisee_id, new_unit_id;
END;
$$;

REVOKE ALL ON FUNCTION platform.convert_franchise_candidate(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.convert_franchise_candidate(uuid, uuid) TO service_role;

COMMIT;
