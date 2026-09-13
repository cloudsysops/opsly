---
status: draft
owner: operations
last_review: 2026-09-12
type: tenant
tags:
  - opsly/tenant
  - health-travel
  - integration
---

# Health & Travel Colombia — Runtime Event Contract

## Decision

`cloudsysops/smile-trip-care` is the existing independently deployable Health Travel runtime.
Opsly remains the control plane. We do not copy SmileTripCare tables into Opsly and we do not
create a second Health Travel application inside the monorepo.

Runtime boundary:

```text
SmileTripCare
  -> signed commercial event
  -> POST /api/integrations/health-travel/events
  -> Opsly internal event bus
  -> Revenue Core / Mission Control / agents / analytics
```

## Security boundary

- HMAC-SHA256 over the exact raw request body.
- Header: `X-Opsly-Signature: sha256=<hex>`.
- Secret: `HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET` in Opsly and
  `OPSLY_HEALTH_EVENTS_SECRET` in SmileTripCare.
- Expected tenant: `HEALTH_TRAVEL_TENANT_ID`, default
  `health-travel-colombia`.
- Unknown fields are rejected.
- PII and clinical fields do not cross this interface.

Explicitly forbidden in this contract:
- names, email addresses, phone numbers;
- diagnosis or medical history;
- clinical notes;
- prescriptions;
- lab/imaging results;
- patient photos/documents.

Opsly receives stable IDs and commercial/travel coordination facts only.

## Envelope v1

```json
{
  "event_id": "uuid",
  "event_type": "health.deposit.paid",
  "tenant_id": "health-travel-colombia",
  "occurred_at": "2026-09-12T12:00:00.000Z",
  "source_system": "smile-trip-care",
  "dedupe_key": "optional-stable-source-action-id",
  "data": {
    "lead_id": "source-lead-id",
    "local_event_type": "deposit_paid",
    "source": "stripe",
    "payment_id": "source-payment-id",
    "amount_cents": 25000,
    "currency": "USD"
  }
}
```

## Phase-1 mapping

| SmileTripCare event | Opsly canonical event |
|---|---|
| `lead_created` | `health.lead.created` |
| `consultation_booked` | `health.consultation.scheduled` |
| `quote_sent` | `health.quote.sent` |
| `booking_started` | `health.booking.started` |
| `deposit_paid` | `health.deposit.paid` |
| `consultation_completed` | `health.consultation.completed` |
| `treatment_completed` | `health.journey.completed` |

The initial producer is best-effort and feature-off until URL + secret are configured.
SmileTripCare business writes remain authoritative and must succeed when Opsly is unavailable.

## Domain ownership

SmileTripCare owns:
- leads and patient-facing funnel;
- providers/specialists/packages;
- consultations/cases;
- bookings;
- travel journey UI;
- payment execution and Stripe state.

Opsly owns:
- control plane and orchestration;
- Revenue Core attribution/referral/commission ledger;
- cross-tenant Mission Control;
- agent policies and approvals;
- aggregate operational intelligence.

## Next hardening

1. Add a durable outbox + retry/dead-letter path in SmileTripCare.
2. Make Opsly consumers idempotent by `event_id` / `dedupe_key`.
3. Map provider/package IDs to `revenue_partners` / `revenue_offers` after Revenue Core lands.
4. Add Mission Control Health Travel cards from canonical events.
5. Add provider matching and travel-confirmed events only when their source transitions are
   authoritative in SmileTripCare.
