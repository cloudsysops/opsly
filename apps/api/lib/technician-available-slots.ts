import { TECHNICIAN_SLOT_GRID, TIME_PARSING } from './constants';
import { getServiceClient } from './supabase';
import { logger } from './logger';

export type TechnicianSlot = { time: string; available: boolean };

const MPH = TIME_PARSING.MINUTES_PER_HOUR;
const HHMM_LEN = TIME_PARSING.HHMM_PREFIX_LEN;
const PAD = TIME_PARSING.TIME_COMPONENT_PAD;

function parseTimeToMinutes(t: string): number {
  const parts = t.split(':');
  const h = Number.parseInt(parts[0] ?? '0', 10);
  const m = Number.parseInt(parts[1] ?? '0', 10);
  return h * MPH + m;
}

function minutesToHHMM(total: number): string {
  const h = Math.floor(total / MPH);
  const m = total % MPH;
  return `${String(h).padStart(PAD, '0')}:${String(m).padStart(PAD, '0')}`;
}

type ScheduleRow = { start_time: string; end_time: string };

async function loadTechnicianScheduleForDay(params: {
  tenantSlug: string;
  dayOfWeek: number;
}): Promise<ScheduleRow | null> {
  const db = getServiceClient();
  const { data: sched, error: sErr } = await db
    .schema('platform')
    .from('ls_technician_schedules')
    .select('start_time, end_time, is_available')
    .eq('tenant_slug', params.tenantSlug)
    .eq('day_of_week', params.dayOfWeek)
    .eq('is_available', true)
    .maybeSingle();

  if (sErr !== null) {
    logger.error('technician_slots_schedule', { error: sErr, slug: params.tenantSlug });
    return null;
  }
  if (sched === null) {
    return null;
  }
  return sched as ScheduleRow;
}

async function loadBusyIntervalsUtc(params: {
  tenantSlug: string;
  dateOnly: string;
  serviceDurationMinutes: number;
}): Promise<Array<{ start: number; end: number }>> {
  const db = getServiceClient();
  const dayStart = `${params.dateOnly}T00:00:00.000Z`;
  const dayEnd = `${params.dateOnly}T23:59:59.999Z`;

  const { data: bookings, error: bErr } = await db
    .schema('platform')
    .from('ls_bookings')
    .select('scheduled_at')
    .eq('tenant_slug', params.tenantSlug)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .in('status', [...TECHNICIAN_SLOT_GRID.BUSY_STATUSES]);

  if (bErr !== null) {
    logger.error('technician_slots_bookings', { error: bErr, slug: params.tenantSlug });
    return [];
  }

  const busy: Array<{ start: number; end: number }> = [];
  for (const row of bookings ?? []) {
    const at = (row as { scheduled_at: string | null }).scheduled_at;
    if (at === null || at === '') {
      continue;
    }
    const d = new Date(at);
    const mins = d.getUTCHours() * MPH + d.getUTCMinutes();
    busy.push({
      start: mins,
      end: mins + params.serviceDurationMinutes,
    });
  }
  return busy;
}

function buildSlotGrid(params: {
  startM: number;
  endM: number;
  slotStepMinutes: number;
  serviceDurationMinutes: number;
  busy: Array<{ start: number; end: number }>;
}): TechnicianSlot[] {
  const slots: TechnicianSlot[] = [];
  for (
    let t = params.startM;
    t + params.serviceDurationMinutes <= params.endM;
    t += params.slotStepMinutes
  ) {
    const slotEnd = t + params.serviceDurationMinutes;
    const overlaps = params.busy.some((b) => !(slotEnd <= b.start || t >= b.end));
    slots.push({ time: minutesToHHMM(t), available: !overlaps });
  }
  return slots;
}

export async function computeTechnicianSlots(params: {
  tenantSlug: string;
  dateOnly: string;
  dayOfWeek: number;
  slotStepMinutes: number;
  serviceDurationMinutes: number;
}): Promise<TechnicianSlot[]> {
  const sched = await loadTechnicianScheduleForDay({
    tenantSlug: params.tenantSlug,
    dayOfWeek: params.dayOfWeek,
  });
  if (sched === null) {
    return [];
  }

  const startRaw = String(sched.start_time);
  const endRaw = String(sched.end_time);
  const startM = parseTimeToMinutes(startRaw.slice(0, HHMM_LEN));
  const endM = parseTimeToMinutes(endRaw.slice(0, HHMM_LEN));

  const busy = await loadBusyIntervalsUtc({
    tenantSlug: params.tenantSlug,
    dateOnly: params.dateOnly,
    serviceDurationMinutes: params.serviceDurationMinutes,
  });

  return buildSlotGrid({
    startM,
    endM,
    slotStepMinutes: params.slotStepMinutes,
    serviceDurationMinutes: params.serviceDurationMinutes,
    busy,
  });
}
