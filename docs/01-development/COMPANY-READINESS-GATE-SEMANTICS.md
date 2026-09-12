---
status: canon
owner: founder
last_review: 2026-09-11
type: operating-policy
---

# Company Readiness Gate Semantics

## Purpose

Avoid assuming that business-readiness checklists are runtime security controls.

## Current enforcement level

`ready_to_bill` and `ready_for_enterprise_sales` are **process gates**.

They are used for:

- founder decision-making;
- sales readiness;
- due-diligence readiness;
- Mission Control visibility;
- prioritization.

They do **not** currently block:

- Stripe checkout;
- tenant provisioning;
- invoices;
- API access;
- deployments.

Do not describe these gates as code-enforced until a dedicated enforcement PR exists.

## Why process gates are appropriate now

For a solo founder + agents startup, hard-blocking billing on broad legal/compliance checklists would couple commercial operations to incomplete governance metadata and create unnecessary failure modes.

The current model is:

```
process gate -> founder decision -> explicit operational action
```

rather than:

```
process gate -> automatic API denial
```

## Future enforcement candidates

Only narrow, objective controls should become code-enforced, for example:

- no production deployment if required backup verification is stale;
- no high-risk agent execution without node auth/approval;
- no regulated-data tenant activation without required data-handling configuration;
- no external agent bridge execution without auth.

Commercial/legal readiness remains a human approval concern unless explicitly changed by ADR.
