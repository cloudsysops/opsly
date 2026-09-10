---
status: evidence
owner: content
last_review: 2026-09-09
---

# Independent AI review loop — E2E 2026-09-09

## Proven

Fixture: 10s 9:16 clip with **2s leading black + silence**, then gameplay sine.

```
VIDEO v1
  → AI REQUEST_CHANGES (black-/silence- findings with timecodes)
  → repair → VIDEO v2 (parent video-v1, new path, v1 preserved)
  → AI APPROVED*
  → approval.state = ready_for_review
  → aiReview.state = ready_for_human_approval
  → Cristian Approve & Schedule → 5 queued platform jobs (no upload)
```

Tests (ffmpeg required):

- `independent-review-e2e.test.ts`
- `review-policy.test.ts`
- `publishing.test.ts`
- `gameplay-session.test.ts` (prepareGameplaySession now runs the loop)

## Architecture (extends Content OS — no second pipeline)

| Role | Path |
| --- | --- |
| Deterministic QA | `media-qa.ts` + `ffmpeg.ts` probes |
| Reviewer | `review-agent.ts` (`content-os-independent-reviewer`) |
| Optional vision | `review-vision.ts` (gemma3:12b via Ollama when enabled) |
| Optional narrative | `review-narrative.ts` (qwen3:14b when enabled) |
| Policy / scorecard | `review-policy.ts` |
| Repair | `review-repair.ts` (never overwrites versions) |
| Loop | `review-loop.ts` (`MAX_REVIEW_ROUNDS=3`) |
| Distribution | `distribution.ts` (MASTER → YT/TikTok/IG/FB/X packages) |
| Human gate | Moon `/moon/creator` Approve & Schedule + CLI `approve --platforms=` |

## Security

- Reviewer cannot publish (`assertReviewerCannotPublish` / `AUTO_PUBLISH` blocked).
- Publishing credentials stay on VPS control plane.
- `MUSIC_RIGHTS=UNKNOWN` → `publishReady=false`.
- Enqueue creates **records only**; adapters do not upload in this PR.

## Optional local models

```
OPSLY_CONTENT_VISION_ENABLED=true
OPSLY_CONTENT_NARRATIVE_ENABLED=true
OLLAMA_URL=http://127.0.0.1:11434
OPSLY_CONTENT_VISION_MODEL=gemma3:12b
OPSLY_CONTENT_NARRATIVE_MODEL=qwen3:14b
```

Without these, FFmpeg deterministic QA alone drives the proven E2E.

Next hardening (do not start a second board): route vision/narrative through
existing `lib/content-studio/src/llm/client.ts` → LLM Gateway (no direct Ollama
bypass). Do not clone Auto-clipper/OpenCut/Remotion. Do not continue
`feat/content-review-board` — it duplicates this PR.

## Inventory correction (agents)

Inventories run against Mac `docs/mauro-gameplay-pipeline-spec` are **stale**.
That branch lacks #1155/#1158/#1160 code. Canonical code lives in:

| Capability | Where |
| --- | --- |
| Mauro session + gaming channel | #1155 / #1158 |
| Independent review / repair / versions / distribution | **this PR #1160** |
| PC-gamer compose stabilize | #1157 |

Night merge order: #1154 → #1157 → #1155 → #1158 → #1160.
