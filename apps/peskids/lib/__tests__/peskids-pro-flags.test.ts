import { describe, expect, it, afterEach } from 'vitest';
import {
  isPeskidsDailyDigestEnabled,
  isPeskidsHotLeadAlertsEnabled,
  isPeskidsOperationalNotificationsEnabled,
} from '@/lib/peskids-pro-flags';

describe('peskids Pro flags (app)', () => {
  afterEach(() => {
    delete process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED;
    delete process.env.PESKIDS_DAILY_DIGEST_ENABLED;
    delete process.env.PESKIDS_OPERATIONAL_NOTIFICATIONS_ENABLED;
  });

  it('defaults to false', () => {
    expect(isPeskidsHotLeadAlertsEnabled()).toBe(false);
    expect(isPeskidsDailyDigestEnabled()).toBe(false);
    expect(isPeskidsOperationalNotificationsEnabled()).toBe(false);
  });
});
