---
status: draft
owner: architecture
last_review: 2026-06-18
---

# Client Launch Machine

Opsly pattern for launching a new client faster than a one-off Peskids setup.

**Goal:** the founder provides a small intake contract; Opsly returns a launch plan, a reusable tenant baseline, and a clear list of manual approvals.

## Operating principle

- Opsly stays the control plane.
- The client gets a branded tenant experience.
- The founder should not have to rebuild the same launch decisions for every customer.
- Any step that changes a client-facing surface or money-moving system remains approval-first.

## Inputs

Minimum intake payload:

```json
{
  "client_name": "Academia X",
  "industry": "swim school",
  "domain": "client.op-sly.com",
  "contact_whatsapp": "+1...",
  "business_email": "...",
  "offer": "free class",
  "ghl_location_id": "...",
  "brand_basic": {
    "logo": "...",
    "colors": ["#0f172a", "#38bdf8"],
    "tone": "clear and trustworthy"
  }
}
```

## Step 1 - Sales Intake

What Cristian must collect in the call:

- business name
- industry
- domain or subdomain
- WhatsApp number
- business email
- offer type
- GoHighLevel location id
- brand basics
- lead sources
- whether the client expects launch with marketplace or not

## Step 2 - Tenant Setup

What Opsly should create from the contract:

- tenant slug
- lifecycle state
- brand stub
- source-of-truth tenant record
- extraction readiness default = false
- allowed capabilities

## Step 3 - CRM Setup

What belongs in GoHighLevel:

- subaccount mapping
- pipeline
- forms
- basic follow-up
- calendars if the tenant needs booking
- WhatsApp / SMS / email follow-up where approved

## Step 4 - Landing Setup

What the first launch route should provide:

- one branded landing page
- one lead capture form
- one main CTA
- one fallback contact path

## Step 5 - Automation Setup

What n8n should do first:

- route webhooks
- transform event payloads
- persist leads to Supabase
- sync contacts to GHL when allowed
- notify founder / owner on high-value leads

## Step 6 - Deploy

What is safe to script:

- tenant config generation
- environment validation
- route generation
- webhook registration where the API allows it
- health check wiring

What remains manual:

- GHL UI steps that the API does not expose
- domain verification
- brand approval

## Step 7 - Smoke Test

Minimum checks before marking a client launchable:

- tenant URL responds
- lead form posts successfully
- API health passes
- GHL health passes
- webhook path is reachable
- demo record appears in the dashboard

## Step 8 - Client Demo

Show only what the owner needs to trust:

- branded landing
- lead capture
- lead appears in Opsly
- follow-up exists
- health is green

## Step 9 - Handoff

What the client receives:

- their tenant summary
- their access path
- their launch checklist
- their support runbook
- their extraction conditions

## Step 10 - Monthly Operations

What Opsly should monitor every month:

- lead volume
- demo-to-conversion rate
- health and uptime
- GHL sync status
- webhook failures
- support issues
- extraction readiness

## Reusable primitives

- `config/tenants/_template.tenant.json`
- `packages/opsly-core/src/tenant-config/registry.ts`
- `packages/provisioning/src/ghl-provisioner.ts`
- `scripts/validate-ghl-config.sh`
- `scripts/peskids-mvp-smoke.sh`
- `scripts/test-peskids-client-demo.sh`
- `docs/blueprints/opsly-operational-blueprint/CLIENT-INCUBATION-TEMPLATE.md`

## What this is not

- not a full CRM
- not an automatic production deploy tool
- not a replacement for GoHighLevel
- not a second control plane

## Recommended next implementation slice

1. Add `config/client-launch.schema.json`.
2. Add `npm run client:plan`.
3. Generate a dry-run launch plan for Peskids and one new demo tenant.

