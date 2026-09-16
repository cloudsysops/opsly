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

## Observed machine state (not acceptance evidence)

These are session observations from 2026-09-16, not a claim that the full
runtime loop is already accepted. Durable watcher evidence is tracked in
PR #1611 and the real-play acceptance run is tracked in issue #1619.

- **pc-gamer-openclaw-01 (Mauro):**
  - ShadowPlay Instant Replay was observed producing recordings under
    `Videos\NVIDIA\<Game>\`; PR #1611 owns the scanner/runtime evidence.
  - Overwolf + Outplayed were observed installed, with
    `Videos\Overwolf\Outplayed\` present but no recent active capture
    evidence beyond older files.
  - Medal.tv installer was observed at
    `C:\Users\PC MAURO\Downloads\MedalSetup.exe`. Installation under
    Mauro's own interactive Windows profile and auto-publish=OFF are still
    acceptance items in #1619.
- **home-gpu-01 (desktop-smdqcia):** a Medal installer download was observed,
  but installation/use is not part of the current gameplay acceptance path.

Do not infer `LIVE`, `INSTALLED`, or end-to-end success from these notes
without the linked runtime evidence.

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
3. **Existing canonical path.** `opsly-gameplay-watcher.service` +
   ShadowPlay is the path under test; PR #1611 contains scanner/service
   evidence. The full `new real gameplay → watcher → Content OS draft →
   human review` loop is **not accepted yet** and must be proven in #1619.
   Adding a second independently-owned publishing pipeline remains redundant.

## If a future task wants tool-native auto-post

That's a real, separate decision (see Decision above) — treat it as
"connect Medal.tv/Outplayed's publish integration," not "replace the
pipeline." Revisit only after `icso-gaming-tbd`'s brand/name/logo is
decided and there's a voice-chat consent answer for other players
appearing in someone's clips.
