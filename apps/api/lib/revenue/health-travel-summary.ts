/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServiceClient } from '../supabase/client';

const DEFAULT_WINDOW_DAYS = 30;
const MAX_EVENT_ROWS = 5000;
const RECENT_ACTIVITY_HOURS = 24;
const PROBE_TIMEOUT_MS = 2500;

export type HealthTravelConnectivity =
  | 'healthy'
  | 'unavailable'
  | 'not_configured';

export type HealthTravelActivity = 'recent' | 'quiet' | 'never_seen';

export type HealthTravelRuntimeSummary = Readonly<{
  tenant_slug: string;
  tenant_configured: boolean;
  generated_at: string;
  connectivity: {
    status: HealthTravelConnectivity;
    url_configured: boolean;
    checked_at: string;
    http_status: number | null;
    latency_ms: number | null;
  };
  activity: {
    status: HealthTravelActivity;
    last_event_at: string | null;
    last_event_type: string | null;
    hours_since_last_event: number | null;
  };
  window_days: number;
  counts: {
    leads: number;
    consultations_scheduled: number;
    consultations_completed: number;
    quotes_sent: number;
    bookings_started: number;
    deposits_paid: number;
    journeys_completed: number;
    reconciliation_required: number;
  };
}>;

type ReceiptRow = {
  event_type: string;
  processing_status: string;
  occurred_at: string;
};

function clampWindowDays(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_WINDOW_DAYS;
  return Math.max(1, Math.min(Math.floor(value), 90));
}

export function summarizeHealthTravelReceipts(
  rows: readonly ReceiptRow[],
  now = new Date()
): Pick<HealthTravelRuntimeSummary, 'activity' | 'counts'> {
  const sorted = [...rows].sort(
    (a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)
  );
  const last = sorted[0] ?? null;
  const hoursSince =
    last === null
      ? null
      : Math.max(0, (now.getTime() - Date.parse(last.occurred_at)) / 3_600_000);

  const counts = {
    leads: 0,
    consultations_scheduled: 0,
    consultations_completed: 0,
    quotes_sent: 0,
    bookings_started: 0,
    deposits_paid: 0,
    journeys_completed: 0,
    reconciliation_required: 0,
  };

  for (const row of rows) {
    switch (row.event_type) {
      case 'health.lead.created':
        counts.leads += 1;
        break;
      case 'health.consultation.scheduled':
        counts.consultations_scheduled += 1;
        break;
      case 'health.consultation.completed':
        counts.consultations_completed += 1;
        break;
      case 'health.quote.sent':
        counts.quotes_sent += 1;
        break;
      case 'health.booking.started':
        counts.bookings_started += 1;
        break;
      case 'health.deposit.paid':
        counts.deposits_paid += 1;
        break;
      case 'health.journey.completed':
        counts.journeys_completed += 1;
        break;
    }
    if (row.processing_status === 'reconciliation_required') {
      counts.reconciliation_required += 1;
    }
  }

  return {
    activity: {
      status:
        last === null ? 'never_seen' : (hoursSince ?? Infinity) <= RECENT_ACTIVITY_HOURS ? 'recent' : 'quiet',
      last_event_at: last?.occurred_at ?? null,
      last_event_type: last?.event_type ?? null,
      hours_since_last_event: hoursSince,
    },
    counts,
  };
}

async function probeRuntime(): Promise<HealthTravelRuntimeSummary['connectivity']> {
  const url = process.env.HEALTH_TRAVEL_RUNTIME_HEALTH_URL?.trim() ?? '';
  const checkedAt = new Date().toISOString();
  if (!url) {
    return {
      status: 'not_configured',
      url_configured: false,
      checked_at: checkedAt,
      http_status: null,
      latency_ms: null,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return {
      status: response.ok ? 'healthy' : 'unavailable',
      url_configured: true,
      checked_at: checkedAt,
      http_status: response.status,
      latency_ms: Date.now() - started,
    };
  } catch {
    return {
      status: 'unavailable',
      url_configured: true,
      checked_at: checkedAt,
      http_status: null,
      latency_ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getHealthTravelRuntimeSummary(params?: {
  tenantSlug?: string;
  windowDays?: number;
}): Promise<HealthTravelRuntimeSummary> {
  const tenantSlug = params?.tenantSlug?.trim() || 'health-travel-colombia';
  const windowDays = clampWindowDays(params?.windowDays ?? DEFAULT_WINDOW_DAYS);
  const platform = getServiceClient().schema('platform') as any;

  const tenantResult = await platform
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .is('deleted_at', null)
    .maybeSingle();

  if (tenantResult.error) {
    throw new Error(`Health Travel tenant lookup failed: ${tenantResult.error.message}`);
  }

  const connectivityPromise = probeRuntime();

  if (!tenantResult.data?.id) {
    const connectivity = await connectivityPromise;
    const empty = summarizeHealthTravelReceipts([]);
    return {
      tenant_slug: tenantSlug,
      tenant_configured: false,
      generated_at: new Date().toISOString(),
      connectivity,
      activity: empty.activity,
      window_days: windowDays,
      counts: empty.counts,
    };
  }

  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
  const receiptResult = await platform
    .from('revenue_event_receipts')
    .select('event_type, processing_status, occurred_at')
    .eq('tenant_id', tenantResult.data.id)
    .eq('source_system', 'smile-trip-care')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(MAX_EVENT_ROWS);

  if (receiptResult.error) {
    throw new Error(`Health Travel receipt summary failed: ${receiptResult.error.message}`);
  }

  const [connectivity, summary] = await Promise.all([
    connectivityPromise,
    Promise.resolve(
      summarizeHealthTravelReceipts((receiptResult.data ?? []) as ReceiptRow[])
    ),
  ]);

  return {
    tenant_slug: tenantSlug,
    tenant_configured: true,
    generated_at: new Date().toISOString(),
    connectivity,
    activity: summary.activity,
    window_days: windowDays,
    counts: summary.counts,
  };
}
