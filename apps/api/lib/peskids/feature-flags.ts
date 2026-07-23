/**
 * Peskids Pro feature flags (PR-PRO-1+).
 * Defaults are fail-closed (false) so production behavior is unchanged until Doppler enables them.
 */

function parseBooleanFlag(
  value: string | undefined,
  defaultWhenUnset: boolean
): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultWhenUnset;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return defaultWhenUnset;
}

export function isPeskidsHotLeadAlertsEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_HOT_LEAD_ALERTS_ENABLED, false);
}

export function isPeskidsDailyDigestEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_DAILY_DIGEST_ENABLED, false);
}

export function isPeskidsOperationalNotificationsEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED, false);
}

export function isPeskidsLeadConfirmationEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_LEAD_CONFIRMATION_ENABLED, false);
}

export function isPeskidsLeadReminder24hEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_LEAD_REMINDER_24H_ENABLED, false);
}

export function isPeskidsLeadEscalation48hEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_LEAD_ESCALATION_48H_ENABLED, false);
}

export function isPeskidsAutoCreateFollowupEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_AUTO_CREATE_FOLLOWUP_ENABLED, false);
}

export function isPeskidsTrialReminderEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_TRIAL_REMINDER_ENABLED, false);
}

/** SLA hours for escalation (default 48). Reminder threshold stays 24h. */
export function getPeskidsContactSlaHours(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env.PESKIDS_CONTACT_SLA_HOURS?.trim();
  if (!raw) return 48;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 48;
}
