# ADR-020: Separación control plane (VPS) ↔ worker plane (remoto)

## Estado: ACEPTADO | Fecha: 2026-04-12

## Contexto

- El VPS puede saturarse (CPU/RAM) si el mismo proceso ejecuta **TeamManager + eventos + todos los workers BullMQ** (colas pesadas, I/O, ML vía subprocesos).
- Ya existe documentación operativa: `docs/ARCHITECTURE-DISTRIBUTED.md`, `docs/ORCHESTRATOR.md`, scripts `scripts/run-orchestrator-worker.sh`, `scripts/start-workers-mac2011.sh`.
- **Código previo:** `OPSLY_ORCHESTRATOR_ROLE` ∈ `control` \| `worker` \| `full` en `apps/orchestrator/src/orchestrator-role.ts`.

## Decisión

1. **Mantener** el modelo de tres roles; **no** duplicar un segundo sistema de flags.
2. **Añadir** variable opcional `OPSLY_ORCHESTRATOR_MODE` como **alias legible** cuando `OPSLY_ORCHESTRATOR_ROLE` no está definido:
   - `queue-only` → `control` (sin workers BullMQ en ese proceso).
   - `worker-enabled` → `worker` (solo workers; sin control plane).
3. **Redis canónico:** en el despliegue estándar, **Redis sigue en el VPS** (o el host que ya expone `REDIS_URL`); los nodos worker usan el **mismo** `REDIS_URL` vía Tailscale/firewall acotado. **No** forma parte de este ADR mover Redis a otro host; eso sería un ADR aparte con implicaciones de persistencia y backup.
4. **Health HTTP** (`GET /health` en puerto `ORCHESTRATOR_HEALTH_PORT`, default 3011): la respuesta incluye `role` y `mode` (`queue-only` \| `worker-enabled` \| `full-stack`) para comprobar el modo sin leer solo logs.

## Consecuencias

- **Positivo:** un solo código; VPS puede `control`, Mac/Linux remoto `worker`, mismo `REDIS_URL` hacia el broker.
- **Negativo:** `OPSLY_ORCHESTRATOR_ROLE` tiene prioridad sobre `OPSLY_ORCHESTRATOR_MODE` si ambos están definidos (evitar configuraciones contradictorias).
- **Operación:** `curl -s http://127.0.0.1:3011/health` (o el host/puerto expuesto) debe mostrar `mode` y `role`.

## Referencias

- `docs/ARCHITECTURE-DISTRIBUTED.md`
- `docs/adr/ADR-011-event-driven-orchestrator.md`
- `apps/orchestrator/src/orchestrator-role.ts`
- `apps/orchestrator/src/health-server.ts`
