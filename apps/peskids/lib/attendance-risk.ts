/**
 * Pure attendance-risk classifier for Peskids students.
 * No I/O — safe for unit tests and admin badge helpers.
 */

export type ClassEnrollmentRecord = {
  status: 'reserved' | 'confirmed' | 'cancelled' | 'no_show' | 'attended';
  attendance: 'present' | 'absent' | 'excused' | null;
  starts_at: string;
};

type AttendanceOutcome = 'present' | 'absent' | 'excused' | 'no_show';

/** Cancelled enrollments never happened — exclude from the attendance streak. */
function resolveOutcome(record: ClassEnrollmentRecord): AttendanceOutcome | null {
  if (record.status === 'cancelled') return null;
  if (record.attendance) return record.attendance;
  if (record.status === 'no_show') return 'no_show';
  return null;
}

/**
 * Counts consecutive absent/no_show classes, most recent first, stopping at
 * the first present or excused record (an excused absence means the family
 * gave notice — lower retention risk, so it breaks the streak rather than
 * counting toward it). Only classes that have already started are considered;
 * future/unrecorded classes are skipped, not treated as breaks.
 */
export function countConsecutiveAbsences(
  records: ClassEnrollmentRecord[],
  now: Date = new Date()
): number {
  const past = records
    .map((record) => ({ record, outcome: resolveOutcome(record) }))
    .filter(
      (entry): entry is { record: ClassEnrollmentRecord; outcome: AttendanceOutcome } =>
        entry.outcome !== null && Date.parse(entry.record.starts_at) <= now.getTime()
    )
    .sort((a, b) => Date.parse(b.record.starts_at) - Date.parse(a.record.starts_at));

  let count = 0;
  for (const { outcome } of past) {
    if (outcome === 'absent' || outcome === 'no_show') {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

export function isAttendanceRisk(
  records: ClassEnrollmentRecord[],
  threshold: number,
  now: Date = new Date()
): boolean {
  return countConsecutiveAbsences(records, now) >= threshold;
}
