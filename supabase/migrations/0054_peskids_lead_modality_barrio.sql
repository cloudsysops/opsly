-- Peskids leads: class modality (sede vs domicilio) + neighborhood for new families

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS class_modality text
    CHECK (class_modality IS NULL OR class_modality IN ('llanogrande', 'domicilio')),
  ADD COLUMN IF NOT EXISTS neighborhood text;

COMMENT ON COLUMN platform.peskids_leads.class_modality IS
  'llanogrande = sede Llanogrande; domicilio = clase en casa del alumno';
COMMENT ON COLUMN platform.peskids_leads.neighborhood IS
  'Barrio o zona del acudiente (ubicación para logística y domicilio)';
