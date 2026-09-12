---
status: canon
owner: platform
last_review: 2026-09-11
type: infrastructure
---

# Opsly Node Tooling Matrix

Opsly uses one monorepo and assigns capabilities by node. Installing a tool does not grant authority.

## Mac — engineering

Required: Git, GitHub CLI, Node/npm, Python, Tailscale, Doppler.

External runtimes may include Claude Code, Codex, Cursor, OpenCode, Hermes, Goose and Playwright. They remain behind Opsly AgentTask/policy boundaries. Do not run a second orchestrator.

## PC Gamer — compute

Required runtime surface:

- Node/npm for BullMQ/Opsly worker integration
- Python for media/AI adapters
- FFmpeg/FFprobe
- NVIDIA driver and nvidia-smi
- Ollama for local inference
- Tailscale
- Doppler
- Opsly monorepo

Phase 2, only when a workload justifies it:

- faster-whisper
- PyTorch
- transformers
- OpenCV
- ComfyUI

The Gamer is replaceable compute. It has no production database credentials, release authority or public Redis/Ollama ingress.

## VPS — control plane

Required: Docker/Compose, Traefik via existing platform compose, Redis/BullMQ, Opsly services, Tailscale, Doppler, AWS CLI for current backup path.

Do not install write-capable external agents, local GPU workloads, content rendering or arbitrary-shell workers on the VPS.

## External repositories

The only external agent source repositories approved for the reviewed bootstrap are:

- NousResearch/Hermes-Agent
- openclaw/openclaw
- anomalyco/opencode
- aaif-goose/goose

They are not cloned manually from default branches. Use the reviewed, pinned upstream manifest/installer once its PR is merged. Claude, Codex and Cursor are external CLIs/binaries, not source repositories Opsly modifies.

## Validation

```bash
./scripts/ops/node-capability-doctor.sh --role mac
./scripts/ops/node-capability-doctor.sh --role gamer --strict
./scripts/ops/node-capability-doctor.sh --role vps --strict
```

The doctor reports capabilities only. It does not prove Opsly node authorization; Node Auth and capability policy remain separate controls.
