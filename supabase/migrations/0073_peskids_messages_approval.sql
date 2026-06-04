-- Peskids approval-first messaging pipeline
-- Inbound messages (WhatsApp/Instagram) require admin approval before sending

CREATE TABLE IF NOT EXISTS platform.peskids_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL DEFAULT 'peskids' REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'whatsapp',
  inbound_content TEXT NOT NULL,
  parent_name TEXT,
  child_name TEXT,
  suggested_response TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'sent', 'failed')),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  modified_response TEXT,
  rejection_reason TEXT,
  sent_at TIMESTAMPTZ,
  n8n_webhook_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peskids_messages_tenant_status
  ON platform.peskids_messages (tenant_slug, status);

CREATE INDEX IF NOT EXISTS idx_peskids_messages_tenant_created
  ON platform.peskids_messages (tenant_slug, created_at DESC);

ALTER TABLE platform.peskids_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_peskids_messages"
  ON platform.peskids_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.peskids_messages TO service_role;
