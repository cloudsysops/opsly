-- Peskids form audit logging
-- Tracks all form submission operations for compliance and debugging

BEGIN;

-- Audit events table for form operations
CREATE TABLE IF NOT EXISTS peskids.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  actor_id uuid,
  action text NOT NULL, -- 'form_submission_create', 'form_submission_update', 'form_submission_delete', 'form_access', 'webhook_trigger'
  resource_type text NOT NULL, -- 'form_submission', 'form', 'webhook_config'
  resource_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON peskids.audit_log(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON peskids.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON peskids.audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON peskids.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON peskids.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created ON peskids.audit_log(tenant_slug, created_at DESC);

-- Enable RLS
ALTER TABLE peskids.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role (backend) only writes and reads audit logs
CREATE POLICY "service_role_full_audit" ON peskids.audit_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- No authenticated user access to audit logs directly - they must use API endpoints
-- with proper authorization checks

-- Function to log audit events (called from backend API)
CREATE OR REPLACE FUNCTION peskids.log_audit_event(
  p_tenant_slug text,
  p_actor_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO peskids.audit_log (
    tenant_slug, actor_id, action, resource_type, resource_id,
    metadata, ip_address, user_agent
  ) VALUES (
    p_tenant_slug, p_actor_id, p_action, p_resource_type, p_resource_id,
    p_metadata, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant function access to service role only
REVOKE ALL ON FUNCTION peskids.log_audit_event FROM public;
GRANT EXECUTE ON FUNCTION peskids.log_audit_event TO service_role;

COMMIT;
