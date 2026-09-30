---
status: live
owner: operations
last_review: 2026-09-30
tags:
  - opsly/brain
  - sessions
---

# Session: first `gaming-streamer` tenant (OpsAfterDark) + PR backlog coordination

```yaml
work_id: opsafterdark-tenant-2026-09-30
request_id: session_014QwFFPPAqJNzQK8kHQnK9b
agent: Claude Code (Sonnet 5)
attempt: 1
objective: Stand up the first gaming-streamer vertical tenant (OpsAfterDark) with a shared, config-driven OBS/stream engine; then audit the open-PR backlog for coordination gaps after discovering unplanned duplicate work.
issue: null
pr: 1681, 1682
branch: feat/opsafterdark-tenant, docs/pr-backlog-streaming-overlap-2026-09-30
head_sha: null
terminal_state: ready_to_merge
evidence_ids:
  - manual npm ci --ignore-scripts exit 0 (Node v20.18.1, matching CI)
  - manual replication of AGENTS.md "Servicios documentados" check, passing
  - CI green on PR #1681 for all 4 branch-protection-required checks (lint, build, secret-scan, production-change-window)
durable_knowledge_changed: true
documentation_refs:
  - docs/01-development/ADDING-WORKSPACE-PACKAGES.md
  - packages/stream-ops-kit/README.md
  - apps/opsafterdark/stream-overlay/README.md
```

## Changed surface

- New: `config/vertical-blueprints/gaming-streamer.json`, `clients/opsafterdark.launch.json`, `apps/opsafterdark/`, `packages/stream-ops-kit/` (generic OBS/stream engine, config-driven per tenant via `STREAM_KIT_DATA_DIR` + `stream.config.json`).
- Root `AGENTS.md`: added `apps/opsafterdark` row to the local-services table.
- Root `package-lock.json`: added the two new workspace-package entries (hand-verified minimal diff, see below).
- New doc: `docs/ops/pr-backlog-streaming-overlap-2026-09-30.md` (PR #1682) — audit of all 40 open PRs, critical-path merge order for streaming, detected file-level overlaps.

## Decisions / discoveries

1. **The streaming host is already a registered compute worker.** `desktop-smdqcia` / `pc-gamer` (`home-gpu-01`, RTX 3060) is already in `config/compute-workers.json` and documented in `docs/04-infrastructure/PC-GAMER-WORKER.md` — it lends GPU jobs to the platform. This tenant's engine now reuses `scripts/ops/creator-system-telemetry.mjs` (`collectNvidiaTelemetry`) instead of a second `nvidia-smi` reader, per `AGENTS.md`'s "never create a second worker registry" rule.
2. **Real duplicate work found via the open-PR backlog, not via any coordination channel.** PR #1677 (Twitch Helix agent, Python, with OAuth refresh) and PR #1680 (BF6 focus-driven OBS scene automation, PowerShell) were opened independently within ~24-36h of this session, covering the same ground as this PR's original `vod-policy.mjs`/`twitch-eventsub.mjs`/`scene-rotator.mjs`. Removed the duplicates from this PR after user confirmation; #1677/#1680 are canonical for those concerns. See PR #1682 for the full backlog map and why this happened (no shared "who's working on what" surface — only discoverable by manually diffing open PRs).
3. **`workspace:*` + `npm ci` + Node-version drift are three separate, non-obvious CI failure modes** when adding a new workspace package. Full writeup promoted to `docs/01-development/ADDING-WORKSPACE-PACKAGES.md` so the next agent doesn't rediscover this from scratch.
4. **This session's own local artifacts were invisible to other agents by default** (a Mac session, `opsly-fe`, and several cloud sessions were active concurrently). Video clips produced locally were never pushed anywhere; a peer session closed mid-session without a handoff. This note exists specifically because of that gap — see Brain promotions below.

## Validation and evidence

- `npm ci --ignore-scripts` under Node v20.18.1 (matching `ci.yml`'s pinned version) against the hand-patched `package-lock.json`: exit 0, 2107 packages installed.
- Local replication of the `AGENTS.md` "Servicios documentados" check script: passes for all `apps/*`.
- PR #1681 CI: all 4 branch-protection-required checks (`lint`, `build`, `secret-scan`, `production-change-window`) green as of this note. Non-required failures remaining (`npm audit` — pre-existing `undici`/`jsdom` advisory unrelated to this PR; `independent-review`, `opsly-independent-review`, `open-source-review` — pre-existing agent-queue/evaluator infrastructure failures, not caused by this change).
- `obs-connection.mjs`'s obs-websocket v5 auth algorithm checked against the bug PR #1676 fixes in the Python `ai-dj` client — this repo's Node implementation already does the correct two-step SHA256-then-base64 flow.

## Risks / blockers

- Video clips produced this session (14 vertical clips, `apps/opsafterdark/stream-overlay/clips/2026-09-30/`) are local-only on the streaming machine's disk — not committed (binary, not code) and not shared to any machine another agent could reach. No action taken pending an owner decision on a shared content location (`runtime/content-os`? Tailscale share? left open).
- `npm audit` failure (`undici`/`jsdom`, moderate+high) is pre-existing and out of scope for this PR — not fixed here, flagged only.
- Twitch API credentials (Doppler) and the exact contract for the Twitch agent's `/health` `/actions` `/execute` HTTP interface (PR #1677) were not verified end-to-end this session — this tenant's engine currently exposes a generic `/alerts/push` local endpoint for any tool to push real alerts into, but no live integration test was run against #1677.

## Next step

- Merge PR #1681 (all required checks green) and PR #1682 (docs-only, informational) when a human reviews.
- Follow the merge order documented in PR #1682 for the rest of the streaming critical path (#1679 → #1678 → #1676 → #1680 → #1677 → #1681 → #1604/#1616/#1146/#1211).
- Decide where session-local media artifacts (clips, recordings) should land so other agents/sessions can find them — not resolved in this session.

## Brain promotions

- `docs/01-development/ADDING-WORKSPACE-PACKAGES.md` (new) — the npm workspace/lockfile/AGENTS.md gotchas.
- `packages/stream-ops-kit/README.md` — documents the relationship to the `pc-gamer` worker (no duplicate telemetry/registry).
- `docs/ops/pr-backlog-streaming-overlap-2026-09-30.md` (PR #1682) — cross-PR coordination map; the direct answer to "how do we stop agents from duplicating each other's work."

## Related

- [[brain/README|Opsly Brain]]
- [[brain/agents/README|Agents MOC]]
- [[01-development/ADDING-WORKSPACE-PACKAGES|Adding Workspace Packages]]
- PR #1681, PR #1682
