import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { consumeHealthTravelRevenueEvent } from './revenue/health-travel-consumer';

export const HEALTH_TRAVEL_EVENT_NAMES = [
  'health.lead.created',
  'health.consultation.scheduled',
  'health.quote.sent',
  'health.booking.started',
  'health.deposit.paid',
  'health.consultation.completed',
  'health.journey.completed',
] as const;

const primitiveDataSchema = z
  .object({
    lead_id: z.string().min(1),
    local_event_type: z.string().min(1),
    source: z.string().min(1),
    consultation_id: z.string().min(1).optional(),
    booking_id: z.string().min(1).optional(),
    package_id: z.string().min(1).optional(),
    provider_id: z.string().min(1).optional(),
    specialist_id: z.string().min(1).optional(),
    payment_id: z.string().min(1).optional(),
    trip_id: z.string().min(1).optional(),
    currency: z.string().length(3).optional(),
    amount_cents: z.number().int().nonnegative().optional(),
    status: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    utm_source: z.string().min(1).optional(),
    utm_medium: z.string().min(1).optional(),
    utm_campaign: z.string().min(1).optional(),
  })
  .strict();

export const healthTravelEventEnvelopeSchema = z
  .object({
    event_id: z.string().uuid(),
    event_type: z.enum(HEALTH_TRAVEL_EVENT_NAMES),
    tenant_id: z.string().min(1),
    occurred_at: z.string().datetime(),
    source_system: z.literal('smile-trip-care'),
    dedupe_key: z.string().min(1).optional(),
    data: primitiveDataSchema,
  })
  .strict();

export type HealthTravelEventEnvelope = z.infer<typeof healthTravelEventEnvelopeSchema>;

function extractSignatureHex(header: string): string {
  const trimmed = header.trim();
  return trimmed.toLowerCase().startsWith('sha256=')
    ? trimmed.slice('sha256='.length)
    : trimmed;
}

export function verifyHealthTravelEventSignature(params: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  secret: string;
}): boolean {
  const header = params.signatureHeader?.trim() ?? '';
  const secret = params.secret.trim();
  if (!header || !secret) return false;

  const receivedHex = extractSignatureHex(header);
  if (!/^[0-9a-f]{64}$/i.test(receivedHex)) return false;

  const expectedHex = createHmac('sha256', secret)
    .update(params.rawBody, 'utf8')
    .digest('hex');
  const expected = Buffer.from(expectedHex, 'hex');
  const received = Buffer.from(receivedHex, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function resolveEventBusUrl(): string | null {
  const raw = process.env.OPSLY_EVENT_BUS_URL?.trim() ?? '';
  if (!raw) return null;
  return raw.endsWith('/events') ? raw : `${raw.replace(/\/$/, '')}/events`;
}

async function forwardToBoard(event: HealthTravelEventEnvelope): Promise<{
  attempted: boolean;
  accepted: boolean;
  status: number | null;
}> {
  const busUrl = resolveEventBusUrl();
  if (!busUrl) return { attempted: false, accepted: false, status: null };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Health-Travel-Event': 'true',
  };
  const token = process.env.OPSLY_EVENT_BUS_TOKEN?.trim();
  if (token) headers['X-Opsly-Event-Token'] = token;

  const body = JSON.stringify({
    event_type: event.event_type,
    tenant_id: event.tenant_id,
    created_at: event.occurred_at,
    trace_id: event.event_id,
    data: {
      ...event.data,
      source_system: event.source_system,
      external_event_id: event.event_id,
      ...(event.dedupe_key ? { dedupe_key: event.dedupe_key } : {}),
    },
  });

  try {
    const response = await fetch(busUrl, {
      method: 'POST',
      headers,
      body,
    });
    return {
      attempted: true,
      accepted: response.ok,
      status: response.status,
    };
  } catch {
    return { attempted: true, accepted: false, status: null };
  }
}

/**
 * Durable Health Travel ingress.
 *
 * Acceptance boundary is Revenue Core persistence, not AI Board. AI Board is a
 * secondary best-effort consumer because health.* events may legitimately map to
 * zero automation signals.
 */
export async function handleHealthTravelEventRequest(request: Request): Promise<Response> {
  const secret = process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET?.trim() ?? '';
  if (!secret) {
    return Response.json(
      { error: 'Health Travel event ingestion is not configured' },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signatureHeader =
    request.headers.get('x-opsly-signature') ??
    request.headers.get('X-Opsly-Signature');

  if (!verifyHealthTravelEventSignature({ rawBody, signatureHeader, secret })) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = healthTravelEventEnvelopeSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid Health Travel event', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const event = parsed.data;
  const expectedTenant =
    process.env.HEALTH_TRAVEL_TENANT_ID?.trim() || 'health-travel-colombia';
  if (event.tenant_id !== expectedTenant) {
    return Response.json({ error: 'Tenant mismatch' }, { status: 403 });
  }

  let revenue;
  try {
    revenue = await consumeHealthTravelRevenueEvent({
      externalEventId: event.event_id,
      eventType: event.event_type,
      tenantSlug: event.tenant_id,
      occurredAt: event.occurred_at,
      sourceSystem: event.source_system,
      dedupeKey: event.dedupe_key,
      data: event.data,
    });
  } catch (error) {
    return Response.json(
      {
        error: 'Health Travel Revenue Core persistence failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }

  const board = await forwardToBoard(event);

  return Response.json(
    {
      accepted: true,
      event_id: event.event_id,
      event_type: event.event_type,
      revenue: {
        receipt_id: revenue.receiptId,
        duplicate: revenue.duplicate,
        status: revenue.status,
        reconciliation_required: revenue.reconciliationRequired,
      },
      board,
    },
    { status: 202 }
  );
}
