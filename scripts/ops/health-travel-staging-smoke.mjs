#!/usr/bin/env node
import { createHmac, randomUUID } from 'node:crypto';

const ingressUrl = process.env.HEALTH_TRAVEL_INGRESS_URL?.trim();
const secret = process.env.HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET?.trim();
const tenantId = process.env.HEALTH_TRAVEL_TENANT_ID?.trim();
const providerId =
  process.env.HT_SMOKE_PROVIDER_ID?.trim() || '11111111-1111-4111-8111-111111111111';
const packageId =
  process.env.HT_SMOKE_PACKAGE_ID?.trim() || '22222222-2222-4222-8222-222222222222';
const requireResolvedCatalog =
  process.env.HT_SMOKE_REQUIRE_RESOLVED_CATALOG === 'true';

if (!ingressUrl || !secret || !tenantId) {
  console.error(
    'Missing HEALTH_TRAVEL_INGRESS_URL, HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET, or HEALTH_TRAVEL_TENANT_ID'
  );
  process.exit(2);
}

const runId = randomUUID();
const leadId = `smoke-lead-${runId}`;
const consultationId = `smoke-consultation-${runId}`;
const bookingId = `smoke-booking-${runId}`;
const paymentId = `smoke-payment-${runId}`;

const sequence = [
  {
    event_type: 'health.lead.created',
    local_event_type: 'lead_created',
    data: {
      source: 'opsly-staging-smoke',
      utm_source: 'synthetic',
      utm_medium: 'integration',
      utm_campaign: 'health-travel-golden-path',
    },
  },
  {
    event_type: 'health.consultation.scheduled',
    local_event_type: 'consultation_booked',
    data: {
      source: 'opsly-staging-smoke',
      consultation_id: consultationId,
      provider_id: providerId,
      package_id: packageId,
      status: 'scheduled',
    },
  },
  {
    event_type: 'health.consultation.completed',
    local_event_type: 'consultation_completed',
    data: {
      source: 'opsly-staging-smoke',
      consultation_id: consultationId,
      provider_id: providerId,
      package_id: packageId,
      status: 'completed',
    },
  },
  {
    event_type: 'health.quote.sent',
    local_event_type: 'quote_sent',
    data: {
      source: 'opsly-staging-smoke',
      provider_id: providerId,
      package_id: packageId,
      status: 'sent',
    },
  },
  {
    event_type: 'health.booking.started',
    local_event_type: 'booking_started',
    data: {
      source: 'opsly-staging-smoke',
      booking_id: bookingId,
      provider_id: providerId,
      package_id: packageId,
      status: 'draft',
    },
  },
  {
    event_type: 'health.deposit.paid',
    local_event_type: 'deposit_paid',
    data: {
      source: 'opsly-staging-smoke',
      booking_id: bookingId,
      payment_id: paymentId,
      provider_id: providerId,
      package_id: packageId,
      amount_cents: 50000,
      currency: 'USD',
      status: 'succeeded',
    },
  },
  {
    event_type: 'health.journey.completed',
    local_event_type: 'treatment_completed',
    data: {
      source: 'opsly-staging-smoke',
      booking_id: bookingId,
      provider_id: providerId,
      package_id: packageId,
      status: 'completed',
    },
  },
];

function sign(rawBody) {
  return `sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;
}

async function send(step, index) {
  const eventId = randomUUID();
  const envelope = {
    event_id: eventId,
    event_type: step.event_type,
    tenant_id: tenantId,
    occurred_at: new Date(Date.now() + index * 1000).toISOString(),
    source_system: 'smile-trip-care',
    dedupe_key: `staging-smoke:${runId}:${step.local_event_type}`,
    data: {
      lead_id: leadId,
      local_event_type: step.local_event_type,
      ...step.data,
    },
  };

  const rawBody = JSON.stringify(envelope);
  const response = await fetch(ingressUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Opsly-Signature': sign(rawBody),
    },
    body: rawBody,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status !== 202 || body?.accepted !== true) {
    throw new Error(
      `${step.event_type} failed: HTTP ${response.status} ${JSON.stringify(body)}`
    );
  }

  if (!body?.revenue?.receipt_id) {
    throw new Error(`${step.event_type} returned no durable Revenue receipt`);
  }

  if (
    requireResolvedCatalog &&
    Array.isArray(body.revenue.reconciliation_required) &&
    body.revenue.reconciliation_required.length > 0
  ) {
    throw new Error(
      `${step.event_type} requires reconciliation: ${body.revenue.reconciliation_required.join(', ')}`
    );
  }

  console.log(
    JSON.stringify({
      step: index + 1,
      event_type: step.event_type,
      receipt_id: body.revenue.receipt_id,
      duplicate: body.revenue.duplicate,
      revenue_status: body.revenue.status,
      reconciliation_required: body.revenue.reconciliation_required ?? [],
      board: body.board ?? null,
    })
  );
}

console.log(
  JSON.stringify({
    smoke: 'health-travel-golden-path',
    tenant_id: tenantId,
    run_id: runId,
    lead_id: leadId,
    provider_id: providerId,
    package_id: packageId,
    synthetic_only: true,
  })
);

for (let index = 0; index < sequence.length; index += 1) {
  await send(sequence[index], index);
}

console.log(
  JSON.stringify({
    ok: true,
    smoke: 'health-travel-golden-path',
    events_sent: sequence.length,
    run_id: runId,
  })
);
