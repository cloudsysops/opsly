-- Canonical mirror of apps/peskids/migrations/20260806_lead_status_audit.sql
-- lead_id is NOT FK'd to public.leads: live leads live in platform.peskids_leads.

CREATE TABLE IF NOT EXISTS public.lead_status_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL DEFAULT 'peskids',
  lead_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  action TEXT NOT NULL CHECK (action IN ('status_change', 'note_update', 'teacher_assign', 'hold', 'convert', 'cancel')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_status_audit
  DROP CONSTRAINT IF EXISTS lead_status_audit_lead_id_fkey;

CREATE INDEX IF NOT EXISTS idx_lead_status_audit_lead_id ON public.lead_status_audit(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_audit_tenant ON public.lead_status_audit(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_lead_status_audit_created_at ON public.lead_status_audit(created_at DESC);

ALTER TABLE public.lead_status_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read audit for their tenant"
  ON public.lead_status_audit;
CREATE POLICY "Authenticated users can read audit for their tenant"
  ON public.lead_status_audit
  FOR SELECT
  USING (
    tenant_slug = CURRENT_SETTING('app.settings.tenant_slug', true)
    OR CURRENT_SETTING('app.settings.is_service_role', true) = 'true'
  );
