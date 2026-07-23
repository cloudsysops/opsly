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
} from '../feature-flags';

describe('peskids Pro feature flags', () => {
  afterEach(() => {
    delete process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED;
    delete process.env.PESKIDS_DAILY_DIGEST_ENABLED;
    delete process.env.PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED;
    delete process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED;
    delete process.env.PESKIDS_LEAD_REMINDER_24H_ENABLED;
    delete process.env.PESKIDS_LEAD_ESCALATION_48H_ENABLED;
    delete process.env.PESKIDS_AUTO_CREATE_FOLLOWUP_ENABLED;
    delete process.env.PESKIDS_TRIAL_REMINDER_ENABLED;
    delete process.env.PESKIDS_CONTACT_SLA_HOURS;
  });

  it('defaults all Pro automation flags to false', () => {
    expect(isPeskidsHotLeadAlertsEnabled()).toBe(false);
    expect(isPeskidsDailyDigestEnabled()).toBe(false);
    expect(isPeskidsOperationalNotificationsEnabled()).toBe(false);
    expect(isPeskidsLeadConfirmationEnabled()).toBe(false);
    expect(isPeskidsLeadReminder24hEnabled()).toBe(false);
    expect(isPeskidsLeadEscalation48hEnabled()).toBe(false);
    expect(isPeskidsAutoCreateFollowupEnabled()).toBe(false);
    expect(isPeskidsTrialReminderEnabled()).toBe(false);
    expect(getPeskidsContactSlaHours()).toBe(48);
  });

  it('parses explicit true/false', () => {
    process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED = 'true';
    process.env.PESKIDS_DAILY_DIGEST_ENABLED = '1';
    process.env.PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED = 'off';
    process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED = 'yes';
    process.env.PESKIDS_LEAD_REMINDER_24H_ENABLED = 'true';
    process.env.PESKIDS_CONTACT_SLA_HOURS = '72';
    expect(isPeskidsHotLeadAlertsEnabled()).toBe(true);
    expect(isPeskidsDailyDigestEnabled()).toBe(true);
    expect(isPeskidsOperationalNotificationsEnabled()).toBe(false);
    expect(isPeskidsLeadConfirmationEnabled()).toBe(true);
    expect(isPeskidsLeadReminder24hEnabled()).toBe(true);
    expect(getPeskidsContactSlaHours()).toBe(72);
  });
});
