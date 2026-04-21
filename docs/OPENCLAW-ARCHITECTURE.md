# OpenClaw — Arquitectura de orquestación (Opsly)

Documento de **diseño orientativo** para una capa de orquestación de agentes y tareas de larga duración **alineada con el stack Opsly** (Redis, colas, API Next). No sustituye ADR existentes hasta que se apruebe implementación concreta.

## Actualización 2026-04-21 (Super Agente + Shadow Deploy)

- Se adopta patrón de control interno con roles lógicos:
  - **`opsly_billy`**: orquestador/ejecutor.
  - **`opsly_lili`**: supervisor de políticas (riesgo/costo/compliance).
- Los agentes externos (Cursor/OpenClaude/Hermes/otros) se conectan como **providers** con adapter, nunca como segundo control plane.
- Se habilita estrategia de **shadow deployment** para contexto/routing v2 (`context-builder-v2` y servicios v2 con puertos aislados) con rollback automático al stack actual.

## Objetivo

- Centralizar **decisiones** sobre qué trabajo ejecuta un agente, cuándo y con qué presupuesto.
- Reducir **costo** (tokens, llamadas externas, contenedores) mediante priorización y deduplicación.
- Reutilizar **Redis** ya presente en la plataforma (BullMQ / colas) como bus de eventos y estado de orquestación.

## Workers remotos (Mac 2011 / nodos dedicados)

El orchestrator (`apps/orchestrator`) puede dividirse con **`OPSLY_ORCHESTRATOR_ROLE`**:

- **`control`** en el VPS: mantiene **TeamManager**, suscripción a eventos Redis y encolado; **no** arranca los consumidores BullMQ de jobs.
- **`worker`** en un host con más CPU/RAM: arranca **solo** los `Worker` BullMQ contra el **mismo** `REDIS_URL` (típicamente Redis del VPS vía Tailscale).

Así se alivia CPU en el VPS sin cambiar el modelo de cola única (`openclaw` en Redis). Detalle operativo: **`docs/ARCHITECTURE-DISTRIBUTED.md`**, **`docs/WORKER-FLOWS.md`**, **`docs/ORCHESTRATOR.md`**.

## Componentes propuestos

| Pieza | Rol |
|--------|-----|
| **Redis** | Colas de jobs, locks distribuidos, TTL de idempotencia, métricas ligeras de contadores. |
| **Motor de decisiones** | Reglas declarativas (prioridad tenant, plan, SLA, costo estimado) que eligen entre: ejecutar ahora, encolar, rechazar, delegar a humano. |
| **Workers** | Procesos que consumen colas (mismo patrón que orquestación de tenants en `apps/api`). |
| **API control plane** | Endpoints admin para pausar colas, ver backlog y políticas (sin exponer secretos). |

## Flujo simplificado

1. Evento entrante (webhook, cron, acción admin) → validación y **clave de idempotencia** en Redis.
2. **Motor de decisiones** lee política (tenant, plan, límites) y estado de carga.
3. Si procede: encola job con payload mínimo; si no: responde 429/403 o registra auditoría.
4. Worker ejecuta side-effects (Docker, Supabase, email) con **reintentos con backoff** ya alineados a `RETRY_CONFIG` en `apps/api/lib/constants.ts` donde aplique.

## Reducción de costos

- **Deduplicación**: mismo `tenant_id` + tipo de evento + ventana temporal → un solo job.
- **Batching**: agrupar lecturas a Supabase o métricas cuando el SLA lo permita.
- **Degradación**: en picos, rutas no críticas (p. ej. informes) pasan a cola de baja prioridad.
- **Límites por plan**: planes Startup vs Business vs Enterprise mapean a profundidad de cola y paralelismo.

## Relación con n8n y Uptime

- **n8n** sigue siendo el motor de automatización **por tenant**; OpenClaw (nombre conceptual) describe la **capa plataforma** que decide cuándo disparar provisión, suspensiones masivas o mantenimiento.
- **Uptime Kuma** aporta señal externa; el orquestador puede suscribirse a webhooks de alerta y encolar remediaciones acotadas.

## Próximos pasos técnicos

1. ADR nuevo si se implementa cola dedicada distinta de BullMQ actual.
2. Esquema de claves Redis con prefijo `opsly:orchestrator:` para no colisionar con BullMQ.
3. Métricas en Prometheus (jobs encolados, latencia p95, rechazos por política).

## Referencias en repo

- `apps/api/lib/orchestrator.ts` — orquestación actual de tenants.
- `infra/docker-compose.platform.yml` — servicio `redis`.
- `docs/adr/` — decisiones arquitectura existentes.
