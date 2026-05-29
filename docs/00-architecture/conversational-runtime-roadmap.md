---
status: draft
owner: platform
last_review: 2026-05-28
---

# Conversational Runtime — Roadmap (Opsly incubator)

Opsly demuestra **incubadora multi-tenant**: un motor reutilizable + configs por tenant. No es un bot de Panini; es un runtime que opera cualquier negocio cambiando solo configuración.

## Mapa de sprints

| Sprint | Rama sugerida | Entregable | Estado |
|--------|---------------|------------|--------|
| **1 — OS Core MVP** | `feat/opsly-os-core-mvp` | `packages/opsly-core` — tenant-config, AI gateway (mock/gemini), agent-runtime, events, dispatcher, observability | ✅ Código + 6 tests |
| **1b — Conversational layer** | misma rama | `lib/conversational-runtime` — ports/adapters sobre opsly-core, `InputMessage` → `AgentResponse` | ✅ Skeleton + 4 tests |
| **2 — Panini Lab app** | `feat/conversational-runtime` | `apps/panini-lab` (Next :3005), webhook `/api/webhooks/inbound`, dashboard, migración `0065_panini_lab_schema.sql` | ⏳ Pendiente |
| **2b — Gateway Gemini** | `feat/conversational-runtime` | `gemini` en llm-gateway + `POST /v1/transcribe` | ⏳ Pendiente |
| **3 — Peskids shadow** | `feat/conversational-runtime` | Mismo runtime, `mode: shadow`, sin writes prod | ⏳ Config lista |
| **4 — Demo concurso** | — | Voz + dos tenants en vivo | ⏳ |

## Arquitectura (ports & adapters)

```
InputMessage (text | audio_url | image_url)
       │
       ▼
lib/conversational-runtime
  ├─ TranscriptionPort  → gateway /v1/transcribe (Sprint 2)
  ├─ packages/opsly-core AgentRuntime
  │     ├─ AiGateway (mock | gemini)
  │     ├─ EventBuilder (crypto.randomUUID)
  │     └─ WorkflowDispatcher
  ├─ EventSinkPort      → OPSLY_EVENT_BUS_URL (generalizado desde peskids/events.ts)
  └─ MemoryPort         → Supabase conversation_events (Sprint 2)
       ▼
AgentResponse { ok, reply, eventIds, traceId }
```

## Regla de desacople (hard)

`packages/opsly-core/src` y `lib/conversational-runtime/src` **no** contienen dominio Panini/Peskids/SmileTripCare. Solo:

- `TenantConfig`, `IntentRequest`, `OpslyEvent`, `InputMessage`, ports.

Dominio vive en:

- `apps/*/config/tenant.config.ts`
- `config/tenants/*.json` (metadata onboarding)

## Reutilización existente (no rebuild)

| Necesidad | Reutilizar |
|-----------|------------|
| LLM tenant-scoped | `@intcloudsysops/llm-gateway` `llmCall` |
| Event bus | Patrón `apps/peskids/lib/events.ts` |
| Logging | `@intcloudsysops/observability` |
| RLS migrations | Plantilla `0064_peskids_rls_policies.sql` |

## Comandos

```bash
npm run opsly:core:test
npm run opsly:core:demo
npm run test --workspace=@intcloudsysops/conversational-runtime
```

## Docs relacionadas

- [`opsly-agent-runtime.md`](opsly-agent-runtime.md) — detalle del core MVP
- [`../demo/hackathon-demo.md`](../demo/hackathon-demo.md) — script demo

## Ramas y temas separados

| Tema | Rama | Notas |
|------|------|-------|
| FCM / Capacitor Peskids | `feat/peskids-firebase-fcm` | PR #437 — no mezclar con runtime |
| Conversational runtime | `feat/opsly-os-core-mvp` → PR | Sprint 1+1b |
| Panini app + Gemini | `feat/conversational-runtime` | Continúa desde merge Sprint 1 |
