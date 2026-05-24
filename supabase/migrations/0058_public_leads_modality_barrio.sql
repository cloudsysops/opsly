-- Peskids dashboard reads public.leads (tenant schema); mirror platform.peskids_leads fields.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS class_modality text
    CHECK (class_modality IS NULL OR class_modality IN ('llanogrande', 'domicilio')),
  ADD COLUMN IF NOT EXISTS neighborhood text;

COMMENT ON COLUMN public.leads.class_modality IS
  'llanogrande = sede Llanogrande; domicilio = clase en casa del alumno';
COMMENT ON COLUMN public.leads.neighborhood IS
  'Barrio o zona del acudiente (ubicación para logística y domicilio)';
