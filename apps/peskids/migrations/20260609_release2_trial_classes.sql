-- Peskids Release 2 (tenant mirror): trial classes + source_lead_id on students
-- Canonical: supabase/migrations/0079_peskids_release2_trial_classes.sql

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS source_lead_id UUID;

CREATE INDEX IF NOT EXISTS students_source_lead_id_idx ON public.students (source_lead_id);

CREATE TABLE IF NOT EXISTS public.trial_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'peskids',
  lead_id UUID NOT NULL,
  student_id UUID REFERENCES public.students (id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  modality TEXT NOT NULL CHECK (modality IN ('llanogrande', 'domicilio')),
  teacher_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'confirmed', 'attended', 'no_show', 'cancelled')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trial_classes_tenant_id_idx ON public.trial_classes (tenant_id);
CREATE INDEX IF NOT EXISTS trial_classes_lead_id_idx ON public.trial_classes (lead_id);
CREATE INDEX IF NOT EXISTS trial_classes_scheduled_date_idx ON public.trial_classes (scheduled_date);
