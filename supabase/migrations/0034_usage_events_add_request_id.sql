-- Add request_id to usage_events for better traceability
ALTER TABLE platform.usage_events
ADD COLUMN IF NOT EXISTS request_id text;

-- Create index on request_id for correlation with orchestrator logs
CREATE INDEX IF NOT EXISTS idx_usage_request_id
  ON platform.usage_events(request_id);

-- Update grant to ensure service_role can still write/read
GRANT INSERT, SELECT ON platform.usage_events TO service_role;
