---
status: active
owner: platform
last_review: 2026-09-12
---

# Revenue + Health & Travel capability stack

Opsly composes mature open-source services instead of rebuilding CRM, inbox, scheduling, commerce, deal monitoring, campaign delivery, attribution, and AI observability.

## External services

| Service | Opsly role | Canonical usage |
|---|---|---|
| Twenty | CRM | people, companies, opportunities |
| Chatwoot | Inbox | customer/patient/partner conversations |
| Cal.com | Scheduling | consultations, appointments, calls |
| Medusa | Commerce | products, packages, promotions, orders |
| changedetection.io | Deal intelligence | price/restock/change events from approved sources |
| Shlink | Attribution | short links and click attribution |
| listmonk | Campaign delivery | opt-in segments and approval-first email campaigns |
| Langfuse | AI observability | AgentTask/LLM traces and evaluations |

Source/version policy: `config/external-services.json`.

Bootstrap:

```bash
./scripts/ops/bootstrap-external-services.sh twenty
./scripts/ops/bootstrap-external-services.sh all
```

Every checkout is detached at a reviewed tag and produces `.opsly-pin.json` with exact SHA. Production never follows `main` or `latest`.

## Opsly ownership boundary

External services own their mature domain UIs. Opsly owns the cross-product intelligence:

```text
Lead / customer / patient
        ↓
Twenty + Chatwoot + Cal.com
        ↓
Revenue Agent / governed AgentTask
        ↓
Offer / product / provider match
        ↓
Medusa / partner API / travel API
        ↓
Shlink attribution
        ↓
conversion
        ↓
Opsly commission ledger
        ↓
Mission Control Revenue
```

Opsly does **not** create a second CRM, second scheduler, second inbox or second commerce engine.

## Health & Travel Colombia

The `health-travel` tenant bundle is a coordination/commerce layer, not a medical record or diagnostic system.

Core journey:

```text
international lead
→ intake
→ provider shortlist
→ consultation
→ quote
→ appointment
→ travel / lodging / transport coordination
→ follow-up
→ attribution / commission
```

Rules:
- clinical decisions remain with licensed providers;
- Opsly does not diagnose or prescribe;
- only minimum necessary commercial/coordination data should flow through CRM;
- sensitive clinical records require a separately reviewed compliance/data architecture;
- provider quality/credential checks must precede marketplace activation;
- commissions/referrals must be permitted by the relevant contracts and jurisdiction.

## Revenue OS

Revenue OS composes:
- Twenty
- Chatwoot
- Cal.com
- n8n
- Shlink
- listmonk
- LLM Gateway
- Opsly approvals and AgentTask runtime

The proprietary Opsly layer should implement:
- opportunity routing;
- partner/provider scoring;
- attribution;
- commission events and payout state;
- Revenue Agent policy;
- Mission Control revenue metrics.

## Commerce & Deals

The `commerce-deals` bundle composes:
- Medusa for catalog/order primitives;
- changedetection.io for approved price/restock monitoring;
- Shlink for attribution;
- n8n for integration events.

Do not scrape providers where terms prohibit it. Prefer official APIs, feeds and affiliate programs.

## Next implementation increments

1. commission/attribution domain model in Opsly;
2. Revenue Agent task contract;
3. Mission Control Revenue view;
4. Twenty opportunity adapter for revenue journeys;
5. Shlink attribution adapter;
6. partner/provider registry;
7. Health & Travel Colombia blueprint;
8. Medusa/changedetection adapters only after the core revenue contract exists.
