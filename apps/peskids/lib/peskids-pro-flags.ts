/**
 * Peskids app-side Pro flags (PR-PRO-1). Mirror of API flags for digest gating metadata.
 * Defaults false — fail-closed.
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

export function isPeskidsHotLeadAlertsEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_HOT_LEAD_ALERTS_ENABLED, false);
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

/** Mirror of API `PESKIDS_LEAD_CONFIRMATION_ENABLED` for health/runbook parity. */
export function isPeskidsLeadConfirmationEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_LEAD_CONFIRMATION_ENABLED, false);
}

/**
 * Family portal magic-link emails (Resend). Default OFF so the Peskids team can
 * load students/leads in admin without inviting families until they authorize go-live.
 */
export function isPeskidsFamilyAccessEmailEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED, false);
}

/**
 * Staff-only "improvement chat": owner/staff describe platform improvements
 * they want and an AI classifies + summarizes each request, optionally
 * creating a Twenty CRM task. Default OFF until the team is ready to use it.
 */
export function isPeskidsStaffImprovementChatEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(
    env.OPSLY_IMPROVEMENT_TRACKER_ENABLED ?? env.PESKIDS_STAFF_IMPROVEMENT_CHAT_ENABLED,
    false
  );
}

/**
 * Sub-toggle: when the improvement chat is enabled, also auto-create a
 * Twenty CRM task for actionable requests (bug/feature_request/improvement).
 * Independent flag so the team can use the chat without touching Twenty yet.
 */
export function isPeskidsStaffImprovementChatTwentyTaskEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_STAFF_IMPROVEMENT_CHAT_TWENTY_TASK_ENABLED, false);
}

/**
 * Sub-toggle: creates a GitHub issue from an improvement request when an
 * admin explicitly clicks the action in `/admin/mejoras`. Default OFF because
 * the token is privileged and GitHub issues may be public depending on repo.
 */
export function isPeskidsStaffImprovementChatGithubIssueEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(
    env.OPSLY_IMPROVEMENT_GITHUB_ISSUE_ENABLED ??
      env.PESKIDS_STAFF_IMPROVEMENT_CHAT_GITHUB_ISSUE_ENABLED,
    false
  );
}

/**
 * Auto-followup (+ Twenty Task, via createFollowup for contact_type: 'lead')
 * when the commercial pipeline advances a lead to the Renewal stage.
 */
export function isPeskidsRenewalReminderEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_RENEWAL_REMINDER_ENABLED, false);
}

/** Auto-followup on consecutive class absences (retention risk). */
export function isPeskidsAttendanceRiskAlertEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return parseBooleanFlag(env.PESKIDS_ATTENDANCE_RISK_ALERT_ENABLED, false);
}

export function getPeskidsAttendanceRiskThreshold(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env.PESKIDS_ATTENDANCE_RISK_THRESHOLD?.trim();
  if (!raw) return 3;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

export function getPeskidsContactSlaHours(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env.PESKIDS_CONTACT_SLA_HOURS?.trim();
  if (!raw) return 48;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 48;
}
