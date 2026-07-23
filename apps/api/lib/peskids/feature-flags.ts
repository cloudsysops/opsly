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
