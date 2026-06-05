-- Migration: 0074_peskids_ghl_leads_add_lost_stage
-- Adds 'Lost' to the peskids_leads stage CHECK constraint.
-- Migration 0071 omitted 'Lost' while the code/Zod schema allowed it,
-- causing DB errors on any stage update to Lost. This migration fixes the mismatch.

DO $$ BEGIN
  ALTER TABLE platform.peskids_leads
    DROP CONSTRAINT IF EXISTS peskids_leads_stage_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE platform.peskids_leads
    ADD CONSTRAINT peskids_leads_stage_check
      CHECK (
        stage IS NULL
        OR stage IN (
          'New Lead',
          'Contacted',
          'Trial Class',
          'Enrolled',
          'Active Student',
          'Renewal',
          'Lost'
        )
      );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
