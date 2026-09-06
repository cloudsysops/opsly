-- Prevent duplicate "contactar en 1 mes" tasks when a support user retries.
-- Production application requires the normal migration review and window gate.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.followups
    WHERE status = 'pending'
      AND contact_type = 'lead'
      AND type = 'call'
      AND notes = 'Contactar en 1 mes después de la clase de prueba.'
    GROUP BY tenant_id, contact_id, contact_type, type, due_date, notes
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate post-trial followups exist; resolve them before applying this migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_followups_post_trial_one_month_unique
  ON public.followups (tenant_id, contact_id, contact_type, type, due_date, notes)
  WHERE status = 'pending'
    AND contact_type = 'lead'
    AND type = 'call'
    AND notes = 'Contactar en 1 mes después de la clase de prueba.';
