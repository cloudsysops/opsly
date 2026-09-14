# Opsly Top CLI

`Opsly Top` is the terminal cockpit for machine capacity, agent/runtime state and queue pressure.

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
- current work id / blocker.

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
- `/api/admin/mission-control/factory-workstreams` when available.

If a source is unavailable, the CLI reports the source as degraded and keeps missing values `UNKNOWN`. It must never fabricate zero utilization or a healthy state.

## Security

- `PLATFORM_ADMIN_TOKEN` stays in the environment / Doppler;
- the token is only sent as an Authorization bearer header;
- it is never included in the snapshot or terminal output;
- no secrets are hardcoded;
- all endpoints used are read-only;
- no deploy, merge, queue mutation, Peskids mutation, n8n side effects, DNS/routing, migration or production-data mutation.

## Current metric boundary

Machine-level CPU/RAM/GPU/VRAM/temperature is real where the worker heartbeat or runtime node reports it.

Agent-level CPU/RAM per process is **not inferred** from queue or session counts. A later extension can add cAdvisor/process-level attribution and feed it into the same `OpslyTopSnapshotV1` contract.
