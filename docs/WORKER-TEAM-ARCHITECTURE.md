# Arquitectura: equipos de workers OpenClaw (visión y roadmap)

> **Estado:** diseño y alineación con el monorepo actual. **No** sustituye a `TeamManager` ni a las colas BullMQ existentes hasta un ADR y trabajo de producto explícitos.  
> **Relacionado:** `docs/OPENCLAW-ARCHITECTURE.md`, `docs/ORCHESTRATOR.md`, `docs/AGENTS-GUIDE.md`, `docs/ARCHITECTURE-DISTRIBUTED-FINAL.md`, `skills/user/opsly-quantum/SKILL.md`.

## Visión general

Los **clientes (tenants)** consumen automatización e IA a través del **control plane** (API, Redis, colas, LLM Gateway, MCP). La visión de **equipos de workers alquilables** es que cada tenant pueda tener **capacidad dedicada** (concurrencia, presupuesto, roles lógicos) medida y limitada por **plan**, sin duplicar un segundo orquestador fuera del patrón actual (**extender, no re-arquitecturar** — `AGENTS.md`).

```
┌─────────────────────────────────────────────────────────────┐
│            OPENCLAW / OPSLY — EQUIPOS (objetivo)             │
├─────────────────────────────────────────────────────────────┤
│  Tenants → Billing / límites por plan (USD + uso LLM)      │
│         → Colas BullMQ (`openclaw`, `team-*`, …)           │
│         → Workers (VPS y/o Mac 2011 según OPSLY_ORCHESTRATOR_ROLE) │
│         → LLM Gateway (costos, `usage_events`)             │
│         → Context Builder / Redis (estado, TTL por plan)    │
│         → MCP OpenClaw (herramientas hacia API/GitHub)      │
└─────────────────────────────────────────────────────────────┘
```

## Qué existe hoy en código

| Pieza                                                       | Ubicación                                               | Rol                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Equipos por **especialidad** (frontend, backend, ml, infra) | `apps/orchestrator/src/teams/TeamManager.ts`            | Colas `team-*`, workers BullMQ                             |
| Jobs OpenClaw / intent                                      | `apps/orchestrator/src/engine.ts`, cola `openclaw`      | Orquestación de trabajo                                    |
| Límites por plan (agentes paralelos, orientativo)           | `docs/AGENTS-GUIDE.md`                                  | Producto; aplicación en runtime = política + colas         |
| Presupuesto LLM / tenant                                    | `tenant_budgets`, API portal budget, `SuspensionWorker` | USD mensual, umbral alerta                                 |
| Costo por uso LLM                                           | `apps/llm-gateway`, `usage_events`                      | Fuente de verdad de facturación por uso IA                 |
| Skill maestro (procedimientos)                              | `skills/user/opsly-quantum/SKILL.md`                    | Orquestación **humana/agente**, no un microservicio aparte |

## Roles de worker (conceptuales)

Los **8 roles** del prompt son **personas operativas** para agentes (Claude/Cursor), no procesos separados obligatorios. Se mapean a **skills** y a **tipos de tarea** que `TeamManager` ya enruta por `handles`:

| Rol conceptual       | Skill / procedimiento                               | Equipo BullMQ típico |
| -------------------- | --------------------------------------------------- | -------------------- |
| Lead Developer       | `opsly-quantum`, `opsly-context`, decisiones en ADR | backend / infra      |
| Code Developer       | `opsly-api`, código en `apps/*`                     | backend / frontend   |
| Code Reviewer        | revisión humana + CI                                | —                    |
| Tester               | Vitest/Playwright por workspace                     | backend / frontend   |
| Doc Writer           | `AGENTS.md`, `docs/`                                | —                    |
| Security Guardian    | `docs/SECURITY_CHECKLIST.md`                        | infra                |
| Performance Analyzer | métricas API, LLM                                   | ml / infra           |
| DevOps Helper        | scripts `scripts/`, VPS por Tailscale               | infra                |

**OpenClaw** no expone hoy un HTTP estable `localhost:8000/execute` genérico en el repo: la integración real pasa por **orchestrator + gateway + MCP** según `docs/OPENCLAW-ARCHITECTURE.md`.

## “Pool” por tenant (roadmap)

Un **pool dedicado por tenant** (equipo A = localrank, equipo B = otro slug) implica:

1. **Prefijos de cola o metadata** `tenant_id` / `tenant_slug` en jobs (ya parcialmente en tipos de orchestrator).
2. **Cuotas** alineadas a `VISION.md` y `AGENTS-GUIDE.md` (startup/business/enterprise).
3. **Sin** segundo `WorkerTeamOrchestrator` en memoria en el API Next: los handlers serverless no son lugar para estado de equipos persistente.

Diseño recomendado en fases: ADR + Redis/Supabase para estado de “equipo” si hace falta, no `Map` en singleton.

## Contexto compartido (contrato lógico)

Objetivo de datos (referencia; implementación futura puede usar Redis + tablas platform):

```typescript
interface SharedContext {
  tenant_id: string;
  project_state: {
    files: string[];
    last_commit: string;
    open_issues: Array<{ id: string; title: string }>;
    active_features: Array<{ id: string; name: string }>;
  };
  team_state: {
    workers: Array<{ id: string; role: string; status: string }>;
    active_tasks: Array<{ id: string; status: string }>;
    completed_tasks: Array<{ id: string; status: string }>;
  };
  billing_state: {
    plan: string;
    usage: { llm_usd_month?: number; requests_day?: number };
    limits: { monthly_cap_usd?: number | null };
  };
}
```

## Referencias

- `docs/WORKER-TEAM-BILLING.md` — medición y facturación.
- `docs/WORKER-FLOWS.md` — control vs worker.
- `docs/adr/ADR-017-worker-teams-billing-roadmap.md` — decisión de alcance.
