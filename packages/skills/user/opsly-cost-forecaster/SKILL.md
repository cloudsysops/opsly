---
name: opsly-cost-forecaster
description: Forecast Opsly multi-tenant spend across LLM tokens, infra, storage, and Stripe billing. Use for 30/60/90-day run-rate projections, per-tenant what-if analysis, invoice anomaly checks, budget headroom, and scaling decisions.
---

# Opsly Cost Forecaster

> **Triggers:** `forecast cost`, `cost forecast`, `burn rate`, `run rate`, `budget`, `spend`, `overrun`, `unit economics`, `tenant cost`, `llm spend`, `token burn`, `stripe invoice`, `presupuesto`, `proyeccion`, `factura`, `gasto`
> **Priority:** CRITICAL
> **Related skills:** `opsly-billing`, `opsly-llm`, `opsly-telemetry`, `opsly-economist`, `opsly-infra`

## When to use

Use this skill when you need to estimate or explain future cost impact for:

- multi-tenant onboarding or growth
- LLM model mix changes, caching, routing, or batching
- infrastructure scaling, rightsizing, or backup/storage growth
- Stripe invoice deltas versus forecast
- budget headroom by tenant, plan, service, or fleet

Do not use this skill for billing implementation details. Use `opsly-billing` or `opsly-llm` for code changes.

## Inputs to collect

- horizon: `30`, `60`, or `90` days
- scope: `tenant`, `plan`, `service`, or `fleet`
- historical spend and usage
- model mix and token volume
- fixed infra costs, storage, backups, and worker/queue costs
- Stripe invoices or revenue assumptions
- known changes: growth, seasonality, pricing, or plan mix

If any input is missing, state the assumption explicitly instead of filling gaps silently.

## Workflow

1. Establish the baseline from observed data, not guesses.
2. Split spend into `llm`, `infra`, `storage`, `billing/Stripe`, and `other`.
3. Normalize to monthly run rate and per-tenant unit cost.
4. Project `30/60/90` day scenarios:
   - baseline
   - growth
   - worst case
   - mitigation
5. Stress the forecast against likely changes in tenant count, model prices, cache hit rate, worker/VM sizing, and plan mix.
6. Recommend actions ranked by savings, effort, and risk.

## Repo signals

- LLM usage: `apps/llm-gateway`, `docs/00-architecture/LLM-GATEWAY.md`
- Billing and invoices: `apps/api`, `apps/portal`, `opsly-billing`
- Tenant and plan mix: `opsly-tenant`, `opsly-api`
- Infra cost drivers: `opsly-infra`, worker and VPS deployment docs
- Forecast helpers in this skill: `scripts/forecast.ts`, `scripts/token-counter.ts`, `scripts/recommendations.ts`

## Output expectations

Return:

- horizon and scope
- assumptions
- current monthly run rate
- forecast by category
- tenant or service hotspots
- risk flags
- recommended actions with estimated savings, effort, and confidence
- next review date

Prefer a compact JSON-like summary when the user needs machine-readable output.

## Guardrails

- Separate observed values from assumptions.
- Use tenant-scoped numbers when available.
- Do not mix cents and dollars.
- Do not recommend provider, plan, or routing changes without stating impact on quality, uptime, and rollback.
- If pricing is stale or untrusted, lower confidence and say why.
- Never expose secrets or raw provider credentials in the forecast output.

## Validation cases

1. New tenant mid-month: forecast increases only from activation date.
2. Model switch: rerun with the new token price and compare the delta.
3. Stripe invoice spike: explain actual versus forecast variance.
4. Infra scale-up: include worker or VM cost uplift and break-even.
5. Low-signal week: return low confidence and list the missing inputs.
