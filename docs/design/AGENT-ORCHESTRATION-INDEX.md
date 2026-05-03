# Agent orchestration — índice maestro (Opsly)

**Estado:** documentación canónica de **rutas de implementación** (qué construir primero y dónde vive en el monorepo).  
**Última actualización:** 2026-04-30  
**Relación:** complementa [`AGENTS.md`](../../AGENTS.md) y [`VISION.md`](../../VISION.md); no sustituye ADRs ni el checklist de seguridad.

---

## Tres rutas de trabajo (elegir una como foco)

### Ruta A — CloudSysOps (cashflow / operación técnica)

- **Timeline orientativo:** ~2 semanas por incremento verificable (ajustar en [`ROADMAP.md`](../../ROADMAP.md)).
- **Foco:** reservas / técnico / slots públicos, API bajo `apps/api/app/api/`, migraciones Supabase, n8n, admin si aplica.
- **Orquestación:** código en [`apps/orchestrator`](../../apps/orchestrator); contrato en [`docs/00-architecture/ORCHESTRATOR.md`](../00-architecture/ORCHESTRATOR.md); colas BullMQ en [`apps/orchestrator/src/queue.ts`](../../apps/orchestrator/src/queue.ts) (extender tipos y workers según necesidad).
- **IA:** herramientas MCP en [`apps/mcp`](../../apps/mcp) y llamadas LLM solo vía [`apps/llm-gateway`](../../apps/llm-gateway).

### Ruta B — Paralelo CloudSysOps + Defense

- **Timeline:** 4–5 semanas en paralelo solo si hay capacidad (2 flujos de PR).
- **Defense:** schema `defense` en Supabase, rutas `apps/api/app/api/defense/`, UI admin bajo `apps/admin`, jobs de auditoría en orchestrator cuando existan.
- **ADR:** nueva decisión de arquitectura → **siguiente id libre** en [`docs/adr/`](../adr/) (revisar prefijos existentes; no reutilizar **020**, reservado a [`ADR-020-orchestrator-worker-separation.md`](../adr/ADR-020-orchestrator-worker-separation.md)). Un ADR “defense platform” u otro tema paralelo usaría el siguiente número disponible (p. ej. **ADR-0XX** hasta que exista el archivo).

### Ruta C — A + B + más agentes OpenClaw (Sales/Ops, etc.)

- **Timeline:** 5–6 semanas; requiere varios hilos de PR y coordinación.
- **OpenClaw:** contratos y router en [`apps/orchestrator/src/openclaw/`](../../apps/orchestrator/src/openclaw/) — ver [`docs/00-architecture/OPENCLAW-ARCHITECTURE.md`](../00-architecture/OPENCLAW-ARCHITECTURE.md).

---

## Dónde va cada cosa (mapa del monorepo)

| Capacidad | Ubicación real en Opsly |
|-----------|-------------------------|
| API HTTP (Next Route Handlers) | [`apps/api/app/api/`](../../apps/api/app/api/) |
| Admin UI | [`apps/admin`](../../apps/admin) |
| Portal / web producto | [`apps/portal`](../../apps/portal), [`apps/web`](../../apps/web) |
| Colas BullMQ, workers, health HTTP interno | [`apps/orchestrator`](../../apps/orchestrator) — [`docs/00-architecture/ORCHESTRATOR.md`](../00-architecture/ORCHESTRATOR.md) |
| OpenClaw (políticas, contratos, eventos) | [`apps/orchestrator/src/openclaw/`](../../apps/orchestrator/src/openclaw/) |
| MCP (tools) | [`apps/mcp`](../../apps/mcp) |
| LLM (routing, costes) | [`apps/llm-gateway`](../../apps/llm-gateway) — [`docs/LLM-GATEWAY.md`](../LLM-GATEWAY.md) |
| Fallover / cola de reparación (diseño) | [`docs/orchestrator/REPAIR-QUEUE.md`](../orchestrator/REPAIR-QUEUE.md) |
| Seguridad operativa | [`docs/04-infrastructure/SECURITY_CHECKLIST.md`](../04-infrastructure/SECURITY_CHECKLIST.md) |

**No crear** un segundo plano tipo `apps/agent-server` (Express paralelo): extender orchestrator + API según [`AGENTS.md`](../../AGENTS.md) (Fase 4).

---

## Política: `apps/` vs `packages/` vs vendor (terceros)

- **`packages/`:** librerías **propias** del workspace (`packages/types`, `packages/skills/manifest`, etc.) con `package.json` y contrato de build/type-check compartido por `apps/*`.
- **Código de terceros (repos “clonados”):** preferir **dependencia npm** (registry o URL `git+…` con tag/commit fijo) en el paquete que la consuma; no volcar clones completos en `packages/` sin ADR y mantenimiento claro.
- **Forks con parches:** repo aparte o **git submodule** acotado + ADR (actualización, licencia, seguridad).
- **`.github/`:** plantillas y workflows en la **raíz** del repo; no duplicar bajo `packages/`.

---

## Seguridad antes de exponer endpoints públicos

Checklist y mitigaciones: [`docs/04-infrastructure/SECURITY_CHECKLIST.md`](../04-infrastructure/SECURITY_CHECKLIST.md) (incl. sección de abuso / rate limiting). Edge (Cloudflare) + API + Redis según evolución del producto.

---

## Próximo paso operativo

1. Elegir **ruta A, B o C** y reflejar el foco en `AGENTS.md` (sección 🔄 / próximo paso).  
2. Abrir PRs pequeños (schema → API → UI → n8n / jobs) con `npm run type-check` y tests del workspace tocado.  
3. Para fallover automático a “repair”, seguir el diseño en [`docs/orchestrator/REPAIR-QUEUE.md`](../orchestrator/REPAIR-QUEUE.md) antes de escribir colas nuevas.
