-- 0093_peskids_whatsapp_outbound_outbox.sql
-- WhatsApp approval-first outbox (Meta Cloud primary).
-- DO NOT APPLY IN PRODUCTION without explicit human approval.
-- Sandbox-first: flags remain OFF until go/no-go.

CREATE TABLE IF NOT EXISTS platform.whatsapp_outbound_outbox (
  id TEXT PRIMARY KEY,
  tenant_slug TEXT NOT NULL DEFAULT 'peskids',
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN (
      'pending_approval',
      'approved',
      'sending',
      'sent',
      'failed',
      'cancelled'
    )),
  external_id TEXT,
  external_conversation_id TEXT,
  parent_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_outbox_tenant_external
  ON platform.whatsapp_outbound_outbox (tenant_slug, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_tenant_status
  ON platform.whatsapp_outbound_outbox (tenant_slug, status, created_at DESC);

ALTER TABLE platform.whatsapp_outbound_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_whatsapp_outbound_outbox"
  ON platform.whatsapp_outbound_outbox FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.whatsapp_outbound_outbox TO service_role;

COMMENT ON TABLE platform.whatsapp_outbound_outbox IS
  'Approval-first WhatsApp outbound ledger. Never mark sent when provider disabled.';
