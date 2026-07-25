import { describe, expect, it, afterEach } from 'vitest';
import {
  getPeskidsAttendanceRiskThreshold,
  getPeskidsContactSlaHours,
  isPeskidsAttendanceRiskAlertEnabled,
  isPeskidsAutoCreateFollowupEnabled,
  isPeskidsDailyDigestEnabled,
  isPeskidsFamilyAccessEmailEnabled,
  isPeskidsHotLeadAlertsEnabled,
  isPeskidsLeadConfirmationEnabled,
  isPeskidsLeadEscalation48hEnabled,
  isPeskidsLeadReminder24hEnabled,
  isPeskidsOperationalNotificationsEnabled,
  isPeskidsRenewalReminderEnabled,
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
    delete process.env.PESKIDS_FAMILY_ACCESS_EMAIL_ENABLED;
    delete process.env.PESKIDS_CONTACT_SLA_HOURS;
    delete process.env.PESKIDS_RENEWAL_REMINDER_ENABLED;
    delete process.env.PESKIDS_ATTENDANCE_RISK_ALERT_ENABLED;
    delete process.env.PESKIDS_ATTENDANCE_RISK_THRESHOLD;
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
    expect(isPeskidsFamilyAccessEmailEnabled()).toBe(false);
    expect(isPeskidsRenewalReminderEnabled()).toBe(false);
    expect(isPeskidsAttendanceRiskAlertEnabled()).toBe(false);
    expect(getPeskidsContactSlaHours()).toBe(48);
    expect(getPeskidsAttendanceRiskThreshold()).toBe(3);
  });

  it('reads lead confirmation when enabled', () => {
    process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED = 'yes';
    expect(isPeskidsLeadConfirmationEnabled()).toBe(true);
  });

  it('reads renewal reminder when enabled', () => {
    process.env.PESKIDS_RENEWAL_REMINDER_ENABLED = 'true';
    expect(isPeskidsRenewalReminderEnabled()).toBe(true);
  });

  it('reads attendance risk alert flag and threshold when set', () => {
    process.env.PESKIDS_ATTENDANCE_RISK_ALERT_ENABLED = 'true';
    process.env.PESKIDS_ATTENDANCE_RISK_THRESHOLD = '5';
    expect(isPeskidsAttendanceRiskAlertEnabled()).toBe(true);
    expect(getPeskidsAttendanceRiskThreshold()).toBe(5);
  });
});
