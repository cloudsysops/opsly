/**
 * Non-secret observability snapshot for GET /api/health (PR-PRO-12).
 * Never include secret values — only presence / boolean flags.
 */

import {
  getPeskidsContactSlaHours,
  isPeskidsAutoCreateFollowupEnabled,
  isPeskidsDailyDigestEnabled,
  isPeskidsFamilyAccessEmailEnabled,
  isPeskidsHotLeadAlertsEnabled,
  isPeskidsLeadConfirmationEnabled,
  isPeskidsLeadEscalation48hEnabled,
  isPeskidsLeadReminder24hEnabled,
  isPeskidsOperationalNotificationsEnabled,
  isPeskidsTrialReminderEnabled,
} from '@/lib/peskids-pro-flags';

export type PeskidsProObservabilitySnapshot = {
  event_bus_configured: boolean;
  contact_sla_hours: number;
  flags: {
    hot_lead_alerts: boolean;
    daily_digest: boolean;
    operational_notifications: boolean;
    lead_reminder_24h: boolean;
    lead_escalation_48h: boolean;
    trial_reminder: boolean;
    auto_create_followup: boolean;
    lead_confirmation: boolean;
    family_access_email: boolean;
  };
};

function isEventBusConfigured(env: NodeJS.ProcessEnv): boolean {
  const raw =
    env.OPSLY_EVENT_BUS_URL?.trim() || env.NEXT_PUBLIC_OPSLY_EVENT_BUS_URL?.trim() || '';
  return raw.length > 0;
}

export function buildPeskidsProObservability(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): PeskidsProObservabilitySnapshot {
  const processEnv = env as NodeJS.ProcessEnv;
  return {
    event_bus_configured: isEventBusConfigured(processEnv),
    contact_sla_hours: getPeskidsContactSlaHours(processEnv),
    flags: {
      hot_lead_alerts: isPeskidsHotLeadAlertsEnabled(processEnv),
      daily_digest: isPeskidsDailyDigestEnabled(processEnv),
      operational_notifications: isPeskidsOperationalNotificationsEnabled(processEnv),
      lead_reminder_24h: isPeskidsLeadReminder24hEnabled(processEnv),
      lead_escalation_48h: isPeskidsLeadEscalation48hEnabled(processEnv),
      trial_reminder: isPeskidsTrialReminderEnabled(processEnv),
      auto_create_followup: isPeskidsAutoCreateFollowupEnabled(processEnv),
      lead_confirmation: isPeskidsLeadConfirmationEnabled(processEnv),
      family_access_email: isPeskidsFamilyAccessEmailEnabled(processEnv),
    },
  };
}
