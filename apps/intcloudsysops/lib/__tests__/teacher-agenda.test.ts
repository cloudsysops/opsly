import { describe, expect, it } from 'vitest';
import type { ClassListItem } from '@/lib/class-types';
import { filterTodayAgendaSlots, mapAgendaItemsToAgendaSlots, mapClassesToAgendaSlots } from '@/lib/teacher-agenda';

function sampleClass(overrides: Partial<ClassListItem> = {}): ClassListItem {
  return {
    id: 'class-1',
    tenant_slug: 'peskids',
    title: 'Grupo Nivel 3',
    level: 3,
    professor_user_id: 'prof-1',
    pool_id: 'pool-1',
    location: 'llanogrande',
    starts_at: '2026-05-28T14:00:00.000Z',
    ends_at: '2026-05-28T15:00:00.000Z',
    capacity: 8,
    price_cents: 8500000,
    currency: 'cop',
    status: 'scheduled',
    cancelled_reason: null,
    session_notes: null,
    series_id: null,
    created_by: null,
    created_at: '2026-05-20T10:00:00.000Z',
    updated_at: '2026-05-20T10:00:00.000Z',
    enrolled_count: 5,
    pool_name: 'Piscina A',
    ...overrides,
  };
}

describe('teacher agenda mapping', () => {
  it('maps class rows into agenda slots', () => {
    const now = new Date('2026-05-28T13:30:00.000Z');
    const slots = mapClassesToAgendaSlots([sampleClass()], now);

    expect(slots).toHaveLength(1);
    expect(slots[0]?.className).toBe('Grupo Nivel 3');
    expect(slots[0]?.classId).toBe('class-1');
    expect(slots[0]?.students).toBe(5);
    expect(slots[0]?.status).toBe('scheduled');
  });

  it('marks ongoing classes during session window', () => {
    const now = new Date('2026-05-28T14:30:00.000Z');
    const slots = mapClassesToAgendaSlots([sampleClass()], now);
    expect(slots[0]?.status).toBe('ongoing');
  });

  it('filters slots to today only', () => {
    const now = new Date('2026-05-28T13:30:00.000Z');
    const slots = mapClassesToAgendaSlots(
      [
        sampleClass(),
        sampleClass({
          id: 'class-2',
          starts_at: '2026-05-29T14:00:00.000Z',
          ends_at: '2026-05-29T15:00:00.000Z',
        }),
      ],
      now
    );

    const today = filterTodayAgendaSlots(slots, now);
    expect(today).toHaveLength(1);
    expect(today[0]?.className).toBe('Grupo Nivel 3');
  });

  it('maps agenda items into slots with class ids', () => {
    const slots = mapAgendaItemsToAgendaSlots([
      {
        id: 'enroll-1',
        class_id: 'class-9',
        title: 'Técnica',
        starts_at: '2026-05-28T14:00:00.000Z',
        ends_at: '2026-05-28T15:00:00.000Z',
        location: 'llanogrande',
        status: 'scheduled',
        enrolled_count: 3,
      },
    ]);

    expect(slots[0]?.classId).toBe('class-9');
    expect(slots[0]?.endsAt).toBe('2026-05-28T15:00:00.000Z');
  });
});
