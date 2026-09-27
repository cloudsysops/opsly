# Compute Worker Onboarding

Canonical onboarding for a physical NVIDIA worker. The VPS remains the control plane. This runbook generalizes the proven PC Gamer plane; it does not create a second queue, registry, orchestrator, or state store.

## Preconditions (Windows gaming PC)

1. Windows NVIDIA driver installed and current.
2. WSL2 Ubuntu installed.
3. In WSL, `nvidia-smi` must show the physical GPU and VRAM.
4. Docker must be reachable from WSL.
5. NVIDIA Container Toolkit must make `docker run --gpus all ... nvidia-smi` succeed.
6. Tailscale/private connectivity and `.env.worker` use the existing approved secret flow. Never commit worker credentials.
7. Clone Opsly and sync `main`.

## Node roster and identity (do this first)

Choose the `WORKER_ID` from the canonical table in [`PC-GAMER-WORKER.md`](../04-infrastructure/PC-GAMER-WORKER.md#nodos-gamer-e-identidad-de-worker) and confirm it matches the `workerId` in [`config/compute-workers.json`](../../config/compute-workers.json). The heartbeat key is `opsly:worker:heartbeat:${WORKER_ID}`, so **reusing another node's ID makes two machines overwrite each other's presence sign** — the scheduler then routes by the wrong hardware. `check-pc-gamer-online.sh` and `pc-gamer-heartbeat.sh` fail closed when `WORKER_ID` is unset; they no longer default to a shared ID.

## Offline node bootstrap (Windows + WSL2)

For each powered-off node (`desktop-smdqcia-1`, `pc-gamer`, `pc-gamer-openclaw-01-wsl`):

1. On Windows: install/update the NVIDIA driver, then `wsl --install -d Ubuntu` (reboot). In WSL, `nvidia-smi` must list the physical GPU and VRAM.
2. Docker reachable from WSL; NVIDIA Container Toolkit makes `docker run --gpus all nvidia/nccl-tests` (or any CUDA image) succeed.
3. Join Tailscale on the node and confirm it appears `active` in `tailscale status` from the control host.
4. `git clone` Opsly (or `git pull --ff-only origin main`), then `cp infra/pc-gamer.env.example .env.worker` and replace `WORKER_ID=@WORKER_ID@` with the unique roster ID. Set the real `REDIS_URL` through the existing secret flow.
5. Run the doctor, then bootstrap — both fail closed if GPU/Docker evidence or identity is missing. `OPSLY_WORKER_ID` is the bootstrap CLI input; the persistent runtime/heartbeat identity remains `WORKER_ID` in `.env.worker`. Use the same value for both:

   ```bash
   OPSLY_WORKER_ID=<node-worker-id> ./scripts/setup-compute-worker.sh --doctor
   OPSLY_WORKER_ID=<node-worker-id> ./scripts/setup-compute-worker.sh --ensure
   ```

6. From the control host, verify the node is actually publishing presence (not a registry snapshot):

   ```bash
   WORKER_ID=<node-worker-id> bash scripts/ops/check-pc-gamer-online.sh --json
   # {"worker_id":"…","online":true,…,"heartbeat":true}  → Redis key fresh (TTL 180 s)
   ```

   `lastHeartbeat` is null in `node scripts/ops/compute-worker-router.mjs --status` by design — that CLI reads only `config/compute-workers.json`, never Redis.

## One doctor

```bash
OPSLY_WORKER_ID=home-gpu-01 \
OPSLY_WORKER_CLASS=controlled \
./scripts/setup-compute-worker.sh --doctor
```

The doctor discovers GPU model and VRAM at runtime. Never register a seller-advertised GPU as fact. It fails closed if host or Docker GPU evidence is absent.

## Bootstrap

```bash
OPSLY_WORKER_ID=home-gpu-01 \
OPSLY_WORKER_CLASS=controlled \
./scripts/setup-compute-worker.sh --ensure
```

This delegates to the existing idempotent PC Gamer worker plane for Ollama + worker startup. It deliberately does not pull a model implicitly.

Worker classes:
- `opportunistic`: may disappear at any time; never a dependency for critical work.
- `controlled`: owner-controlled compute; preferred for long-running local jobs when online.
- `always_on`: infrastructure intended to remain continuously available.

## Runtime acceptance gate

Bootstrap success is **not** READY. Scheduler eligibility requires runtime evidence:

- fresh canonical heartbeat;
- actual GPU/VRAM telemetry;
- Ollama model with non-zero VRAM residency;
- canonical BullMQ task consumed and completed;
- evidence record emitted;
- Mission Control reflects real ONLINE/OFFLINE state;
- reboot/autostart recovery proven;
- shutdown causes no task loss: work remains/re-enters QUEUED for another eligible worker.

## Tomorrow: home node

Use a neutral ID such as `home-gpu-01` until runtime discovery is complete. Do not encode `3060`, `12gb`, or other hardware claims in identity. Hardware can be upgraded while worker identity remains stable.

## Safety

Compute workers receive no production database, Supabase primary state, unscoped admin credentials, customer PII, financial-operation authority, or release authority. Peskids production is outside this onboarding path.
