# Health Travel staging golden-path smoke

This smoke sends **synthetic commercial coordination events only** to the signed
Health Travel ingress. It contains no patient PII or clinical records.

## Required environment

```bash
export HEALTH_TRAVEL_INGRESS_URL="https://api-staging.example.com/api/integrations/health-travel/events"
export HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET="..."
```

Optional:

```bash
export HEALTH_TRAVEL_TENANT_ID="health-travel-colombia"
export HT_SMOKE_PROVIDER_ID="<SmileTripCare provider id>"
export HT_SMOKE_PACKAGE_ID="<SmileTripCare package id>"
export HT_SMOKE_REQUIRE_RESOLVED_CATALOG=true
```

## Run

```bash
npm run smoke:health-travel:staging
```

Expected canonical path:

```text
health.lead.created
-> health.consultation.scheduled
-> health.consultation.completed
-> health.quote.sent
-> health.booking.started
-> health.deposit.paid
-> health.journey.completed
```

Every step must return HTTP 202 and a durable Revenue Core `receipt_id`.

With `HT_SMOKE_REQUIRE_RESOLVED_CATALOG=true`, any unresolved provider/offer
mapping also fails the smoke. This mode should be used after catalog sync.
