import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const HEALTH_TRAVEL_EVENT_NAMES = [
  'health.lead.created',
  'health.consultation.scheduled',
  'health.quote.sent',
  'health.booking.started',
  'health.deposit.paid',
  'health.consultation.completed',
  'health.journey.completed',
] as const;

const primitiveDataSchema = z.object({
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
}).strict();

export const healthTravelEventEnvelopeSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.enum(HEALTH_TRAVEL_EVENT_NAMES),
  tenant_id: z.string().min(1),
  occurred_at: z.string().datetime(),
  source_system: z.literal('smile-trip-care'),
  dedupe_key: z.string().min(1).optional(),
  data: primitiveDataSchema,
}).strict();

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

export async function handleHealthTravelEventRequest(request: Request): Promise<Response> {
  const secret = process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET?.trim() ?? '';
  if (!secret) {
    return Response.json(
      { error: 'Health Travel event ingestion is not configured' },
      { status: 503 },
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
      { status: 400 },
    );
  }

  const expectedTenant =
    process.env.HEALTH_TRAVEL_TENANT_ID?.trim() || 'health-travel-colombia';
  if (parsed.data.tenant_id !== expectedTenant) {
    return Response.json({ error: 'Tenant mismatch' }, { status: 403 });
  }

  const busUrl = resolveEventBusUrl();
  if (!busUrl) {
    return Response.json({ error: 'Opsly event bus is not configured' }, { status: 503 });
  }

  const busEnvelope = {
    event_type: parsed.data.event_type,
    tenant_id: parsed.data.tenant_id,
    created_at: parsed.data.occurred_at,
    trace_id: parsed.data.event_id,
    data: {
      ...parsed.data.data,
      source_system: parsed.data.source_system,
      external_event_id: parsed.data.event_id,
      ...(parsed.data.dedupe_key ? { dedupe_key: parsed.data.dedupe_key } : {}),
    },
  };

  let upstream: Response;
  try {
    upstream = await fetch(busUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Health-Travel-Event': 'true',
      },
      body: JSON.stringify(busEnvelope),
    });
  } catch {
    return Response.json({ error: 'Opsly event bus unavailable' }, { status: 502 });
  }

  if (!upstream.ok) {
    return Response.json(
      { error: 'Opsly event bus rejected event', upstream_status: upstream.status },
      { status: 502 },
    );
  }

  return Response.json(
    {
      accepted: true,
      event_id: parsed.data.event_id,
      event_type: parsed.data.event_type,
    },
    { status: 202 },
  );
}
