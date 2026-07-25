-- Attendance-risk alerts: extend the aging-alert idempotency log to cover
-- students (not just leads/followups/trials). Safe to re-run (IF NOT EXISTS
-- / constraint drop+recreate). Do not apply to prod without human approval.

BEGIN;

ALTER TABLE platform.peskids_aging_alert_deliveries
  DROP CONSTRAINT IF EXISTS peskids_aging_alert_deliveries_alert_kind_check;

ALTER TABLE platform.peskids_aging_alert_deliveries
  ADD CONSTRAINT peskids_aging_alert_deliveries_alert_kind_check
  CHECK (alert_kind IN (
    'lead_reminder_24h',
    'lead_escalation_48h',
    'followup_overdue',
    'trial_unconfirmed',
    'attendance_risk'
  ));

ALTER TABLE platform.peskids_aging_alert_deliveries
  DROP CONSTRAINT IF EXISTS peskids_aging_alert_deliveries_entity_type_check;

ALTER TABLE platform.peskids_aging_alert_deliveries
  ADD CONSTRAINT peskids_aging_alert_deliveries_entity_type_check
  CHECK (entity_type IN ('lead', 'followup', 'trial', 'student'));

COMMIT;
