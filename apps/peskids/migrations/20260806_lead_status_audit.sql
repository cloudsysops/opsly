-- Lead status audit trail for full traceability
-- Tracks who changed what and when

CREATE TABLE IF NOT EXISTS public.lead_status_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL DEFAULT 'peskids',
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT, -- email or system
  action TEXT NOT NULL CHECK (action IN ('status_change', 'note_update', 'teacher_assign', 'hold', 'convert', 'cancel')),
  metadata JSONB, -- teacher_id, scheduled_date, scheduled_time, reason, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_audit_lead_id ON public.lead_status_audit(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_audit_tenant ON public.lead_status_audit(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_lead_status_audit_created_at ON public.lead_status_audit(created_at DESC);

-- Enable RLS
ALTER TABLE public.lead_status_audit ENABLE ROW LEVEL SECURITY;

-- Allow authenticated reads for admin users (will enforce in application logic)
CREATE POLICY "Authenticated users can read audit for their tenant"
  ON public.lead_status_audit
  FOR SELECT
  USING (
    tenant_slug = CURRENT_SETTING('app.settings.tenant_slug', true)
    OR CURRENT_SETTING('app.settings.is_service_role', true) = 'true'
  );
