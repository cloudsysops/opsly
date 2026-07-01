-- Intcloudsysops CloudOps Portal — Core Tables
-- Migration: 0081_intcloudsysops_schema.sql
-- Created: 2026-07-01
-- Description: Create initial schema for intcloudsysops tenant with multi-tenant isolation via RLS

-- Create intcloudsysops_accounts table
CREATE TABLE IF NOT EXISTS public.intcloudsysops_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL DEFAULT 'intcloudsysops',
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('prospect', 'customer', 'partner', 'inactive')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived')) DEFAULT 'active',
  billing_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users,
  updated_by UUID REFERENCES auth.users
);

CREATE INDEX IF NOT EXISTS idx_intcloudsysops_accounts_tenant ON public.intcloudsysops_accounts(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_accounts_status ON public.intcloudsysops_accounts(status);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_accounts_created_at ON public.intcloudsysops_accounts(created_at DESC);

-- Create intcloudsysops_contacts table
CREATE TABLE IF NOT EXISTS public.intcloudsysops_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL DEFAULT 'intcloudsysops',
  account_id UUID NOT NULL REFERENCES public.intcloudsysops_accounts(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('decision_maker', 'influencer', 'technical', 'financial', 'other')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'archived')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users,
  updated_by UUID REFERENCES auth.users
);

