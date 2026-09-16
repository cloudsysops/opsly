---
name: opsly-gaming-clip-tools
description: >
  Third-party gameplay-clipping/auto-highlight software landscape
  (Medal.tv, Overwolf/Outplayed, NVIDIA ShadowPlay) evaluated for the
  Mauro gaming-content workflow — what's installed where, and why the
  canonical pipeline stays in Content OS instead of a third-party app.
status: active
owner: operations
last_review: 2026-09-16
type: reference-doc
tags:
  - opsly/content
  - opsly/pc-gamer
  - opsly/reference
---

# Gaming Clip Tools — Reference

> **Triggers:** `medal.tv`, `medal`, `overwolf`, `outplayed`, `auto-clip`,
> `auto highlight`, `gaming clip software`, `clip tool`, `shadowplay`
> **Priority:** MEDIUM
> **Canonical pipeline owner:** [[opsly-content-studio]] — read that skill
> first. This doc is about *evaluating external tools*, not building or
> replacing the pipeline.

## Duplication guard (obligatorio)

This skill does **not** define a new content pipeline. The real one is
`opsly-content-studio` (`ingest → session → highlights → render → rights
→ human approve → publish gate`). Nothing here should route around it.
If a task wants to "just use Medal.tv/Overwolf instead," stop and confirm
that's actually the intent — see trade-off below.

## The three options evaluated (2026-09-16)

| Tool | What it does | Publishes automatically? | Fits our approval gate? |
| --- | --- | --- | --- |
| **NVIDIA ShadowPlay** (Instant Replay) | Driver-level rolling-buffer capture, per-game subfolder output (`Videos\NVIDIA\<Game>\*.mp4`, `.DVR.mp4` = instant replay) | No — just writes local files | Yes — this is what `pc-gamer-gameplay-watcher.mjs` watches |
| **Medal.tv** | Auto-detects highlights (kills, wins) per game, records, edits, can auto-post to TikTok/YouTube Shorts | Yes, by default, to its own connected accounts | No — bypasses Content OS review entirely unless deliberately left unconfigured |
| **Overwolf / Outplayed** | In-game overlay platform; Outplayed is its clip-detection app | Yes, similar auto-post option | No, same reason |

**Decision (2026-09-16, explicit user call):** keep auto-publish **off**
everywhere. The `icso-gaming-tbd` channel has no decided brand yet
(`config/content-channels/icso-gaming-tbd.json`: `"logo": null`,
`"intro": "TBD — placeholder, brand not decided"`) and gameplay audio may
include other players' voice chat without their consent to publish. Any
of these tools' native auto-post feature must stay disabled/unconfigured
until that's resolved — that's a brand/consent decision, not a technical
one.

## What's actually installed where (live findings)

- **pc-gamer-openclaw-01 (Mauro):**
  - ShadowPlay Instant Replay: **active**, already producing real
    recordings under `Videos\NVIDIA\<Game>\`.
  - Overwolf + Outplayed: **installed**, `Videos\Overwolf\Outplayed\`
    exists with an empty `temp-capture` folder and no recent activity
    (last write Aug 2026) — tried once, not in active use.
  - Medal.tv: installer placed at `C:\Users\PC MAURO\Downloads\MedalSetup.exe`
    (2026-09-16) — needs Mauro to run it under his own Windows session; a
    silent install run over SSH lands under the SSH account's profile
    instead (Electron apps install per-user, not machine-wide), so it's
    not usable from a different Windows account.
- **home-gpu-01 (desktop-smdqcia):** Medal.tv installer downloaded
  2026-09-16, install pending — machine was offline when attempted.
  Whether this machine needs gameplay-clip tooling at all depends on
  whether anyone actually games on it (open question as of this write-up).

## Why the canonical pipeline stays ShadowPlay + Content OS, not a third-party app

1. **Approval gate.** `pc-gamer-clip-agent.py` hardcodes
   `OPSLY_CONTENT_PUBLISHING=disabled` and every result carries
   `approval_required: true`. Medal/Outplayed's native flow assumes you
   *want* fast auto-post — fighting that default on every install is
   more fragile than just not routing content through them.
2. **Brand ownership.** Content OS renders through our own channel preset
   (`config/content-channels/icso-gaming-tbd.json` — subtitle style, safe
   area, transitions). A third-party app's auto-edit output doesn't go
   through that at all.
3. **Already working.** `opsly-gameplay-watcher.service` (systemd --user,
   runs headless in WSL2, no interactive Windows session needed) + the
   ShadowPlay per-game folder scan is live on pc-gamer-openclaw-01 as of
   this write-up, producing real Content OS draft projects from real
   gameplay. Adding a second, differently-shaped detection tool on top
   is redundant, not additive.

## If a future task wants tool-native auto-post

That's a real, separate decision (see Decision above) — treat it as
"connect Medal.tv/Outplayed's publish integration," not "replace the
pipeline." Revisit only after `icso-gaming-tbd`'s brand/name/logo is
decided and there's a voice-chat consent answer for other players
appearing in someone's clips.
