import { logger } from '../logger';
import { getServiceClient } from '../supabase';

function setIfDefined(row: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined && value !== null) {
    row[key] = value;
  }
}

export async function lsUpsertCustomerForBooking(params: {
  tenantSlug: string;
  name: string;
  email: string;
  phone: string | null;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_customers')
    .upsert(
      {
        tenant_slug: params.tenantSlug,
        name: params.name,
        email: params.email,
        phone: params.phone,
      },
      { onConflict: 'tenant_slug,email' }
    )
    .select('id')
    .maybeSingle();

  if (error !== null) {
    logger.error('ls_upsert_customer', error);
    return { ok: false };
  }
  if (data === null) {
    return { ok: false };
  }
  return { ok: true, id: (data as { id: string }).id };
}

export async function lsInsertBookingRow(params: {
  tenantSlug: string;
  customerId: string;
  serviceId: string | null;
  scheduledAt: string | null;
  notes: string | null;
  serviceLocation?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimatedTravelTimeMinutes?: number | null;
  equipmentNeeded?: string[] | null;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const db = getServiceClient();
  const row: Record<string, unknown> = {
    tenant_slug: params.tenantSlug,
    customer_id: params.customerId,
    service_id: params.serviceId,
    scheduled_at: params.scheduledAt,
    status: 'requested',
    notes: params.notes,
  };
  setIfDefined(row, 'service_location', params.serviceLocation);
  setIfDefined(row, 'address', params.address);
  setIfDefined(row, 'latitude', params.latitude);
  setIfDefined(row, 'longitude', params.longitude);
  setIfDefined(row, 'estimated_travel_time_minutes', params.estimatedTravelTimeMinutes);
  setIfDefined(row, 'equipment_needed', params.equipmentNeeded);

  const { data, error } = await db
    .schema('platform')
    .from('ls_bookings')
    .insert(row)
    .select('id')
    .maybeSingle();

  if (error !== null) {
    logger.error('ls_insert_booking', error);
    return { ok: false };
  }
  if (data === null) {
    return { ok: false };
  }
  return { ok: true, id: (data as { id: string }).id };
}