CREATE INDEX IF NOT EXISTS idx_intcloudsysops_contacts_tenant ON public.intcloudsysops_contacts(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_contacts_account_id ON public.intcloudsysops_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_contacts_email ON public.intcloudsysops_contacts(email);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_contacts_status ON public.intcloudsysops_contacts(status);

-- Create intcloudsysops_deals table
CREATE TABLE IF NOT EXISTS public.intcloudsysops_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL DEFAULT 'intcloudsysops',
  account_id UUID NOT NULL REFERENCES public.intcloudsysops_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value NUMERIC(15, 2),
  currency TEXT DEFAULT 'USD',
  stage TEXT NOT NULL CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost')) DEFAULT 'prospecting',
  close_date DATE,
  owner_id UUID REFERENCES auth.users,
  probability_pct NUMERIC(3, 0) CHECK (probability_pct >= 0 AND probability_pct <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users,
  updated_by UUID REFERENCES auth.users
);

CREATE INDEX IF NOT EXISTS idx_intcloudsysops_deals_tenant ON public.intcloudsysops_deals(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_deals_account_id ON public.intcloudsysops_deals(account_id);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_deals_stage ON public.intcloudsysops_deals(stage);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_deals_owner_id ON public.intcloudsysops_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_deals_close_date ON public.intcloudsysops_deals(close_date);

-- Create intcloudsysops_feedback table
CREATE TABLE IF NOT EXISTS public.intcloudsysops_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL DEFAULT 'intcloudsysops',
  account_id UUID NOT NULL REFERENCES public.intcloudsysops_accounts(id) ON DELETE CASCADE,
  rating NUMERIC(2, 1) CHECK (rating >= 1 AND rating <= 5),
  category TEXT CHECK (category IN ('product', 'service', 'support', 'pricing', 'other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'reviewed', 'actioned', 'archived')) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users
);

CREATE INDEX IF NOT EXISTS idx_intcloudsysops_feedback_tenant ON public.intcloudsysops_feedback(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_feedback_account_id ON public.intcloudsysops_feedback(account_id);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_feedback_status ON public.intcloudsysops_feedback(status);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_feedback_created_at ON public.intcloudsysops_feedback(created_at DESC);

-- Create intcloudsysops_followups table
CREATE TABLE IF NOT EXISTS public.intcloudsysops_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL DEFAULT 'intcloudsysops',
  related_type TEXT NOT NULL CHECK (related_type IN ('account', 'contact', 'deal', 'feedback', 'task')),
  related_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  assigned_to UUID REFERENCES auth.users,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')) DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users
);

CREATE INDEX IF NOT EXISTS idx_intcloudsysops_followups_tenant ON public.intcloudsysops_followups(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_followups_related_id ON public.intcloudsysops_followups(related_id);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_followups_assigned_to ON public.intcloudsysops_followups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_followups_status ON public.intcloudsysops_followups(status);
CREATE INDEX IF NOT EXISTS idx_intcloudsysops_followups_due_at ON public.intcloudsysops_followups(due_at);

-- RLS Policies for intcloudsysops_accounts
ALTER TABLE public.intcloudsysops_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY intcloudsysops_accounts_insert ON public.intcloudsysops_accounts
  FOR INSERT WITH CHECK (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

CREATE POLICY intcloudsysops_accounts_select ON public.intcloudsysops_accounts
  FOR SELECT USING (tenant_slug = 'intcloudsysops');

CREATE POLICY intcloudsysops_accounts_update ON public.intcloudsysops_accounts
  FOR UPDATE USING (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

CREATE POLICY intcloudsysops_accounts_delete ON public.intcloudsysops_accounts
  FOR DELETE USING (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

-- RLS Policies for intcloudsysops_contacts
ALTER TABLE public.intcloudsysops_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY intcloudsysops_contacts_insert ON public.intcloudsysops_contacts
  FOR INSERT WITH CHECK (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

CREATE POLICY intcloudsysops_contacts_select ON public.intcloudsysops_contacts
  FOR SELECT USING (tenant_slug = 'intcloudsysops');

CREATE POLICY intcloudsysops_contacts_update ON public.intcloudsysops_contacts
  FOR UPDATE USING (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

CREATE POLICY intcloudsysops_contacts_delete ON public.intcloudsysops_contacts
  FOR DELETE USING (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

-- RLS Policies for intcloudsysops_deals
ALTER TABLE public.intcloudsysops_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY intcloudsysops_deals_insert ON public.intcloudsysops_deals
  FOR INSERT WITH CHECK (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

CREATE POLICY intcloudsysops_deals_select ON public.intcloudsysops_deals
  FOR SELECT USING (tenant_slug = 'intcloudsysops');

CREATE POLICY intcloudsysops_deals_update ON public.intcloudsysops_deals
  FOR UPDATE USING (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

CREATE POLICY intcloudsysops_deals_delete ON public.intcloudsysops_deals
  FOR DELETE USING (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

-- RLS Policies for intcloudsysops_feedback
ALTER TABLE public.intcloudsysops_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY intcloudsysops_feedback_insert ON public.intcloudsysops_feedback
  FOR INSERT WITH CHECK (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

CREATE POLICY intcloudsysops_feedback_select ON public.intcloudsysops_feedback
  FOR SELECT USING (tenant_slug = 'intcloudsysops');

CREATE POLICY intcloudsysops_feedback_update ON public.intcloudsysops_feedback
  FOR UPDATE USING (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

-- RLS Policies for intcloudsysops_followups
ALTER TABLE public.intcloudsysops_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY intcloudsysops_followups_insert ON public.intcloudsysops_followups
  FOR INSERT WITH CHECK (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

CREATE POLICY intcloudsysops_followups_select ON public.intcloudsysops_followups
  FOR SELECT USING (tenant_slug = 'intcloudsysops');

CREATE POLICY intcloudsysops_followups_update ON public.intcloudsysops_followups
  FOR UPDATE USING (tenant_slug = 'intcloudsysops' AND auth.uid() IS NOT NULL);

-- Add comments for documentation
COMMENT ON TABLE public.intcloudsysops_accounts IS 'Customer/prospect accounts for Intcloudsysops tenant. All rows filtered by tenant_slug = intcloudsysops for multi-tenant isolation.';
COMMENT ON TABLE public.intcloudsysops_contacts IS 'Contacts associated with accounts. Each contact belongs to exactly one account and is isolated by tenant_slug.';
COMMENT ON TABLE public.intcloudsysops_deals IS 'Sales opportunities/deals. Tracked by stage (prospecting → won/lost) with probability scoring and close date tracking.';
COMMENT ON TABLE public.intcloudsysops_feedback IS 'Customer feedback and satisfaction ratings. Status flow: new → reviewed → actioned → archived.';
COMMENT ON TABLE public.intcloudsysops_followups IS 'Action items and follow-up tasks. Can be related to accounts, contacts, deals, feedback, or standalone tasks.';
