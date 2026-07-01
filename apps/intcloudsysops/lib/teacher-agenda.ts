import type { AgendaItem, ClassListItem } from '@/lib/class-types';
import type { DaySlot } from '@/components/teacher/teacher-dashboard-types';

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
    classId: classItem.id,
    day: dayFormatter.format(new Date(classItem.starts_at)),
    time: timeFormatter.format(new Date(classItem.starts_at)),
    startsAt: classItem.starts_at,
    endsAt: classItem.ends_at,
    className: classItem.title,
    students: classItem.enrolled_count,
    status: slotStatus(classItem, now),
  }));
}

function slotStatusFromAgenda(item: AgendaItem, now: Date): DaySlot['status'] {
  const start = new Date(item.starts_at).getTime();
  const end = new Date(item.ends_at).getTime();
  const current = now.getTime();

  if (item.status === 'completed' || item.status === 'cancelled') {
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

export function mapAgendaItemsToAgendaSlots(items: AgendaItem[], now = new Date()): DaySlot[] {
  return items.map((item) => ({
    classId: item.class_id,
    day: dayFormatter.format(new Date(item.starts_at)),
    time: timeFormatter.format(new Date(item.starts_at)),
    startsAt: item.starts_at,
    endsAt: item.ends_at,
    className: item.title,
    students: item.enrolled_count ?? 0,
    status: slotStatusFromAgenda(item, now),
  }));
}

export function filterTodayAgendaSlots(slots: DaySlot[], now = new Date()): DaySlot[] {
  const todayLabel = dayFormatter.format(now);
  return slots.filter((slot) => slot.day === todayLabel);
}
