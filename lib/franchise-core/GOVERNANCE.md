---
title: "lib/franchise-core Governance"
description: "Reusable Franchise OS domain for Opsly tenants"
---

# lib/franchise-core Governance

- **Owner:** platform / operations
- **Consumers:** tenant adapters (`apps/peskids/lib/franchise`, future academy/restaurant/home-services), APIs, n8n event contracts
- **Non-consumers as dependencies:** this package must not import tenant apps, Twenty, Stripe/Wompi SDKs, n8n, Moon UI, or LLM runtime

## Boundaries

Franchise Core owns network, franchisee, units, territories, agreements, royalties, audits, opening lifecycle, brand standards, and supplier *rules*.

It does **not** own family/student CRM, class scheduling, payment processor internals, agent registry, or marketing automation.

## Versioning

- Royalty rule changes are **new versions**. Historical `RoyaltyCalculation` rows are immutable.
- Breaking domain field changes require MINOR at minimum; removing a calculation input field is MAJOR.
- Tenant overlays (Peskids swim standards, etc.) live in adapters, never in this package.

## Review

PRs that change royalty rounding, agreement lifecycle, or RLS/ACL helpers need a human pass before merge to `main`.
