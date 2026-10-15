---
status: canon
owner: platform
last_review: 2026-08-07
type: architecture
tags:
  - opsly/mission-control
  - opsly/modularity
  - opsly/icso
---

# Mission Control Kit

**Módulo:** `@intcloudsysops/mission-control-kit` (`lib/mission-control-kit`)  
**Contrato:** [MODULARITY-CONTRACT.md](../01-development/MODULARITY-CONTRACT.md) / ADR-044

## Tres Mission Controls (no confundir)

| Producto | App | Mode kit | Ámbito |
| --- | --- | --- | --- |
| **Opsly Moon** | `apps/admin` | `platform` | Control plane multi-tenant IntCloudSysOps |
| **ICSO Mission Control** | `apps/icso` `/mission-control` | `agency` | Pipeline/catálogo agency IntCloud SysOps |
| **Tenant Mission Control** | `apps/<slug>` (p. ej. Peskids `/admin`) | `tenant` | Ops del cliente final |

El kit **no** es un segundo orchestrator ni un segundo Moon. Solo contratos: profile, nav, health labels, sanitize PII, presets.

## Replicar para un cliente nuevo

1. Copiar `config/mission-control/profiles/_template.tenant.json` → `profiles/<slug>.json`.
2. En código:

```ts
import { createTenantMissionControlProfile } from '@intcloudsysops/mission-control-kit';

const profile = createTenantMissionControlProfile({
  tenantSlug: 'acme',
  productName: 'Acme Mission Control',
  shortName: 'Acme MC',
  basePath: '/admin',
  publicPanelUrl: 'https://acme.example.com',
});
```

3. Montar shell UI en `apps/<slug>` (thin) — dominio (leads, clases, etc.) **solo** en el tenant.
4. Activar por `tenant_slug` / env; no fork permanente del kit.
5. Runbook: [MISSION-CONTROL-TENANT-ROLLOUT.md](../runbooks/MISSION-CONTROL-TENANT-ROLLOUT.md)

## ICSO

- Rutas: `/mission-control/*`
- Profile: `config/mission-control/profiles/icso.json`
- Gate opcional: `ICSO_MC_ACCESS_TOKEN` (cookie `icso_mc_token` o header `x-icso-mc-token`)
- Datos: deals Supabase `intcloudsysops_*` + commercial catalog; **sin** Peskids PII; **sin** MRR ficticio

## Relación con Moon (#922)

Moon puede adoptar el mismo kit (`mode: platform`) en un PR posterior; hoy Moon y el kit conviven sin bloquearse.

## Streaming status (PC-gamer) — primer incremento

**No es un segundo canal de telemetría.** Reutiliza el camino ya existente
de worker-health: PC-gamer heartbeat (Redis) → `/api/admin/compute-workers`
→ `buildComputeWorkerSnapshot` → `buildMissionControlSnapshotV1` →
`apps/admin/components/ComputeWorkersPanel.tsx` ("PC GAMER" en Moon).

```
PC-gamer (execution plane)                          VPS / Moon (control plane)
OBS WebSocket (ws://127.0.0.1:4455, READ-only)
        │ get_stream_status / get_current_program_scene
        ▼
scripts/ops/creator-obs-adapter.mjs  (ya existía — OBS_READ scope,
  start_stream/stop_stream siguen bloqueados en tools/live-automation/
  dispatch.py, sin cambios)
        │
        ▼
scripts/ops/pc-gamer-heartbeat-payload.mjs
  + bloque opcional `streaming: { live, platforms, uptimeSec, sceneName }`
        │ Redis SET opsly:worker:heartbeat:<WORKER_ID>  (sin credenciales)
        ▼
apps/api/.../compute-workers/route.ts → compute-worker-snapshot.ts
  (sanitiza y SOLO confía en `streaming` si el heartbeat está ONLINE/BUSY;
   un heartbeat stale nunca reporta "live" viejo como verdad actual)
        │
        ▼
apps/admin/lib/mission-control-read-model-v1.ts  (machines[].streaming)
        │
        ▼
apps/admin/components/ComputeWorkersPanel.tsx  — badge LIVE/OFFLINE +
  plataformas + uptime (+ escena, opt-in)
```

### Por qué no es un segundo adaptador OBS

El dispatcher OBS WebSocket ya existía antes de este cambio
(`scripts/opsly-live-obs.sh` → `tools/live-automation/dispatch.py`,
`obsws-python`) con `get_stream_status` ya allowlisted en
`config/pc-gamer-tools.json` (`OBS_READ`). Este incremento solo lo invoca
desde el heartbeat existente; no agrega un cliente OBS nuevo, no agrega una
dependencia nueva, y no toca `start_stream`/`stop_stream`
(permanecen bloqueados por policy — PC-gamer no inicia/detiene streams de
forma remota).

### Decisiones conservadoras (reversibles)

- **Plataformas (Twitch/TikTok/YouTube) son explícitas, no inferidas.**
  OBS WebSocket no expone a qué plataforma(s) transmite (multistream vive
  fuera de OBS). `OPSLY_STREAM_PLATFORMS` (coma-separado) en `.env.worker`
  del nodo; vacío por defecto. Inferir esto es trabajo futuro, no parte de
  este incremento.
- **El nombre de escena está OFF por defecto** (`OPSLY_STREAM_EXPOSE_SCENE`,
  default `false`). El operador pone texto libre en nombres de escena de OBS
  (p. ej. "Airsoft - cam de <nombre>"), y Mission Control es una superficie
  admin compartida. Opt-in explícito por nodo; truncado a 80 caracteres
  cuando se activa.
- **El bloque `streaming` se omite por completo** (no se envía `live: false`
  como mentira) cuando OBS no está corriendo o el WebSocket no responde —
  nunca bloquea ni degrada el resto del heartbeat (GPU/RAM/disco).
- **Nunca se confía en `streaming` de un heartbeat stale.** El snapshot solo
  lo adjunta cuando el worker clasifica ONLINE/BUSY (ver
  `apps/api/lib/compute-worker-snapshot.ts`).
- **Ninguna credencial de streaming cruza al control plane.** La password de
  OBS WebSocket se lee localmente vía `OBS_WEBSOCKET_PASSWORD_FILE` (ya
  existente); el heartbeat solo transporta estado derivado (booleans,
  strings cortos), nunca la password ni tokens de plataforma.

### Env opcionales en el nodo (PC-gamer, `.env.worker`)

| Var | Default | Notas |
| --- | --- | --- |
| `OPSLY_HEARTBEAT_INCLUDE_STREAMING` | `true` | `false` desactiva el probe OBS por completo |
| `OPSLY_STREAM_PLATFORMS` | _(vacío)_ | lista coma-separada, p. ej. `twitch,tiktok` |
| `OPSLY_STREAM_EXPOSE_SCENE` | `false` | opt-in explícito; conservador por defecto |
| `OBS_WEBSOCKET_URL` | `ws://127.0.0.1:4455` | mismo endpoint que `config/pc-gamer-tools.json` |

Fuera de alcance de este incremento (ver
`docs/00-architecture/CONTENT-PIPELINE-CANONICAL.md`): clips, highlights,
publish automático, overlays — eso es Content OS v2, no Mission Control.
