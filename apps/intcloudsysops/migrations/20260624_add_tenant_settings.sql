CREATE TABLE IF NOT EXISTS public.tenant_settings (
  tenant_id TEXT PRIMARY KEY,
  academy_name TEXT NOT NULL DEFAULT 'Peskids',
  sede_label TEXT NOT NULL DEFAULT 'Llanogrande',
  support_email TEXT,
  support_phone TEXT,
  default_modality TEXT NOT NULL DEFAULT 'llanogrande' CHECK (default_modality IN ('llanogrande', 'domicilio')),
  default_capacity INTEGER NOT NULL DEFAULT 8 CHECK (default_capacity > 0),
  default_price_cents INTEGER NOT NULL DEFAULT 85000 CHECK (default_price_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.tenant_settings (tenant_id)
VALUES ('peskids')
ON CONFLICT (tenant_id) DO NOTHING;
