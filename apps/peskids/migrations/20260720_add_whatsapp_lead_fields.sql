-- PHASE 4: Add WhatsApp integration fields to peskids_leads
-- Idempotent: safe to run multiple times

ALTER TABLE peskids_leads
ADD COLUMN IF NOT EXISTS whatsapp_contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS whatsapp_conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS whatsapp_sync_status TEXT DEFAULT NULL CHECK (whatsapp_sync_status IN ('pending', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS whatsapp_opted_in_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS twenty_sync_status TEXT DEFAULT NULL CHECK (twenty_sync_status IN ('pending', 'synced', 'failed'));

CREATE INDEX IF NOT EXISTS idx_peskids_leads_whatsapp_contact_id ON peskids_leads(whatsapp_contact_id);
CREATE INDEX IF NOT EXISTS idx_peskids_leads_whatsapp_sync_status ON peskids_leads(whatsapp_sync_status);
CREATE INDEX IF NOT EXISTS idx_peskids_leads_twenty_sync_status ON peskids_leads(twenty_sync_status);

COMMENT ON COLUMN peskids_leads.whatsapp_contact_id IS 'Link to whatsapp_contacts for WhatsApp inbound messages';
COMMENT ON COLUMN peskids_leads.whatsapp_conversation_id IS 'Link to whatsapp_conversations for message thread';
COMMENT ON COLUMN peskids_leads.whatsapp_sync_status IS 'Sync status: pending (not synced), synced (WhatsApp linked), failed (sync error)';
COMMENT ON COLUMN peskids_leads.whatsapp_opted_in_at IS 'Timestamp when contact opted in to WhatsApp messaging';
COMMENT ON COLUMN peskids_leads.twenty_sync_status IS 'Sync status with Twenty CRM';
