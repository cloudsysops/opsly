import { getServiceClient } from './supabase';
import { logger } from './logger';

export type TechnicianSlot = { time: string; available: boolean };

function parseTimeToMinutes(t: string): number {
  const parts = t.split(':');
  const h = Number.parseInt(parts[0] ?? '0', 10);
  const m = Number.parseInt(parts[1] ?? '0', 10);
  return h * 60 + m;
}

function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function computeTechnicianSlots(params: {
  tenantSlug: string;
  dateOnly: string;
  dayOfWeek: number;
  slotStepMinutes: number;
  serviceDurationMinutes: number;
}): Promise<TechnicianSlot[]> {
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
    return [];
  }
  if (sched === null) {
    return [];
  }

  const startRaw = String((sched as { start_time: string }).start_time);
  const endRaw = String((sched as { end_time: string }).end_time);
  const startM = parseTimeToMinutes(startRaw.slice(0, 5));
  const endM = parseTimeToMinutes(endRaw.slice(0, 5));

  const dayStart = `${params.dateOnly}T00:00:00.000Z`;
  const dayEnd = `${params.dateOnly}T23:59:59.999Z`;

  const { data: bookings, error: bErr } = await db
    .schema('platform')
    .from('ls_bookings')
    .select('scheduled_at')
    .eq('tenant_slug', params.tenantSlug)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .in('status', ['requested', 'confirmed']);

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
    const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
    busy.push({
      start: mins,
      end: mins + params.serviceDurationMinutes,
    });
  }

  const slots: TechnicianSlot[] = [];
  for (let t = startM; t + params.serviceDurationMinutes <= endM; t += params.slotStepMinutes) {
    const slotEnd = t + params.serviceDurationMinutes;
    const overlaps = busy.some((b) => !(slotEnd <= b.start || t >= b.end));
    slots.push({ time: minutesToHHMM(t), available: !overlaps });
  }
  return slots;
}
