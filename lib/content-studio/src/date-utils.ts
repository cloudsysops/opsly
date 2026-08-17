const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

export function formatRelativeTime(date: Date, now = new Date()): string {
  const delta = now.getTime() - date.getTime();
  const abs = Math.abs(delta);

  if (abs < minuteMs) return delta >= 0 ? 'just now' : 'in a moment';
  if (abs < hourMs) {
    const minutes = Math.round(abs / minuteMs);
    return delta >= 0 ? `${pluralize(minutes, 'minute')} ago` : `in ${pluralize(minutes, 'minute')}`;
  }
  if (abs < dayMs) {
    const hours = Math.round(abs / hourMs);
    return delta >= 0 ? `${pluralize(hours, 'hour')} ago` : `in ${pluralize(hours, 'hour')}`;
  }
  const days = Math.round(abs / dayMs);
  return delta >= 0 ? `${pluralize(days, 'day')} ago` : `in ${pluralize(days, 'day')}`;
}

export function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDayNumber(date: Date): number {
  return date.getDate();
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endTime = new Date(end);
  endTime.setHours(0, 0, 0, 0);

  while (current.getTime() <= endTime.getTime()) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}
