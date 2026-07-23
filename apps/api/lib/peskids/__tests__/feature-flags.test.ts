import { describe, expect, it, afterEach } from 'vitest';
import {
  isPeskidsDailyDigestEnabled,
  isPeskidsHotLeadAlertsEnabled,
  isPeskidsLeadConfirmationEnabled,
  isPeskidsOperationalNotificationsEnabled,
} from '../feature-flags';

describe('peskids Pro feature flags', () => {
  afterEach(() => {
    delete process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED;
    delete process.env.PESKIDS_DAILY_DIGEST_ENABLED;
    delete process.env.PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED;
    delete process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED;
  });

  it('defaults all Pro automation flags to false', () => {
    expect(isPeskidsHotLeadAlertsEnabled()).toBe(false);
    expect(isPeskidsDailyDigestEnabled()).toBe(false);
    expect(isPeskidsOperationalNotificationsEnabled()).toBe(false);
    expect(isPeskidsLeadConfirmationEnabled()).toBe(false);
  });

  it('parses explicit true/false', () => {
    process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED = 'true';
    process.env.PESKIDS_DAILY_DIGEST_ENABLED = '1';
    process.env.PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED = 'off';
    process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED = 'yes';
    expect(isPeskidsHotLeadAlertsEnabled()).toBe(true);
    expect(isPeskidsDailyDigestEnabled()).toBe(true);
    expect(isPeskidsOperationalNotificationsEnabled()).toBe(false);
    expect(isPeskidsLeadConfirmationEnabled()).toBe(true);
  });
});
