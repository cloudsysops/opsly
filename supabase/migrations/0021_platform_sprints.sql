-- Sprints multi-paso (planificación + ejecución) por tenant — Mission Control / OpenClaw

CREATE TYPE platform.sprint_status AS ENUM (
  'planning',
  'running',
  'completed',
  'failed'
);

CREATE TABLE platform.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  goal text NOT NULL,
  status platform.sprint_status NOT NULL DEFAULT 'planning',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sprints_tenant_status ON platform.sprints (tenant_id, status);

CREATE INDEX idx_sprints_tenant_updated ON platform.sprints (tenant_id, updated_at DESC);

ALTER TABLE platform.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON platform.sprints USING (auth.role () = 'service_role');

CREATE OR REPLACE FUNCTION platform.set_sprints_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sprints_updated_at ON platform.sprints;

CREATE TRIGGER trg_sprints_updated_at
BEFORE UPDATE ON platform.sprints
FOR EACH ROW
EXECUTE FUNCTION platform.set_sprints_updated_at ();
