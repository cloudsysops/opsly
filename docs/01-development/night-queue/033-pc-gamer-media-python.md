---
id: pc-gamer-media-python-033
status: pending
owner: cursor-builder
created: 2026-09-11
requires_pr: true
risk: low
autonomy: supervised
---

# Subagent B — Python + FFmpeg Media Runtime

## Role
Temporary media builder role. Reuse existing content queues.

## Goal
Extend scripts/ops/pc-gamer-media-runner.py into the smallest reliable GPU/media runtime.

## Deliver
- ffmpeg/ffprobe capability checks
- GPU probe via nvidia-smi
- deterministic transcode
- thumbnail extraction
- clean JSON result contract
- no fake artifacts
- tests for command planning/error paths

## Later, not now
- Whisper/faster-whisper
- diffusers/ComfyUI
- image/video generation models
- cloud burst
