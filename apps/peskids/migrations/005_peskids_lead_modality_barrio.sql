-- Mirror platform.peskids_leads fields on tenant public.leads (dashboard + Jelou)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS class_modality text
    CHECK (class_modality IS NULL OR class_modality IN ('llanogrande', 'domicilio')),
  ADD COLUMN IF NOT EXISTS neighborhood text;
