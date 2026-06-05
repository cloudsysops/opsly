# Peskids GHL Consulting Handoff

## Executive Summary
Peskids is live in production and the core operating stack is working: GHL, n8n, Supabase, Traefik, HTTPS, and the main CI build are all validated. Opsly is now positioned as the reporting and control layer, while GHL owns the commercial invitation and follow-up workflow.

## Current State
- Peskids resolves at `https://peskids.op-sly.com` with HTTP 200.
- Public reservation URL: `https://peskids.op-sly.com/reserva-clase-gratuita`.
- DNS, Traefik, and TLS are healthy.
- GHL is active and connected to the operating flow.
- n8n is active.
- Supabase is active.
- Dashboard is deployed.
- Legacy invite flow is now non-blocking smoke only.
- The public API health URL currently returns 404 from this check.

## Peskids Blueprint
- Captation: public lead capture from the Peskids site.
- CRM: GHL owns contacts, invites, emails, follow-ups, reminders, and pipelines.
- Automation: n8n handles workflow execution and operational handoff.
- Dashboard: Opsly shows business status, lead flow, and source mix.
- Reporting: source tracking is in place for Instagram, Facebook, Website, and Referral.

## Opsly Positioning
- Opsly observes, measures, consolidates, and reports.
- Opsly does not replace GHL CRM behavior.
- Opsly does not expand the legacy invite system.
- Opsly keeps the Peskids pilot visible and operational.

## What GHL Owns
- Contacts
- Invitations
- Emails
- Follow-ups
- Reminders
- Pipelines
- Commercial lifecycle automation

## What Opsly Owns
- Control plane visibility
- Business reporting
- Lead source tracking
- Operational dashboards
- Tenant-level status consolidation

## Questions For GHL
1. What is the recommended agency model for a small client set with a repeatable blueprint?
2. Which parts should be handled as SaaS-like configuration versus managed service?
3. What snapshot strategy works best for fast replication across new clients?
4. What pricing model is best for first clients and early scale?
5. What white-label setup is worth doing immediately versus later?
6. What partner program path best matches an agency-in-growth stage?
7. What are the main pitfalls when scaling from one client to several?

## Open Risks
- `https://peskids.op-sly.com/api/dashboard?range=week` requires staff authentication, so dashboard reflection cannot be verified anonymously.
- Public verification of the lead-to-dashboard path still depends on using the correct public lead form and a staffed dashboard session.

## Next Action
1. Use `https://peskids.op-sly.com/reserva-clase-gratuita` as the public demo URL.
2. Validate the lead capture flow with the new public smoke script.
3. Validate dashboard reflection with a staffed session once a real lead is submitted.
