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
