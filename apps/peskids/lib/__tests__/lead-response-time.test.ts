import { describe, expect, it } from 'vitest';
import { firstLeadContactAt, hoursToFirstContact } from '@/lib/admin/lead-response-time';

describe('lead-response-time', () => {
  it('uses the first lead follow-up and ignores non-lead contacts', () => {
    const first = firstLeadContactAt('lead-1', [
      { contact_id: 'lead-1', contact_type: 'student', created_at: '2026-09-06T09:00:00Z' },
      { contact_id: 'lead-1', contact_type: 'lead', created_at: '2026-09-06T11:00:00Z' },
      { contact_id: 'lead-1', contact_type: 'lead', created_at: '2026-09-06T10:00:00Z' },
    ]);

    expect(first).toBe('2026-09-06T10:00:00Z');
  });

  it('returns elapsed hours and rejects missing or inverted timestamps', () => {
    expect(hoursToFirstContact('2026-09-06T08:00:00Z', '2026-09-06T10:30:00Z')).toBe(2.5);
    expect(hoursToFirstContact('2026-09-06T10:00:00Z', '2026-09-06T08:00:00Z')).toBeNull();
    expect(hoursToFirstContact(undefined, '2026-09-06T10:00:00Z')).toBeNull();
  });
});
