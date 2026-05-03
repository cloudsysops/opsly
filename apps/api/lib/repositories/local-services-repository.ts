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

export async function lsInsertBookingForTenantSlug(params: {
  tenantSlug: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceId?: string | null;
  scheduledAt?: string | null;
  notes?: string | null;
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
    .select('id, tenant_slug, customer_id, service_id, scheduled_at, status, notes, created_at')
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
}): Promise<{ ok: true } | { ok: false }> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('ls_bookings')
    .update({ status: params.status })
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
