export type TrialAgendaItem = {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  lead_id: string;
  lead_name: string | null;
  lead_email: string | null;
  modality: string;
  teacher_name: string | null;
  notes: string | null;
  status: string;
};

/** Group trials by scheduled_date for week/day agenda UI. */
export function groupTrialClassesByDate<T extends { scheduled_date: string }>(
  items: T[]
): Array<{ date: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.scheduled_date;
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({ date, items: dayItems }));
}
