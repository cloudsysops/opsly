import { afterEach, describe, expect, it } from 'vitest';
import {
  agingIdempotencyKey,
  agingWindowKey,
  hoursSince,
  isUncontactedLeadStatus,
  leadAgingBadge,
  resolveLeadAgingBucket,
} from '@/lib/lead-aging';

describe('lead-aging classifiers', () => {
  afterEach(() => {
    delete process.env.PESKIDS_TIMEZONE;
  });

  it('detects uncontacted statuses', () => {
    expect(isUncontactedLeadStatus('new')).toBe(true);
    expect(isUncontactedLeadStatus('nuevo')).toBe(true);
    expect(isUncontactedLeadStatus('contacted')).toBe(false);
  });

  it('returns none under 24h', () => {
    const now = new Date('2026-07-23T12:00:00.000Z');
    const created = '2026-07-23T01:00:00.000Z';
    expect(resolveLeadAgingBucket('new', created, now)).toBe('none');
  });

  it('returns reminder_24h between 24 and 48h', () => {
    const now = new Date('2026-07-23T12:00:00.000Z');
    const created = '2026-07-22T11:00:00.000Z';
    expect(hoursSince(created, now)).toBeGreaterThanOrEqual(24);
    expect(resolveLeadAgingBucket('new', created, now)).toBe('reminder_24h');
  });

  it('returns escalation_48h after SLA hours', () => {
    const now = new Date('2026-07-23T12:00:00.000Z');
    const created = '2026-07-21T11:00:00.000Z';
    expect(resolveLeadAgingBucket('new', created, now, 24, 48)).toBe('escalation_48h');
  });

  it('ignores contacted leads even when old', () => {
    const now = new Date('2026-07-23T12:00:00.000Z');
    const created = '2026-07-01T00:00:00.000Z';
    expect(resolveLeadAgingBucket('contacted', created, now)).toBe('none');
  });

  it('builds badge labels', () => {
    const now = new Date('2026-07-23T12:00:00.000Z');
    const badge = leadAgingBadge('new', '2026-07-21T11:00:00.000Z', now);
    expect(badge?.bucket).toBe('escalation_48h');
    expect(badge?.label).toContain('escalar');
  });

  it('builds deterministic idempotency keys', () => {
    expect(agingIdempotencyKey('lead_reminder_24h', 'uuid-1', '2026-07-23')).toBe(
      'aging:lead_reminder_24h:uuid-1:2026-07-23'
    );
    process.env.PESKIDS_TIMEZONE = 'America/Bogota';
    expect(agingWindowKey(new Date('2026-07-23T05:00:00.000Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
