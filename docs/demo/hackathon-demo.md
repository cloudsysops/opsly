---
status: draft
owner: platform
last_review: 2026-05-28
---

# Hackathon demo — Opsly OS Core

Quick local demo for **Panini Lab** (live dispatch), **Peskids** and **SmileTripCare** (shadow validation).

## Prerequisites

- Node 20+
- Repo root: `npm install`

## Run tests (6 scenarios)

```bash
npm run opsly:core:test
```

Covers:

1. Panini `UPDATE_COLLECTION` → `dispatched`
2. Peskids `REPORT_ABSENCE` → `accepted` (shadow)
3. SmileTripCare `CREATE_LEAD` → `accepted` (shadow)
4. Intent not on tenant allowlist → `INTENT_NOT_ALLOWED`
5. Unknown tenant → `UNKNOWN_TENANT`
6. Core source free of tenant-specific hardcoding

## Interactive demo CLI

```bash
npm run opsly:core:demo
```

Optional Gemini (falls back to mock without key):

```bash
OPSLY_AI_PROVIDER=gemini GEMINI_API_KEY=your-key npm run opsly:core:demo
```

## Type-check

```bash
npm run type-check --workspace=@intcloudsysops/opsly-core
```

## What to show live

1. **Panini Lab** — utterance mentions “update collection” → event `dispatched`, workflow ref `panini-update-collection`.
2. **Peskids shadow** — “report absence” → event `accepted`, no production n8n call.
3. **Event log** — CLI prints appended events; in production, same shape lands in Supabase `platform.opsly_event_log`.

## Adding a tenant

1. Create `apps/<slug>/config/tenant.config.ts` exporting `TenantConfig`.
2. Register in your bootstrap (`createOpslyCore({ tenants: [...] })`).
3. Add a vitest case in `packages/opsly-core/__tests__/core-mvp.test.ts`.

Never add tenant slugs or brand names to `packages/opsly-core/src`.

## Architecture reference

- Core MVP: [`docs/00-architecture/opsly-agent-runtime.md`](../00-architecture/opsly-agent-runtime.md)
- Roadmap Sprint 2–4: [`docs/00-architecture/conversational-runtime-roadmap.md`](../00-architecture/conversational-runtime-roadmap.md)
