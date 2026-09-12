---
id: pc-gamer-content-capacity-030
status: pending
owner: platform-builder-agent
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# PC Gamer — Compute + Content Capacity

## Mission

Use the PC Gamer as a private compute worker for Opsly without giving it release authority.

## Scope

- Ollama/local inference
- GPU telemetry
- embeddings
- ffmpeg/video rendering
- image-generation capability routing
- content rendering jobs
- optional OpenClaw compute/node runtime
- Mission Control heartbeat/visibility

## Required controls

- no public Redis/Ollama/agent ports;
- no production DB credentials;
- no release/deploy authority;
- no direct main write;
- no unscoped customer PII;
- unique node identity;
- task/result correlation;
- resource-pressure limits.

## Acceptance

```
PC_GAMER_CAPACITY

WORKER_ID:
GPU:
VRAM:
OLLAMA:
FFMPEG:
EMBEDDINGS:
CONTENT_RENDER:
OPENCLAW:
HEARTBEAT:
MISSION_CONTROL:
NODE_AUTH:
SMOKE:
BLOCKERS:
NEXT:
```
