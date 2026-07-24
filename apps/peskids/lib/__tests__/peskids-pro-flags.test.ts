import { describe, expect, it, afterEach } from 'vitest';
import {
  getPeskidsContactSlaHours,
  isPeskidsAutoCreateFollowupEnabled,
  isPeskidsDailyDigestEnabled,
  isPeskidsHotLeadAlertsEnabled,
  isPeskidsLeadConfirmationEnabled,
  isPeskidsLeadEscalation48hEnabled,
  isPeskidsLeadReminder24hEnabled,
  isPeskidsOperationalNotificationsEnabled,
  isPeskidsTrialReminderEnabled,
} from '@/lib/peskids-pro-flags';

describe('peskids Pro flags (app)', () => {
  afterEach(() => {
    delete process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED;
    delete process.env.PESKIDS_DAILY_DIGEST_ENABLED;
    delete process.env.PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED;
    delete process.env.PESKIDS_LEAD_REMINDER_24H_ENABLED;
    delete process.env.PESKIDS_LEAD_ESCALATION_48H_ENABLED;
    delete process.env.PESKIDS_AUTO_CREATE_FOLLOWUP_ENABLED;
    delete process.env.PESKIDS_TRIAL_REMINDER_ENABLED;
    delete process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED;
    delete process.env.PESKIDS_CONTACT_SLA_HOURS;
  });

  it('defaults to false', () => {
    expect(isPeskidsHotLeadAlertsEnabled()).toBe(false);
    expect(isPeskidsDailyDigestEnabled()).toBe(false);
    expect(isPeskidsOperationalNotificationsEnabled()).toBe(false);
    expect(isPeskidsLeadReminder24hEnabled()).toBe(false);
    expect(isPeskidsLeadEscalation48hEnabled()).toBe(false);
    expect(isPeskidsAutoCreateFollowupEnabled()).toBe(false);
    expect(isPeskidsTrialReminderEnabled()).toBe(false);
    expect(isPeskidsLeadConfirmationEnabled()).toBe(false);
    expect(getPeskidsContactSlaHours()).toBe(48);
  });

  it('reads lead confirmation when enabled', () => {
    process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED = 'yes';
    expect(isPeskidsLeadConfirmationEnabled()).toBe(true);
  });
});
