-- Peskids franchise operating model (inside tenant peskids — NOT new tenants).
-- Idempotent. Preserves class_modality / location as compatibility fields.
-- Llanogrande = flagship; Domicilios = mobile/owned operational unit.

BEGIN;

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

-- Ensure at most one primary franchise per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS uq_peskids_franchises_one_primary
  ON platform.peskids_franchises (tenant_slug)
  WHERE is_primary = true;

COMMENT ON TABLE platform.peskids_franchises IS
  'Commercial/operating units under tenant peskids. Never create a new Opsly tenant per franchise.';

-- Nullable franchise_id on operational tables (additive).
ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL;

ALTER TABLE public.trial_classes
  ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL;

ALTER TABLE public.followups
  ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL;

DO $$
BEGIN
  IF to_regclass('peskids.pools') IS NOT NULL THEN
    ALTER TABLE peskids.pools
      ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('peskids.classes') IS NOT NULL THEN
    ALTER TABLE peskids.classes
      ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES platform.peskids_franchises (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_peskids_leads_franchise
  ON platform.peskids_leads (tenant_slug, franchise_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_leads_franchise
  ON public.leads (tenant_id, franchise_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_students_franchise
  ON public.students (tenant_id, franchise_id);

CREATE INDEX IF NOT EXISTS idx_public_trial_classes_franchise
  ON public.trial_classes (tenant_id, franchise_id);

CREATE INDEX IF NOT EXISTS idx_public_followups_franchise
  ON public.followups (tenant_id, franchise_id);

CREATE INDEX IF NOT EXISTS idx_public_messages_franchise
  ON public.messages (tenant_id, franchise_id);

-- Seed flagship + mobile (idempotent).
INSERT INTO platform.peskids_franchises (tenant_slug, slug, name, type, is_primary, status)
VALUES
  ('peskids', 'llanogrande-principal', 'Llanogrande Principal', 'flagship', true, 'active'),
  ('peskids', 'domicilios-peskids', 'Domicilios Peskids', 'mobile', false, 'active')
ON CONFLICT (tenant_slug, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  is_primary = EXCLUDED.is_primary,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO platform.peskids_franchise_locations (tenant_slug, franchise_id, slug, name, kind, city)
SELECT 'peskids', id, 'sede-llanogrande', 'Sede Llanogrande', 'pool', 'Rionegro'
FROM platform.peskids_franchises
WHERE tenant_slug = 'peskids' AND slug = 'llanogrande-principal'
ON CONFLICT (franchise_id, slug) DO UPDATE
SET name = EXCLUDED.name, kind = EXCLUDED.kind, city = EXCLUDED.city, updated_at = now();

INSERT INTO platform.peskids_franchise_locations (tenant_slug, franchise_id, slug, name, kind)
SELECT 'peskids', id, 'zona-domicilios', 'Zona Domicilios Peskids', 'home_zone'
FROM platform.peskids_franchises
WHERE tenant_slug = 'peskids' AND slug = 'domicilios-peskids'
ON CONFLICT (franchise_id, slug) DO UPDATE
SET name = EXCLUDED.name, kind = EXCLUDED.kind, updated_at = now();

-- Backfill: modality/location → franchise (only where franchise_id IS NULL).
UPDATE platform.peskids_leads pl
SET franchise_id = f.id,
    updated_at = COALESCE(pl.updated_at, now())
FROM platform.peskids_franchises f
WHERE pl.tenant_slug = 'peskids'
  AND pl.franchise_id IS NULL
  AND f.tenant_slug = 'peskids'
  AND f.slug = CASE
    WHEN pl.class_modality = 'domicilio' THEN 'domicilios-peskids'
    ELSE 'llanogrande-principal'
  END;

UPDATE public.leads l
SET franchise_id = f.id,
    updated_at = COALESCE(l.updated_at, now())
FROM platform.peskids_franchises f
WHERE l.tenant_id = 'peskids'
  AND l.franchise_id IS NULL
  AND f.tenant_slug = 'peskids'
  AND f.slug = CASE
    WHEN l.class_modality = 'domicilio' THEN 'domicilios-peskids'
    ELSE 'llanogrande-principal'
  END;

UPDATE public.trial_classes tc
SET franchise_id = f.id,
    updated_at = COALESCE(tc.updated_at, now())
FROM platform.peskids_franchises f
WHERE tc.tenant_id = 'peskids'
  AND tc.franchise_id IS NULL
  AND f.tenant_slug = 'peskids'
  AND f.slug = CASE
    WHEN tc.modality = 'domicilio' THEN 'domicilios-peskids'
    ELSE 'llanogrande-principal'
  END;

DO $$
BEGIN
  IF to_regclass('peskids.classes') IS NOT NULL THEN
    UPDATE peskids.classes c
    SET franchise_id = f.id,
        updated_at = COALESCE(c.updated_at, now())
    FROM platform.peskids_franchises f
    WHERE c.tenant_slug = 'peskids'
      AND c.franchise_id IS NULL
      AND f.tenant_slug = 'peskids'
      AND f.slug = CASE
        WHEN c.location = 'domicilio' THEN 'domicilios-peskids'
        ELSE 'llanogrande-principal'
      END;
  END IF;

  IF to_regclass('peskids.pools') IS NOT NULL THEN
    UPDATE peskids.pools p
    SET franchise_id = f.id
    FROM platform.peskids_franchises f
    WHERE p.tenant_slug = 'peskids'
      AND p.franchise_id IS NULL
      AND f.tenant_slug = 'peskids'
      AND f.slug = CASE
        WHEN p.location = 'domicilio' THEN 'domicilios-peskids'
        ELSE 'llanogrande-principal'
      END;
  END IF;
END $$;

-- Students: inherit franchise from linked lead when available; else leave null.
UPDATE public.students s
SET franchise_id = l.franchise_id,
    updated_at = COALESCE(s.updated_at, now())
FROM public.leads l
WHERE s.tenant_id = 'peskids'
  AND s.franchise_id IS NULL
  AND l.tenant_id = 'peskids'
  AND l.franchise_id IS NOT NULL
  AND lower(coalesce(s.parent_email, '')) = lower(coalesce(l.email, ''))
  AND coalesce(s.parent_email, '') <> '';

-- Owner/admin memberships on both franchises (best-effort; skip if no user_id).
INSERT INTO platform.peskids_franchise_staff_memberships (tenant_slug, franchise_id, user_id, role)
SELECT
  'peskids',
  f.id,
  tm.user_id,
  CASE WHEN tm.role = 'owner' THEN 'owner' ELSE 'admin' END
FROM platform.tenants t
JOIN platform.tenant_memberships tm ON tm.tenant_id = t.id
CROSS JOIN platform.peskids_franchises f
WHERE t.slug = 'peskids'
  AND tm.status = 'active'
  AND tm.role IN ('owner', 'admin')
  AND tm.user_id IS NOT NULL
  AND f.tenant_slug = 'peskids'
  AND f.status = 'active'
ON CONFLICT (franchise_id, user_id, role) DO NOTHING;

COMMIT;
