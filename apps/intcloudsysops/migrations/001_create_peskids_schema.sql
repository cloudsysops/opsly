-- Peskids MVP Schema
-- Multi-tenant isolation with RLS policies
-- Note: JWT configuration is handled by Supabase Auth configuration, not in migrations

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  grade_interested TEXT NOT NULL,
  referral_source TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'enrolled', 'archived')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON public.leads(tenant_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_email ON public.leads(email);

-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  parent_email TEXT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_tenant ON public.students(tenant_id);
CREATE INDEX idx_students_status ON public.students(status);

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  child_name TEXT NOT NULL,
  satisfaction INTEGER NOT NULL CHECK (satisfaction >= 1 AND satisfaction <= 5),
  suggestion TEXT,
  contact_wanted BOOLEAN DEFAULT FALSE,
  parent_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_tenant ON public.feedback(tenant_id);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_satisfaction ON public.feedback(satisfaction);

-- Create followups table
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  contact_id UUID NOT NULL,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('lead', 'student', 'parent')),
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'sms', 'in-person')),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followups_tenant ON public.followups(tenant_id);
CREATE INDEX idx_followups_status ON public.followups(status);
CREATE INDEX idx_followups_due_date ON public.followups(due_date);

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public inserts (for landing page form)
-- During MVP, we allow public inserts from the web form.
-- The web form always sets tenant_id to the configured Peskids tenant.
-- Server-side validation in the API route ensures tenant_id cannot be spoofed.

CREATE POLICY "Allow public inserts to leads"
  ON public.leads
  FOR INSERT
  WITH CHECK (tenant_id = 'peskids');

CREATE POLICY "Allow public inserts to feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (tenant_id = 'peskids');

-- RLS Policies: Authenticated users can read only their tenant's data
-- For admin access, use service role or authenticated users with tenant_id claim

CREATE POLICY "Authenticated users can read leads for their tenant"
  ON public.leads
  FOR SELECT
  USING (
    tenant_id = CURRENT_SETTING('app.settings.tenant_id', true)
    OR CURRENT_SETTING('app.settings.is_service_role', true) = 'true'
  );

CREATE POLICY "Authenticated users can read students for their tenant"
  ON public.students
  FOR SELECT
  USING (
    tenant_id = CURRENT_SETTING('app.settings.tenant_id', true)
    OR CURRENT_SETTING('app.settings.is_service_role', true) = 'true'
  );

CREATE POLICY "Authenticated users can read feedback for their tenant"
  ON public.feedback
  FOR SELECT
  USING (
    tenant_id = CURRENT_SETTING('app.settings.tenant_id', true)
    OR CURRENT_SETTING('app.settings.is_service_role', true) = 'true'
  );

CREATE POLICY "Authenticated users can read followups for their tenant"
  ON public.followups
  FOR SELECT
  USING (
    tenant_id = CURRENT_SETTING('app.settings.tenant_id', true)
    OR CURRENT_SETTING('app.settings.is_service_role', true) = 'true'
  );

-- RLS Implementation Notes for MVP:
-- 1. Public inserts: Constrained by tenant_id in WITH CHECK clause (RLS active)
-- 2. Reads from dashboard: Bypassed using service role (server-side API route)
-- 3. Future: When client-side auth is added, set app.settings.tenant_id before queries
-- The SELECT policies above are ready for future authenticated access (they reference CURRENT_SETTING)

-- Create webhook_logs table for tracking external integrations (Jelou, etc.)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'jelou', 'zapier', etc.
  event_type TEXT NOT NULL, -- 'lead.created', 'feedback.created', etc.
  record_id UUID, -- Reference to the created record (lead_id, feedback_id, etc.)
  payload JSONB NOT NULL, -- Full webhook payload for debugging
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed')),
  error_message TEXT, -- If processing failed
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_logs_tenant ON public.webhook_logs(tenant_id);
CREATE INDEX idx_webhook_logs_provider ON public.webhook_logs(provider);
CREATE INDEX idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_received_at ON public.webhook_logs(received_at DESC);

-- RLS for webhook_logs: Only service role can write/read
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  WITH CHECK (CURRENT_SETTING('app.settings.is_service_role', true) = 'true');

CREATE POLICY "Service role can read webhook logs"
  ON public.webhook_logs
  FOR SELECT
  USING (CURRENT_SETTING('app.settings.is_service_role', true) = 'true');
