# Health & Travel Colombia — runtime integration

## Canonical ownership

- **SmileTripCare** owns the patient-facing Health Travel runtime and its operational database.
- **Opsly** owns the control plane, Revenue Core, attribution/commission ledger, agents and Moon.
- No clinical records are mirrored into Opsly.

## End-to-end path

```text
SmileTripCare authoritative transition
  -> local lead_events
  -> durable opsly_event_outbox
  -> HMAC-SHA256 POST
  -> Opsly /api/integrations/health-travel/events
  -> strict no-PII/no-clinical schema
  -> Revenue Core receipt (idempotency boundary)
  -> attribution/referral/commission reconciliation
  -> best-effort AI Board forwarding
  -> Opsly Moon Health Travel summary
```

The event is considered accepted when Revenue Core persistence succeeds. AI Board is secondary:
a valid `health.*` event may intentionally create zero AI signals/jobs.

## Canonical events

- `health.lead.created`
- `health.consultation.scheduled`
- `health.quote.sent`
- `health.booking.started`
- `health.deposit.paid`
- `health.consultation.completed`
- `health.journey.completed`

## Data boundary

Allowed: stable entity IDs, commercial/travel status, currency/amount, source/UTM refs.

Forbidden: names, emails, phones, diagnosis, medical history, prescriptions, clinical notes,
labs, imaging, patient photos/documents.

## Reliability

SmileTripCare outbox provides durable retry/dead-letter handling. Opsly Revenue Core enforces
idempotency with `(tenant_id, source_system, external_event_id)`.

Revenue Core never invents provider/offer refs. Missing mappings become
`reconciliation_required`.

No payment execution or payout occurs in this integration.
