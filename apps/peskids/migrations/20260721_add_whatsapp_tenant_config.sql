-- PHASE 4: Add WhatsApp configuration to tenant_settings
-- Idempotent: safe to run multiple times

ALTER TABLE peskids_tenant_settings
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT DEFAULT 'wacrm' CHECK (whatsapp_provider IN ('wacrm', 'meta', 'openwa')),
ADD COLUMN IF NOT EXISTS whatsapp_sandbox_mode BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS whatsapp_approval_required BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS whatsapp_verified_number TEXT DEFAULT NULL CHECK (whatsapp_verified_number IS NULL OR whatsapp_verified_number ~ '^\+\d{1,15}$'),
ADD COLUMN IF NOT EXISTS whatsapp_feature_version TEXT DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS whatsapp_config JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_peskids_tenant_settings_whatsapp_enabled ON peskids_tenant_settings(whatsapp_enabled);
CREATE INDEX IF NOT EXISTS idx_peskids_tenant_settings_whatsapp_provider ON peskids_tenant_settings(whatsapp_provider);

COMMENT ON COLUMN peskids_tenant_settings.whatsapp_enabled IS 'Enable/disable WhatsApp for tenant (global switch)';
COMMENT ON COLUMN peskids_tenant_settings.whatsapp_provider IS 'WhatsApp provider: wacrm (primary), meta (feature-flagged), openwa (deprecated)';
COMMENT ON COLUMN peskids_tenant_settings.whatsapp_sandbox_mode IS 'Use sandbox/test mode (true) or production (false)';
COMMENT ON COLUMN peskids_tenant_settings.whatsapp_approval_required IS 'Require approval for AI-generated messages';
COMMENT ON COLUMN peskids_tenant_settings.whatsapp_phone_number_id IS 'Meta WhatsApp Phone Number ID (encrypted)';
COMMENT ON COLUMN peskids_tenant_settings.whatsapp_verified_number IS 'Verified E164 phone number (e.g., +34xxxxxxxxx)';
COMMENT ON COLUMN peskids_tenant_settings.whatsapp_feature_version IS 'Feature flag version for gradual rollout';
COMMENT ON COLUMN peskids_tenant_settings.whatsapp_config IS 'Extended config (JSON): { "rate_limit": 100, "max_template_length": 1024 }';
