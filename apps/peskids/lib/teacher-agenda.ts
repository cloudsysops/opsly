import type { ClassListItem } from '@/lib/class-types';
import type { DaySlot } from '@/components/teacher/teacher-weekly-static-data';

const dayFormatter = new Intl.DateTimeFormat('es-CO', { weekday: 'short' });
const timeFormatter = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
});

function slotStatus(classItem: ClassListItem, now: Date): DaySlot['status'] {
  const start = new Date(classItem.starts_at).getTime();
  const end = new Date(classItem.ends_at).getTime();
  const current = now.getTime();

  if (classItem.status === 'completed' || classItem.status === 'cancelled') {
    return 'done';
  }
  if (current >= start && current <= end) {
    return 'ongoing';
  }
  if (current > end) {
    return 'done';
  }
  return 'scheduled';
}

export function mapClassesToAgendaSlots(classes: ClassListItem[], now = new Date()): DaySlot[] {
  return classes.map((classItem) => ({
    day: dayFormatter.format(new Date(classItem.starts_at)),
    time: timeFormatter.format(new Date(classItem.starts_at)),
    className: classItem.title,
    students: classItem.enrolled_count,
    status: slotStatus(classItem, now),
  }));
}

export function filterTodayAgendaSlots(slots: DaySlot[], now = new Date()): DaySlot[] {
  const todayLabel = dayFormatter.format(now);
  return slots.filter((slot) => slot.day === todayLabel);
}
