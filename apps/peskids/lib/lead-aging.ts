/**
 * Pure aging classifiers for Peskids Pro (PR-PRO-5).
 * No I/O — safe for unit tests and admin badge helpers.
 */

export type LeadAgingBucket = 'none' | 'reminder_24h' | 'escalation_48h';

export type LeadAgingBadge = {
  bucket: Exclude<LeadAgingBucket, 'none'>;
  label: string;
  hours_uncontacted: number;
};

const MS_PER_HOUR = 60 * 60 * 1000;

export function hoursSince(iso: string, now: Date = new Date()): number {
  const created = Date.parse(iso);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, (now.getTime() - created) / MS_PER_HOUR);
}

/**
 * Only `new` (and Spanish/legacy aliases) age into reminder/escalation.
 * Contacted+ leads are considered touched by staff.
 */
export function isUncontactedLeadStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === 'new' || normalized === 'nuevo' || normalized === 'pending';
}

export function resolveLeadAgingBucket(
  status: string,
  createdAt: string,
  now: Date = new Date(),
  reminderHours = 24,
  escalationHours = 48
): LeadAgingBucket {
  if (!isUncontactedLeadStatus(status)) return 'none';
  const hours = hoursSince(createdAt, now);
  if (hours >= escalationHours) return 'escalation_48h';
  if (hours >= reminderHours) return 'reminder_24h';
  return 'none';
}

export function leadAgingBadge(
  status: string,
  createdAt: string,
  now: Date = new Date()
): LeadAgingBadge | null {
  const bucket = resolveLeadAgingBucket(status, createdAt, now);
  if (bucket === 'none') return null;
  const hours = Math.floor(hoursSince(createdAt, now));
  if (bucket === 'escalation_48h') {
    return {
      bucket,
      label: `Sin contacto +${hours}h (escalar)`,
      hours_uncontacted: hours,
    };
  }
  return {
    bucket,
    label: `Sin contacto +${hours}h`,
    hours_uncontacted: hours,
  };
}

/** Calendar day key in America/Bogota for temporal idempotency windows. */
export function agingWindowKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.PESKIDS_TIMEZONE?.trim() || 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function agingIdempotencyKey(
  kind: string,
  entityId: string,
  windowKey: string
): string {
  return `aging:${kind}:${entityId}:${windowKey}`;
}
