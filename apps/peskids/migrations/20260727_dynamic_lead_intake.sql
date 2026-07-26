-- Peskids dynamic lead intake (family | teacher_applicant | company).
-- Idempotent. Compatible if franchise migration already added some columns.
-- Does NOT create new tenants.

BEGIN;

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'family',
  ADD COLUMN IF NOT EXISTS service_mode text,
  ADD COLUMN IF NOT EXISTS child_name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_nit text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'peskids_leads_lead_type_check'
  ) THEN
    ALTER TABLE platform.peskids_leads
      ADD CONSTRAINT peskids_leads_lead_type_check
      CHECK (lead_type IN ('family', 'teacher_applicant', 'company'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'peskids_leads_service_mode_check'
  ) THEN
    ALTER TABLE platform.peskids_leads
      ADD CONSTRAINT peskids_leads_service_mode_check
      CHECK (
        service_mode IS NULL
        OR service_mode IN ('llanogrande', 'domicilio', 'institutional')
      );
  END IF;
END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'family',
  ADD COLUMN IF NOT EXISTS service_mode text,
  ADD COLUMN IF NOT EXISTS child_name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_nit text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_lead_type_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_lead_type_check
      CHECK (lead_type IN ('family', 'teacher_applicant', 'company'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_service_mode_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_service_mode_check
      CHECK (
        service_mode IS NULL
        OR service_mode IN ('llanogrande', 'domicilio', 'institutional')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_peskids_leads_lead_type
  ON platform.peskids_leads (tenant_slug, lead_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_leads_lead_type
  ON public.leads (tenant_id, lead_type, created_at DESC);

COMMENT ON COLUMN platform.peskids_leads.lead_type IS
  'Intake type: family | teacher_applicant | company. name remains primary Twenty contact.';
COMMENT ON COLUMN platform.peskids_leads.service_mode IS
  'llanogrande | domicilio | institutional. Compat with class_modality for family.';
COMMENT ON COLUMN platform.peskids_leads.metadata IS
  'Extra intake fields (experience, company_kind, approx_children, etc.).';

COMMIT;
