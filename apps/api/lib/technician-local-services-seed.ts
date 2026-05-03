import {
  CLOUDSYSOPS_TECHNICIAN_METADATA,
  isTechnicianTenantMetadata,
} from './technician-tenant-profile';
import { getServiceClient } from './supabase';
import { logger } from './logger';
import type { Json } from './supabase/types';

function dayNumberFromLabel(label: string): number | null {
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[label] ?? null;
}

export async function seedTechnicianLocalServicesForSlug(params: {
  tenantSlug: string;
  metadata: Json;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTechnicianTenantMetadata(params.metadata)) {
    return { ok: false, error: 'tenant_not_technician_profile' };
  }

  const db = getServiceClient();
  const { technician } = CLOUDSYSOPS_TECHNICIAN_METADATA;

  const externalKeys = technician.services.map((s) => s.external_key);
  const { error: delErr } = await db
    .schema('platform')
    .from('ls_services')
    .delete()
    .eq('tenant_slug', params.tenantSlug)
    .in('external_key', externalKeys);
  if (delErr !== null) {
    logger.error('technician_seed_service_delete', { slug: params.tenantSlug, error: delErr });
    return { ok: false, error: 'service_seed_delete_failed' };
  }

  const { error: insErr } = await db
    .schema('platform')
    .from('ls_services')
    .insert(
      technician.services.map((svc) => ({
        tenant_slug: params.tenantSlug,
        name: svc.name,
        description: svc.description,
        active: true,
        external_key: svc.external_key,
        duration_minutes: svc.duration_minutes,
        price_cents: svc.price_cents,
      }))
    );
  if (insErr !== null) {
    logger.error('technician_seed_service_insert', { slug: params.tenantSlug, error: insErr });
    return { ok: false, error: 'service_insert_failed' };
  }

  const scheduleRows: Array<{
    tenant_slug: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }> = [];

  for (const label of technician.availability.weekdays.days) {
    const d = dayNumberFromLabel(label);
    if (d === null) {
      continue;
    }
    scheduleRows.push({
      tenant_slug: params.tenantSlug,
      day_of_week: d,
      start_time: `${technician.availability.weekdays.start}:00`,
      end_time: `${technician.availability.weekdays.end}:00`,
      is_available: true,
    });
  }
  for (const label of technician.availability.weekends.days) {
    const d = dayNumberFromLabel(label);
    if (d === null) {
      continue;
    }
    scheduleRows.push({
      tenant_slug: params.tenantSlug,
      day_of_week: d,
      start_time: `${technician.availability.weekends.start}:00`,
      end_time: `${technician.availability.weekends.end}:00`,
      is_available: true,
    });
  }

  if (scheduleRows.length > 0) {
    const { error: schedErr } = await db
      .schema('platform')
      .from('ls_technician_schedules')
      .upsert(scheduleRows, { onConflict: 'tenant_slug,day_of_week' });
    if (schedErr !== null) {
      logger.error('technician_seed_schedules', { slug: params.tenantSlug, error: schedErr });
      return { ok: false, error: 'schedule_upsert_failed' };
    }
  }

  return { ok: true };
}
