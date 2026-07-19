-- PHASE 4: WhatsApp Tables for Peskids & Multi-Tenant Support
-- Idempotent: safe to run multiple times

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  external_contact_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  provider TEXT NOT NULL DEFAULT 'wacrm' CHECK (provider IN ('wacrm', 'meta', 'openwa')),
  last_message_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_contact_per_tenant UNIQUE(tenant_id, phone_number, provider)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant ON whatsapp_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_external_id ON whatsapp_contacts(external_contact_id);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  external_conversation_id TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  last_message_body TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'wacrm',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_conversation_per_tenant UNIQUE(tenant_id, external_conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant ON whatsapp_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_contact_id ON whatsapp_conversations(contact_id);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  external_message_id TEXT NOT NULL,
  external_conversation_id TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'template', 'interactive')),
  body TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'document', 'audio', 'video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'pending', 'rejected')),
  provider TEXT NOT NULL DEFAULT 'wacrm',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  raw_event_hash TEXT NOT NULL, -- SHA256 for idempotence
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_message_per_tenant UNIQUE(tenant_id, external_message_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id ON whatsapp_messages(external_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_raw_hash ON whatsapp_messages(raw_event_hash);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_id ON whatsapp_messages(contact_id);

CREATE TABLE IF NOT EXISTS whatsapp_message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  message_id UUID NOT NULL REFERENCES whatsapp_messages(id) ON DELETE CASCADE,
  external_message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'pending', 'rejected')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  recipient_id TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_event_per_message UNIQUE(tenant_id, external_message_id, status, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_events_tenant ON whatsapp_message_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_events_message_id ON whatsapp_message_events(message_id);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  external_template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'es',
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'OTP', 'TRANSACTIONAL', 'UTILITY')),
  body TEXT NOT NULL,
  header_type TEXT CHECK (header_type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT')),
  header_text TEXT,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('APPROVED', 'PENDING_REVIEW', 'REJECTED', 'PAUSED', 'DISABLED')),
  provider TEXT NOT NULL DEFAULT 'wacrm',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_template_per_tenant UNIQUE(tenant_id, external_template_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant ON whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);

CREATE TABLE IF NOT EXISTS whatsapp_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'template', 'media', 'interactive')),
  body TEXT NOT NULL,
  media_url TEXT,
  template_name TEXT,
  template_parameters JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'sending', 'sent', 'delivered', 'read', 'failed', 'rejected', 'cancelled')),
  approval_required BOOLEAN DEFAULT TRUE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by TEXT,
  rejection_reason TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_code TEXT,
  error_message TEXT,
  external_message_id TEXT,
  correlation_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_tenant ON whatsapp_outbox(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_status ON whatsapp_outbox(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_correlation_id ON whatsapp_outbox(correlation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_approved_by ON whatsapp_outbox(approved_by) WHERE approved_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_webhook_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_event_id TEXT,
  raw_event_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT,
  signature_valid BOOLEAN,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_receipt_per_event UNIQUE(tenant_id, raw_event_hash, provider)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_receipts_tenant ON whatsapp_webhook_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_receipts_hash ON whatsapp_webhook_receipts(raw_event_hash);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_receipts_processed ON whatsapp_webhook_receipts(processed);

CREATE TABLE IF NOT EXISTS whatsapp_integration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  changes JSONB,
  status TEXT,
  details JSONB,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_tenant ON whatsapp_integration_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_event_type ON whatsapp_integration_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audit_correlation ON whatsapp_integration_audit_log(correlation_id);

-- Cleanup function for old webhook receipts (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_whatsapp_webhook_receipts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM whatsapp_webhook_receipts
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND processed = TRUE;
END;
$$;

-- Add audit log entries for WhatsApp messaging (simple trigger)
CREATE OR REPLACE FUNCTION log_whatsapp_message_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO whatsapp_integration_audit_log(
    tenant_id, event_type, resource_type, resource_id, action, status, created_at
  ) VALUES (
    NEW.tenant_id,
    'message_' || NEW.direction,
    'whatsapp_message',
    NEW.id::text,
    CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END,
    NEW.status,
    CURRENT_TIMESTAMP
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_whatsapp_message
AFTER INSERT OR UPDATE ON whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION log_whatsapp_message_change();

COMMENT ON TABLE whatsapp_contacts IS 'WhatsApp contacts by tenant, multi-provider support';
COMMENT ON TABLE whatsapp_conversations IS 'WhatsApp conversation threads';
COMMENT ON TABLE whatsapp_messages IS 'Inbound and outbound messages with status tracking';
COMMENT ON TABLE whatsapp_message_events IS 'Message status updates (sent, delivered, read, failed)';
COMMENT ON TABLE whatsapp_templates IS 'Meta-approved message templates';
COMMENT ON TABLE whatsapp_outbox IS 'Approval-first message outbox for AI-generated messages';
COMMENT ON TABLE whatsapp_webhook_receipts IS 'Webhook event receipts for idempotence detection';
COMMENT ON TABLE whatsapp_integration_audit_log IS 'Audit trail for all WhatsApp events';
