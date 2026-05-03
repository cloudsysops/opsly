import { getTenantContext } from '../tenant-context';
import { getServiceClient } from '../supabase';
import { logger } from '../logger';
import { lsInsertBookingRow, lsUpsertCustomerForBooking } from './local-services-booking-insert';

export type LsServiceRow = {
  id: string;
  tenant_slug: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
};

export type LsCustomerRow = {
  id: string;
  tenant_slug: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export type LsBookingRow = {
  id: string;
  tenant_slug: string;
  customer_id: string | null;
  service_id: string | null;
  scheduled_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type LsQuoteRow = {
  id: string;
  tenant_slug: string;
  customer_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  valid_until: string | null;
  created_at: string;
};

export type LsReportRow = {
  id: string;
  tenant_slug: string;
  title: string;
  body: Record<string, unknown>;
  created_at: string;
};

function tenantSlug(): string {
  return getTenantContext().tenantSlug;
}

export async function lsListServices(): Promise<LsServiceRow[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_services')
    .select('id, tenant_slug, name, description, active, created_at')
    .eq('tenant_slug', tenantSlug())
    .order('created_at', { ascending: false });

  if (error !== null) {
    logger.error('ls_list_services', error);
    return [];
  }
  return (data ?? []) as LsServiceRow[];
}

export async function lsListCustomers(): Promise<LsCustomerRow[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_customers')
    .select('id, tenant_slug, name, email, phone, created_at')
    .eq('tenant_slug', tenantSlug())
    .order('created_at', { ascending: false });

  if (error !== null) {
    logger.error('ls_list_customers', error);
    return [];
  }
  return (data ?? []) as LsCustomerRow[];
}

export async function lsListBookings(): Promise<LsBookingRow[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_bookings')
    .select('id, tenant_slug, customer_id, service_id, scheduled_at, status, notes, created_at')
    .eq('tenant_slug', tenantSlug())
    .order('created_at', { ascending: false });

  if (error !== null) {
    logger.error('ls_list_bookings', error);
    return [];
  }
  return (data ?? []) as LsBookingRow[];
}

export async function lsListQuotes(): Promise<LsQuoteRow[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_quotes')
    .select('id, tenant_slug, customer_id, amount_cents, currency, status, valid_until, created_at')
    .eq('tenant_slug', tenantSlug())
    .order('created_at', { ascending: false });

  if (error !== null) {
    logger.error('ls_list_quotes', error);
    return [];
  }
  return (data ?? []) as LsQuoteRow[];
}

export async function lsListReports(): Promise<LsReportRow[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_reports')
    .select('id, tenant_slug, title, body, created_at')
    .eq('tenant_slug', tenantSlug())
    .order('created_at', { ascending: false });

  if (error !== null) {
    logger.error('ls_list_reports', error);
    return [];
  }
  return (data ?? []) as LsReportRow[];
}

export async function lsResolveServiceIdByExternalKey(params: {
  tenantSlug: string;
  externalKey: string;
}): Promise<string | null> {
  const row = await lsGetServiceByExternalKey(params);
  return row?.id ?? null;
}

export async function lsGetServiceByExternalKey(params: {
  tenantSlug: string;
  externalKey: string;
}): Promise<{ id: string; duration_minutes: number | null } | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_services')
    .select('id, duration_minutes')
    .eq('tenant_slug', params.tenantSlug)
    .eq('external_key', params.externalKey)
    .maybeSingle();

  if (error !== null) {
    logger.error('ls_resolve_service_external', error);
    return null;
  }
  if (data === null) {
    return null;
  }
  return data as { id: string; duration_minutes: number | null };
}

export async function lsInsertBookingForTenantSlug(params: {
  tenantSlug: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceId?: string | null;
  scheduledAt?: string | null;
  notes?: string | null;
  serviceLocation?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimatedTravelTimeMinutes?: number | null;
  equipmentNeeded?: string[] | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const emailNorm = params.customerEmail.trim().toLowerCase();
  const cust = await lsUpsertCustomerForBooking({
    tenantSlug: params.tenantSlug,
    name: params.customerName.trim(),
    email: emailNorm,
    phone: params.customerPhone?.trim() ?? null,
  });
  if (!cust.ok) {
    return { ok: false, error: 'customer_upsert_failed' };
  }

  const booking = await lsInsertBookingRow({
    tenantSlug: params.tenantSlug,
    customerId: cust.id,
    serviceId: params.serviceId ?? null,
    scheduledAt: params.scheduledAt ?? null,
    notes: params.notes?.trim() ?? null,
    serviceLocation: params.serviceLocation ?? null,
    address: params.address ?? null,
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    estimatedTravelTimeMinutes: params.estimatedTravelTimeMinutes ?? null,
    equipmentNeeded: params.equipmentNeeded ?? null,
  });
  if (!booking.ok) {
    return { ok: false, error: 'booking_insert_failed' };
  }
  return { ok: true, id: booking.id };
}

export async function lsGetBookingByIdForTenantSlug(params: {
  tenantSlug: string;
  bookingId: string;
}): Promise<LsBookingRow | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_bookings')
    .select(
      'id, tenant_slug, customer_id, service_id, scheduled_at, status, notes, created_at, address, service_location'
    )
    .eq('tenant_slug', params.tenantSlug)
    .eq('id', params.bookingId)
    .maybeSingle();

  if (error !== null) {
    logger.error('ls_get_booking_by_id', error);
    return null;
  }
  if (data === null) {
    return null;
  }
  return data as LsBookingRow;
}

export async function lsSetBookingStatusForTenantSlug(params: {
  tenantSlug: string;
  bookingId: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  completedAtIso?: string | null;
}): Promise<{ ok: true } | { ok: false }> {
  const db = getServiceClient();
  const patch: Record<string, unknown> = { status: params.status };
  if (params.status === 'completed') {
    patch.completed_at = params.completedAtIso ?? new Date().toISOString();
  }
  const { data, error } = await db
    .schema('platform')
    .from('ls_bookings')
    .update(patch)
    .eq('tenant_slug', params.tenantSlug)
    .eq('id', params.bookingId)
    .select('id')
    .maybeSingle();

  if (error !== null) {
    logger.error('ls_set_booking_status', error);
    return { ok: false };
  }
  if (data === null) {
    return { ok: false };
  }
  return { ok: true };
}

export async function lsInsertReportForTenantSlug(params: {
  tenantSlug: string;
  title: string;
  body: Record<string, unknown>;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_reports')
    .insert({
      tenant_slug: params.tenantSlug,
      title: params.title,
      body: params.body,
    })
    .select('id')
    .maybeSingle();

  if (error !== null) {
    logger.error('ls_insert_report_webhook', error);
    return { ok: false };
  }
  if (data === null) {
    return { ok: false };
  }
  return { ok: true, id: (data as { id: string }).id };
}

export type LsTechnicianServiceReportInput = {
  bookingId: string;
  tenantSlug: string;
  findings?: string | null;
  actionsTaken?: string | null;
  metricsBefore?: Record<string, unknown> | null;
  metricsAfter?: Record<string, unknown> | null;
  recommendations?: string | null;
  equipmentUsed?: string[] | null;
  timeSpentMinutes?: number | null;
  travelDistanceMiles?: number | null;
  customerSatisfaction?: number | null;
  upsellOffered?: string | null;
  nextMaintenanceDate?: string | null;
  pdfUrl?: string | null;
};

export async function lsInsertTechnicianServiceReport(
  params: LsTechnicianServiceReportInput
): Promise<{ ok: true; id: string } | { ok: false }> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_technician_service_reports')
    .insert({
      booking_id: params.bookingId,
      tenant_slug: params.tenantSlug,
      findings: params.findings ?? null,
      actions_taken: params.actionsTaken ?? null,
      metrics_before: params.metricsBefore ?? null,
      metrics_after: params.metricsAfter ?? null,
      recommendations: params.recommendations ?? null,
      equipment_used: params.equipmentUsed ?? null,
      time_spent_minutes: params.timeSpentMinutes ?? null,
      travel_distance_miles: params.travelDistanceMiles ?? null,
      customer_satisfaction: params.customerSatisfaction ?? null,
      upsell_offered: params.upsellOffered ?? null,
      next_maintenance_date: params.nextMaintenanceDate ?? null,
      pdf_url: params.pdfUrl ?? null,
    })
    .select('id')
    .maybeSingle();

  if (error !== null) {
    logger.error('ls_insert_technician_service_report', error);
    return { ok: false };
  }
  if (data === null) {
    return { ok: false };
  }
  return { ok: true, id: (data as { id: string }).id };
}
