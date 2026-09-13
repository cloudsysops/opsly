# Health Travel staging golden-path smoke

This smoke sends **synthetic commercial coordination events only** to the signed
Health Travel ingress. It contains no patient PII or clinical records.

## Required environment

```bash
export HEALTH_TRAVEL_INGRESS_URL="https://api-staging.example.com/api/integrations/health-travel/events"
export HEALTH_TRAVEL_EVENT_WEBHOOK_SECRET="..."
export HEALTH_TRAVEL_TENANT_ID="medical-tourism-demo"
```

Optional:

```bash
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


## Sandbox invariant

The canonical non-production tenant fixture is `medical-tourism-demo`.

Do **not** substitute `colombia-health-journey` or a future production tenant
until the synthetic provider -> catalog -> quote -> case -> booking flow has
been validated. The smoke intentionally has no tenant default and fails closed
when `HEALTH_TRAVEL_TENANT_ID` is absent.


## Synthetic catalog fixture

The default smoke provider/package IDs come from:

`docs/tenants/health-travel/fixtures/smiletripcare-catalog.synthetic.json`

The fixture is intentionally fictional and contains only public commercial
coordination fields. It contains no contact details, patient identity, clinical
records, diagnosis, or treatment recommendations.


## Sandbox bootstrap

Dry-run is the default and safe path:

```bash
npm run health-travel:sandbox:bootstrap
```

Creating the synthetic `platform.tenants` row is a separate explicit action:

```bash
HEALTH_TRAVEL_ALLOW_SANDBOX_ONBOARD=true \
PLATFORM_ADMIN_TOKEN="..." \
npm run health-travel:sandbox:bootstrap -- --execute-onboard
```

The wrapper refuses any slug except `medical-tourism-demo` and never enables
Doppler, Twenty, wacrm, external communications, or production deployment.
