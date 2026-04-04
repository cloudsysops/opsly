CREATE TABLE platform.conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  tenant_id uuid REFERENCES platform.tenants (id) ON DELETE
  SET NULL,
    session_id text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);
CREATE INDEX conversion_events_event_created_at_idx ON platform.conversion_events (event, created_at);
ALTER TABLE platform.conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON platform.conversion_events USING (auth.role() = 'service_role');