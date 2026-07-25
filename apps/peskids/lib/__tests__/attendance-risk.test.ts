import { describe, expect, it } from 'vitest';
import { countConsecutiveAbsences, isAttendanceRisk } from '@/lib/attendance-risk';
import type { ClassEnrollmentRecord } from '@/lib/attendance-risk';

const NOW = new Date('2026-07-24T12:00:00.000Z');

function record(
  overrides: Partial<ClassEnrollmentRecord> & { starts_at: string }
): ClassEnrollmentRecord {
  return {
    status: 'attended',
    attendance: null,
    ...overrides,
  };
}

describe('countConsecutiveAbsences', () => {
  it('counts absences from most recent backwards', () => {
    const records = [
      record({ starts_at: '2026-07-01T09:00:00.000Z', attendance: 'present' }),
      record({ starts_at: '2026-07-08T09:00:00.000Z', attendance: 'absent' }),
      record({ starts_at: '2026-07-15T09:00:00.000Z', attendance: 'absent' }),
      record({ starts_at: '2026-07-22T09:00:00.000Z', status: 'no_show', attendance: null }),
    ];
    expect(countConsecutiveAbsences(records, NOW)).toBe(3);
  });

  it('stops the streak at a present record', () => {
    const records = [
      record({ starts_at: '2026-07-01T09:00:00.000Z', attendance: 'absent' }),
      record({ starts_at: '2026-07-08T09:00:00.000Z', attendance: 'present' }),
      record({ starts_at: '2026-07-15T09:00:00.000Z', attendance: 'absent' }),
      record({ starts_at: '2026-07-22T09:00:00.000Z', attendance: 'absent' }),
    ];
    expect(countConsecutiveAbsences(records, NOW)).toBe(2);
  });

  it('treats an excused absence as breaking the streak, not counting toward it', () => {
    const records = [
      record({ starts_at: '2026-07-08T09:00:00.000Z', attendance: 'absent' }),
      record({ starts_at: '2026-07-15T09:00:00.000Z', attendance: 'excused' }),
      record({ starts_at: '2026-07-22T09:00:00.000Z', attendance: 'absent' }),
    ];
    expect(countConsecutiveAbsences(records, NOW)).toBe(1);
  });

  it('ignores cancelled enrollments entirely', () => {
    const records = [
      record({ starts_at: '2026-07-15T09:00:00.000Z', status: 'cancelled', attendance: null }),
      record({ starts_at: '2026-07-22T09:00:00.000Z', attendance: 'absent' }),
    ];
    expect(countConsecutiveAbsences(records, NOW)).toBe(1);
  });

  it('skips future classes without treating them as breaks', () => {
    const records = [
      record({ starts_at: '2026-07-15T09:00:00.000Z', attendance: 'absent' }),
      record({ starts_at: '2026-07-22T09:00:00.000Z', attendance: 'absent' }),
      record({ starts_at: '2026-08-01T09:00:00.000Z', status: 'reserved', attendance: null }),
    ];
    expect(countConsecutiveAbsences(records, NOW)).toBe(2);
  });

  it('returns 0 when there is no attendance history yet', () => {
    expect(countConsecutiveAbsences([], NOW)).toBe(0);
  });
});

describe('isAttendanceRisk', () => {
  it('is false below threshold and true at/above it', () => {
    const records = [
      record({ starts_at: '2026-07-08T09:00:00.000Z', attendance: 'absent' }),
      record({ starts_at: '2026-07-15T09:00:00.000Z', attendance: 'absent' }),
    ];
    expect(isAttendanceRisk(records, 3, NOW)).toBe(false);
    expect(isAttendanceRisk(records, 2, NOW)).toBe(true);
  });
});
