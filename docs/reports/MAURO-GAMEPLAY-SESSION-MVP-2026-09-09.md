---
status: evidence
owner: content
last_review: 2026-09-09
---

# Mauro gameplay session MVP — evidence 2026-09-09

Stacked on #1155 (`feat/content-gaming-channel-config`). Does not publish. Does not touch Peskids prod.

## Path proven

`generatePeakedGameplayFixture` (19s, three loud bursts) → `prepareGameplaySession` (`tenant=icso-gaming-tbd`) → audio-peak discovery → heuristic score → top-N quality floor (`MIN_PRIMARY_SCORE=35`, max 5) → 9:16 render → rights + QA advisory → `approval.state=ready_for_review` / `project.status=human_review` → artifact bundle.

Human `approve` then writes a `publishJobs[]` record with `status=queued`. No adapter call. `OPSLY_CONTENT_AUTO_PUBLISH=true` throws `BLOCKED_AUTO_PUBLISH`.

## What was wired

| Surface | Change |
| --- | --- |
| Content OS | `prepareGameplaySession()` keeps the raw file, fails closed on `NO_QUALITY_CANDIDATES` |
| Watcher | Instant Replay → `prepare-session` via clip-agent |
| Highlights / OBS | still `prepare-highlight` (short precut path from #1155) |
| CLI | `prepare-session`, `reject`; `approve` enqueues publish job record |
| Moon `/moon/creator` | Approve + Reject; shows clip score/reason |
| Channel | `icso-gaming-tbd` only — not Bitsitos |

## Tests run (2026-09-09)

- `npx vitest run` in `lib/content-studio` (highlight-score, publishing, content-os, gameplay-session, gameplay-channel): **39 pass / 0 fail**, including ffmpeg session E2E
- `npx vitest run scripts/ops/__tests__/pc-gamer-gameplay-watcher.test.mjs`: **5 pass**
- `python3 -m unittest scripts/ops/tests/test_pc_gamer_clip_agent.py`: **5 pass**
- `npx tsc --noEmit -p lib/content-studio`: no errors

## Explicit non-goals (still out)

Whisper/transcription, Auto-clipper, Remotion, YOLO/OpenCV, pip/venv, auto-publish, customer YouTube/TikTok upload, Bitsitos kids channel.
