# Opsly Top CLI

`Opsly Top` is the terminal cockpit for machine capacity, Docker/container utilization, agent process usage, runtime state and queue pressure.

## Run

```bash
doppler run --project ops-intcloudsysops --config prd -- npm run opsly:top
```

Useful modes:

```bash
npm run opsly:top
npm run opsly:top:once
npm run opsly:top:json
npm run opsly:top -- --api https://api.op-sly.com --interval 2000
```

Press `q` to exit the live view.

## What it shows

### Machines

- CPU load;
- RAM used / total;
- GPU utilization;
- VRAM used / total;
- GPU temperature;
- active jobs;
- heartbeat age;
- ONLINE / BUSY / DEGRADED / OFFLINE state.

PC Gamer metrics come from the canonical worker heartbeat. The heartbeat remains secret-free.

### Agents

- registered agent identity;
- observed runtime state;
- dispatch eligibility;
- live session state;
- current work id / blocker;
- real process CPU % and RSS memory when the canonical terminal session has a PID;
- UNKNOWN when there is no process evidence.

### Docker / software runtime

- running / total container count;
- container name, image and state;
- CPU %;
- memory usage and memory %;
- network I/O;
- block I/O;
- PID count.

Docker data comes from the existing read-only Docker socket path already used by the Admin API. No Docker mutation is added.

### Queues and ownership

- waiting / active / failed queue counts;
- active DispatchClaim evidence when Mission Control workstreams are available.

## Data sources

Opsly Top does **not** create another monitoring store.

It consumes existing read-only sources:

- `/api/admin/compute-workers`;
- `/api/runtime/nodes/status`;
- `/api/admin/mission-control/orchestrator`;
- `/api/admin/mission-control/execution-sources` when available;
- `/api/admin/mission-control/factory-workstreams` when available;
- `/api/admin/mission-control/agent-resources`;
- `/api/admin/docker/containers`;
- `/api/admin/docker/resources`;
- `/api/admin/overview` (Prometheus host metrics).

If a source is unavailable, the CLI reports the source as degraded and keeps missing values `UNKNOWN`. It must never fabricate zero utilization or a healthy state.

## Security

- `PLATFORM_ADMIN_TOKEN` stays in the environment / Doppler;
- the token is only sent as an Authorization bearer header;
- it is never included in the snapshot or terminal output;
- no secrets are hardcoded;
- all endpoints used are read-only;
- no deploy, merge, queue mutation, Peskids mutation, n8n side effects, DNS/routing, migration or production-data mutation.

## Metric attribution boundary

Machine-level CPU/RAM/GPU/VRAM/temperature is real where the worker heartbeat or runtime node reports it.

Agent CPU/RAM is attributed only when the canonical Orchestrator terminal session exposes a real PID. The Orchestrator reads that PID with `ps`; it does not divide machine load among agents or infer usage from queue counts.

Container CPU/RAM/I/O comes from `docker stats --no-stream`. Missing process/container evidence remains `UNKNOWN`.
