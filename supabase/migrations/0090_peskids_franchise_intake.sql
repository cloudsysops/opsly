-- Peskids franchise-ready intake foundation.
-- Additive only: preserves current Peskids tenant and existing lead payloads.

CREATE TABLE IF NOT EXISTS platform.peskids_franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  slug text NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'owned'
    CHECK (type IN ('flagship', 'owned', 'franchise', 'mobile')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  parent_franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL,
  is_primary boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_slug, slug)
);

CREATE TABLE IF NOT EXISTS platform.peskids_franchise_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  franchise_id uuid NOT NULL REFERENCES platform.peskids_franchises (id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'pool'
    CHECK (kind IN ('pool', 'home_zone', 'office', 'service_area')),
  address text,
  city text,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (franchise_id, slug)
);

CREATE TABLE IF NOT EXISTS platform.peskids_franchise_staff_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  franchise_id uuid NOT NULL REFERENCES platform.peskids_franchises (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'support', 'teacher')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (franchise_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_peskids_franchises_tenant_status
  ON platform.peskids_franchises (tenant_slug, status);

CREATE INDEX IF NOT EXISTS idx_peskids_franchise_locations_franchise
  ON platform.peskids_franchise_locations (franchise_id, active);

CREATE INDEX IF NOT EXISTS idx_peskids_franchise_staff_user
  ON platform.peskids_franchise_staff_memberships (tenant_slug, user_id, active);

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'family'
    CHECK (lead_type IN ('family', 'teacher_applicant', 'company')),
  ADD COLUMN IF NOT EXISTS service_mode text
    CHECK (service_mode IS NULL OR service_mode IN ('llanogrande', 'domicilio', 'institutional')),
  ADD COLUMN IF NOT EXISTS child_name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_nit text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS franchise_id uuid,
  ADD COLUMN IF NOT EXISTS lead_type text NOT NULL DEFAULT 'family'
    CHECK (lead_type IN ('family', 'teacher_applicant', 'company')),
  ADD COLUMN IF NOT EXISTS service_mode text
    CHECK (service_mode IS NULL OR service_mode IN ('llanogrande', 'domicilio', 'institutional')),
  ADD COLUMN IF NOT EXISTS child_name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_nit text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS franchise_id uuid;

ALTER TABLE public.trial_classes
  ADD COLUMN IF NOT EXISTS franchise_id uuid;

ALTER TABLE public.followups
  ADD COLUMN IF NOT EXISTS franchise_id uuid;

DO $$
BEGIN
  IF to_regclass('peskids.pools') IS NOT NULL THEN
    ALTER TABLE peskids.pools
      ADD COLUMN IF NOT EXISTS franchise_id uuid;
  END IF;

  IF to_regclass('peskids.classes') IS NOT NULL THEN
    ALTER TABLE peskids.classes
      ADD COLUMN IF NOT EXISTS franchise_id uuid;
  END IF;
END $$;

INSERT INTO platform.peskids_franchises (tenant_slug, slug, name, type, is_primary)
VALUES
  ('peskids', 'llanogrande-principal', 'Llanogrande principal', 'flagship', true),
  ('peskids', 'domicilios-peskids', 'Domicilios Peskids', 'mobile', false)
ON CONFLICT (tenant_slug, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  is_primary = EXCLUDED.is_primary,
  updated_at = now();

INSERT INTO platform.peskids_franchise_locations (tenant_slug, franchise_id, slug, name, kind, city)
SELECT 'peskids', id, 'sede-llanogrande', 'Sede Llanogrande', 'pool', 'Rionegro'
FROM platform.peskids_franchises
WHERE tenant_slug = 'peskids' AND slug = 'llanogrande-principal'
ON CONFLICT (franchise_id, slug) DO UPDATE
SET name = EXCLUDED.name, kind = EXCLUDED.kind, city = EXCLUDED.city, updated_at = now();

INSERT INTO platform.peskids_franchise_locations (tenant_slug, franchise_id, slug, name, kind)
SELECT 'peskids', id, 'zona-domicilios', 'Zona domicilios Peskids', 'home_zone'
FROM platform.peskids_franchises
WHERE tenant_slug = 'peskids' AND slug = 'domicilios-peskids'
ON CONFLICT (franchise_id, slug) DO UPDATE
SET name = EXCLUDED.name, kind = EXCLUDED.kind, updated_at = now();

UPDATE platform.peskids_leads leads
SET
  service_mode = COALESCE(service_mode, class_modality),
  franchise_id = COALESCE(
    franchise_id,
    CASE
      WHEN class_modality = 'domicilio' THEN (
        SELECT id FROM platform.peskids_franchises
        WHERE tenant_slug = 'peskids' AND slug = 'domicilios-peskids'
      )
      ELSE (
        SELECT id FROM platform.peskids_franchises
        WHERE tenant_slug = 'peskids' AND slug = 'llanogrande-principal'
      )
    END
  )
WHERE tenant_slug = 'peskids';

CREATE INDEX IF NOT EXISTS idx_peskids_leads_franchise
  ON platform.peskids_leads (tenant_slug, franchise_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_leads_franchise
  ON public.leads (tenant_id, franchise_id, created_at DESC);
