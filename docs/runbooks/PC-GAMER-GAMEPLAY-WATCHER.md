---
status: active
owner: operations
last_review: 2026-09-09
type: runbook
tags:
  - opsly/content
  - opsly/pc-gamer
---

# PC-gamer — Mauro gameplay watcher

This watcher feeds new NVIDIA ShadowPlay recordings into Content OS v2 using
the `icso-gaming-tbd` channel. It creates a draft project only; it never
publishes automatically.

## Inputs and routing

- `NVIDIA_INSTANT_REPLAY_DIR`: recordings without a confirmed highlight.
  They use audio-peak discovery and remain subject to rights and human review.
- `NVIDIA_HIGHLIGHTS_DIR`: NVIDIA auto-highlight files. They use the pre-cut
  ingest path and still require review.
- `OBS_RECORDINGS_DIR`: optional OBS recordings/replays. They use the pre-cut
  ingest path and remain subject to review.
- `WATCHER_STATE_PATH`: local deduplication state; keep it outside git.

The final channel name, logo, CTA, and audience branding remain TBD. Do not
route gameplay into Bitsitos or any child-directed channel.

## One-time setup on the PC gamer

Verify `ffmpeg` and `ffprobe` are available in WSL, then configure confirmed
Windows folders without committing personal paths or secrets:

```bash
cd ~/opsly
export NVIDIA_INSTANT_REPLAY_DIR="/mnt/c/Users/<mauro-user>/Videos/<InstantReplayFolder>"
export NVIDIA_HIGHLIGHTS_DIR="/mnt/c/Users/<mauro-user>/Videos/<HighlightsFolder>"
export WATCHER_STATE_PATH="$HOME/.local/state/opsly/gameplay-watcher.json"
node scripts/ops/pc-gamer-gameplay-watcher.mjs
```

For a persistent user service, use the existing `devops` user and replace
the placeholders only after confirming the folders with Mauro:

```ini
[Unit]
Description=Opsly PC-gamer gameplay watcher

[Service]
WorkingDirectory=%h/opsly
Environment="NVIDIA_INSTANT_REPLAY_DIR=/mnt/c/Users/REPLACE_ME/Videos/InstantReplay"
Environment="NVIDIA_HIGHLIGHTS_DIR=/mnt/c/Users/REPLACE_ME/Videos/Highlights"
Environment="OBS_RECORDINGS_DIR=/mnt/c/Users/REPLACE_ME/Videos/NVIDIA/OBS"
Environment=WATCHER_STATE_PATH=%h/.local/state/opsly/gameplay-watcher.json
ExecStart=/usr/bin/node scripts/ops/pc-gamer-gameplay-watcher.mjs
Restart=on-failure

[Install]
WantedBy=default.target
```

Save it as `~/.config/systemd/user/opsly-gameplay-watcher.service`, then run:

```bash
systemctl --user daemon-reload
systemctl --user enable --now opsly-gameplay-watcher
systemctl --user status opsly-gameplay-watcher
```

## Approval boundary

Inspect each generated project with `render-plan`, `rights-check`, and the
channel preset. Approve explicitly with the existing Content OS approval
command. The watcher does not send WhatsApp, upload, or publish anything.

## Schedule and safety

The watcher is intentionally lightweight while Mauro plays. If processing
causes contention, pause the service or defer the heavy ingest job according
to `config/pc-gamer-schedule.json`; do not bypass the GPU gate.

## Disk retention

The PC-gamer retention timer is intentionally narrow:

- It runs in dry-run mode unless `--apply` is explicitly supplied.
- The installed timer removes only artifacts for projects marked `archived`
  and older than 30 days, and only when Windows `C:` has less than 150 GB
  free.
- It never removes NVIDIA originals, tenant assets, `human_review` projects,
  approved projects, or production data.
- NVIDIA source deletion requires a separate, explicit retention decision;
  the automatic job does not delete the source master.

Install the local timer after verifying the unit files:

```bash
mkdir -p ~/.config/systemd/user
cp infra/systemd/opsly-pc-gamer-content-retention.service ~/.config/systemd/user/
cp infra/systemd/opsly-pc-gamer-content-retention.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now opsly-pc-gamer-content-retention.timer
```
