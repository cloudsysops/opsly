-- Peskids form analytics and submission tracking
-- Enables form performance metrics, funnel analysis, and dashboard views

BEGIN;

-- Form analytics aggregates (daily summaries)
CREATE TABLE IF NOT EXISTS peskids.form_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  form_id text NOT NULL,
  date date NOT NULL,
  submissions_count integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  avg_completion_time_seconds numeric,
  abandonment_rate numeric,
  error_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT form_analytics_unique UNIQUE(tenant_slug, form_id, date)
);

CREATE INDEX IF NOT EXISTS idx_form_analytics_tenant_date ON peskids.form_analytics(tenant_slug, date DESC);
CREATE INDEX IF NOT EXISTS idx_form_analytics_form_date ON peskids.form_analytics(form_id, date DESC);

-- Submission event log (granular user interactions)
CREATE TABLE IF NOT EXISTS peskids.submission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  form_id text NOT NULL,
  submission_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL, -- 'started', 'page_viewed', 'field_error', 'validation_error', 'abandoned', 'completed'
  field_name text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_events_tenant ON peskids.submission_events(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_submission_events_form ON peskids.submission_events(form_id);
CREATE INDEX IF NOT EXISTS idx_submission_events_submission ON peskids.submission_events(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_events_type ON peskids.submission_events(event_type);
CREATE INDEX IF NOT EXISTS idx_submission_events_created ON peskids.submission_events(created_at DESC);

-- Webhook configuration for n8n integration
CREATE TABLE IF NOT EXISTS peskids.webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  form_id text NOT NULL,
  webhook_url text NOT NULL,
  secret text NOT NULL, -- Encrypted HMAC secret for webhook signature verification
  events text[] DEFAULT ARRAY['form_submission'], -- Event types that trigger webhook
  active boolean DEFAULT true,
  last_triggered_at timestamp with time zone,
  failure_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT webhook_configs_unique UNIQUE(tenant_slug, form_id, webhook_url)
);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_tenant ON peskids.webhook_configs(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_form ON peskids.webhook_configs(form_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON peskids.webhook_configs(active) WHERE active = true;

-- Enable RLS on all new tables
ALTER TABLE peskids.form_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.submission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.webhook_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role (backend) has full access
CREATE POLICY "service_role_full_analytics" ON peskids.form_analytics
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_full_events" ON peskids.submission_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_full_webhooks" ON peskids.webhook_configs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- RLS Policies: Authenticated users can only read their tenant's analytics
CREATE POLICY "authenticated_read_analytics" ON peskids.form_analytics
  FOR SELECT
  USING (
    tenant_slug IN (
      SELECT tenant_slug FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "authenticated_read_events" ON peskids.submission_events
  FOR SELECT
  USING (
    tenant_slug IN (
      SELECT tenant_slug FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "authenticated_read_webhooks" ON peskids.webhook_configs
  FOR SELECT
  USING (
    tenant_slug IN (
      SELECT tenant_slug FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "authenticated_write_webhooks" ON peskids.webhook_configs
  FOR INSERT WITH CHECK (
    tenant_slug IN (
      SELECT tenant_slug FROM public.tenant_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

COMMIT;
