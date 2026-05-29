---
status: draft
owner: platform
last_review: 2026-05-28
---

# Hackathon demo — Opsly OS: Conversational Operating System for Small Organizations

**Mensaje central:** *Mismo runtime, diferentes industrias, cero reescritura del core.*

Opsly no vende “un bot de figuritas”. Demuestra un **runtime conversacional multi-tenant** que convierte lenguaje natural en eventos operativos. Panini Lab es el laboratorio; Peskids y SmileTripCare validan el mismo motor en **modo shadow** sin tocar producción.

## Prerequisites

- Node 20+
- Repo root: `npm install`

## Run tests (7 scenarios)

```bash
npm run opsly:core:test
npm run opsly:conversational:test
```

Covers:

1. Panini hackathon utterance → `UPDATE_COLLECTION` → `dispatched`
2. Peskids shadow utterance → `REPORT_ABSENCE` → `accepted` (no prod dispatch)
3. SmileTripCare shadow → `CREATE_LEAD` → `accepted`
4. Stub provider (`openai`) → controlled `AiProviderNotConfiguredError`
5. Intent not on tenant allowlist → `INTENT_NOT_ALLOWED`
6. Unknown tenant → `UNKNOWN_TENANT`
7. Core source free of tenant-specific hardcoding

## Interactive demo CLI

```bash
npm run opsly:core:demo
```

Runs the three hackathon utterances and prints the event log.

Optional Gemini (falls back to mock without key):

```bash
OPSLY_AI_PROVIDER=gemini GEMINI_API_KEY=your-key npm run opsly:core:demo
```

## Type-check & verify

```bash
npm run opsly:core:type-check
npm run opsly:verify:core
```

## Live demo script (3 tenants, 1 runtime)

### 1. Panini Lab (demo / dispatch)

**Input:**

```text
Tengo la 10 de Colombia y repetida la 30
```

**Expected:**

- Intent: `UPDATE_COLLECTION`
- Event status: `dispatched`
- Workflow ref: `panini-update-collection`

**Show:** event log entry + mock dispatcher call (lab only).

### 2. Peskids (shadow — no production side effects)

**Input:**

```text
Soy la mamá de Thiago, hoy no va a clase porque tiene fiebre
```

**Expected:**

- Intent: `REPORT_ABSENCE`
- Event status: `accepted` (not `dispatched`)
- Metadata: `{ mode: "shadow" }`
- **No** n8n/webhook call to Peskids production

### 3. SmileTripCare (shadow)

**Input:**

```text
Necesito una valoración dental
```

**Expected:**

- Intent: `CREATE_LEAD`
- Event status: `accepted`
- **No** CRM/webhook side effects in prod

## Event log modes

| Environment | Store | Notes |
|-------------|-------|-------|
| Local / demo / tests | `InMemoryEventLogStore` | Default in `createOpslyCore()` |
| Staging / prod | `SupabaseEventLogStore` | Table `platform.opsly_event_log` — SQL in [`opsly-agent-runtime.md`](../00-architecture/opsly-agent-runtime.md) |
| Peskids / SmileTripCare shadow | In-memory or Supabase | Events logged; **workflows not dispatched** |

Migrations are **not** applied automatically. Apply SQL manually when ready for staging.

## Adding a tenant

1. Create `apps/<slug>/config/tenant.config.ts` exporting `TenantConfig`.
2. Register in bootstrap: `createOpslyCore({ tenants: [...] })`.
3. Add vitest case in `packages/opsly-core/__tests__/core-mvp.test.ts`.
4. Mirror keywords in `__tests__/fixtures/demo-tenants.ts` for isolated tests.

Never add tenant slugs or brand names to `packages/opsly-core/src`.

## Architecture reference

- Core MVP: [`docs/00-architecture/opsly-agent-runtime.md`](../00-architecture/opsly-agent-runtime.md)
- Integration & reuse map: same doc, section *Complemento, no duplicado*
- Roadmap Sprint 2–4: [`docs/00-architecture/conversational-runtime-roadmap.md`](../00-architecture/conversational-runtime-roadmap.md)
