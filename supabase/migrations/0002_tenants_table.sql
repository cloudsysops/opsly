CREATE TABLE platform.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]{3,30}$'),
  name text NOT NULL,
  owner_email text NOT NULL,
  plan text NOT NULL CHECK (
    plan IN ('startup', 'business', 'enterprise', 'demo')
  ),
  status text NOT NULL DEFAULT 'provisioning' CHECK (
    status IN (
      'provisioning',
      'configuring',
      'deploying',
      'active',
      'suspended',
      'failed',
      'deleted'
    )
  ),
  progress integer DEFAULT 0 CHECK (
    progress BETWEEN 0 AND 100
  ),
  stripe_customer_id text,
  stripe_subscription_id text,
  doppler_project text,
  services jsonb DEFAULT '{}',
  is_demo boolean DEFAULT false,
  demo_expires_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE platform.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  stripe_event_id text UNIQUE NOT NULL,
  stripe_status text NOT NULL,
  current_period_end timestamptz,
  plan text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE platform.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES platform.tenants (id) ON DELETE
  SET NULL,
    action text NOT NULL,
    actor text NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION platform.set_tenants_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now();
RETURN NEW;
END;
$$;
CREATE TRIGGER tenants_updated_at BEFORE
UPDATE ON platform.tenants FOR EACH ROW EXECUTE FUNCTION platform.set_tenants_updated_at();