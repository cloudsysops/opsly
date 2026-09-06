export type LeadContactEvent = {
  contact_id: string;
  contact_type: string;
  created_at?: string | null;
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function firstLeadContactAt(
  leadId: string,
  events: readonly LeadContactEvent[]
): string | null {
  const timestamps = events
    .filter((event) => event.contact_type === 'lead' && event.contact_id === leadId)
    .map((event) => event.created_at)
    .filter((value): value is string => Boolean(value))
    .sort();

  return timestamps[0] ?? null;
}

export function hoursToFirstContact(
  leadCreatedAt: string | null | undefined,
  firstContactAt: string | null | undefined
): number | null {
  const start = parseDate(leadCreatedAt);
  const end = parseDate(firstContactAt);
  if (!start || !end) return null;

  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  if (hours < 0) return null;
  return Math.round(hours * 10) / 10;
}
