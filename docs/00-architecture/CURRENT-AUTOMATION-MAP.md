---
status: accepted
owner: claude
last_review: 2026-09-11
type: architecture-note
tags:
  - opsly/agents
  - opsly/agent-lab
  - night-queue-022
---

# Current Automation Map — GitHub task → agent → PR

Audit requested by `docs/01-development/night-queue/022-engineering-control-loop-notifications.md`.
Answers: does a "GitHub task → orchestrator → worker → PR" mechanism already exist?
**Partially.** The execution half exists and is solid. The discovery half (GitHub → local
trigger) has a real, previously-undocumented gap: nothing pulls latest `main` before a
task is dispatched.

## What already exists (verified by reading the code, not assumed)

```
docs/01-development/night-queue/*.md   (git-tracked, this is the GitHub task queue)
        |
        v  [GAP — see below]
.cursor/prompts/queue/*.md             (gitignored, seeded by scripts/ops/dispatch-prompt-queue.sh)
        |
        v  scripts/next-prompt-in-queue.sh (picks first file with `status: pending` in frontmatter)
        v  scripts/ops/dispatch-prompt-queue.sh (starts local OpenCode, opens Terminal)
        v  npm run opsly:local-prompt-watcher:once -> scripts/local-prompt-watcher.ts
        |     - refuses to start without PLATFORM_ADMIN_TOKEN (fails closed) [verified]
        v  POST /api/local/prompt-submit  (apps/orchestrator/src/http/routes/local.ts)
        |     - verifyPlatformAdminToken(): fails closed on empty token [verified, no `|| 'local-dev'`]
        |     - accepts either a raw prompt or a full AgentTaskEnvelopeV1
        |     - idempotency: BullMQ jobId = idempotency_key || request_id (dedup at queue level)
        v  BullMQ `local-agents` queue (apps/orchestrator/src/queue.ts)
        v  LocalAgentHTTPWorker (apps/orchestrator/src/workers/local-agent-http-worker.ts)
        |     - routes local_cursor / local_claude / local_codex / local_opencode / ... by job name
        |     - calls HTTP bridge per config/external-agent-registry.json (ports 5001-5011)
        v  AgentTaskRuntime (apps/orchestrator/src/runtime/agent-task-runtime.ts)
        |     - policy gate (evaluateAgentTaskPolicy), timeout/cancel, typed lifecycle events
        v  ValidationOrchestrator: commit / iterate / escalate decision
        |     - NOTE: `generateCommitMessage()` only returns a string. It does not run
        |       git commit, does not push, does not open a PR. Branch/commit/push/PR
        |       creation happens only if the invoked CLI agent (Cursor/Claude/Codex) does
        |       it itself while executing the prompt it was given.
        v  [the agent, if instructed, creates branch -> commits -> pushes -> opens PR]
```

Everything from `local-prompt-watcher.ts` down is real, wired, and fails closed on auth.
**This confirms doc 022's premise: do not build a second orchestrator.** Extend this path.

## The actual gap (not what was assumed)

Searched for `git pull` / `git fetch` anywhere between "task pushed to GitHub" and
"task seeded into the local queue": **none existed** in
`scripts/ops/dispatch-prompt-queue.sh`, `scripts/ops/install-night-agent-launchd.sh`,
or `scripts/next-prompt-in-queue.sh`.

Consequence: `dispatch-prompt-queue.sh` seeds `.cursor/prompts/queue/` from whatever
`docs/01-development/night-queue/*.md` happens to already be on disk on the machine
running the LaunchAgent (a Mac, per `scripts/ops/install-night-agent-launchd.sh` — see
"Machine roles" below). A task pushed to GitHub is invisible to that machine until
something runs `git pull` there. Today that "something" is a human.

**Fix applied in this PR** (`scripts/ops/dispatch-prompt-queue.sh`): a fast-forward-only
`git pull` before seeding, skipped safely (never blocking, never destructive) when the
tree is dirty, HEAD is detached, or the remote is unreachable. This is the smallest safe
bridge named in the task: it does not add a webhook, a new queue, or a new orchestrator —
it closes the one missing step in the existing chain.

**Trust gate added (per independent review):** the sync/dispatch is only allowed when the
checked-out branch equals a trusted branch (`main` by default, overridable via
`NIGHT_QUEUE_TRUSTED_BRANCH`). An automatic execution machine must not treat "whatever
branch happens to be checked out" as an implicitly trusted task source — a feature/local
branch on the dispatching machine must never become an accidental task source. Detached
HEAD and any non-trusted branch both refuse automatic dispatch with a logged reason.
Covered by `scripts/ops/__tests__/dispatch-prompt-queue-trust-gate.test.mjs` (clean
trusted branch, non-trusted branch, detached HEAD, and a custom configured trusted
branch — 5 cases). **CI wiring pending** — see "Known gap" below.

## Machine roles (do not conflate)

Two different physical machines already have two different jobs in this repo; a single
"PC Gamer" cannot currently do both without new wiring:

| Machine | Role | Evidence |
|---|---|---|
| **Mac** | Runs `scripts/ops/install-night-agent-launchd.sh` (LaunchAgent, 10 min) -> `dispatch-prompt-queue.sh` -> opens Terminal + local OpenCode/Cursor/Codex CLI bridges (ports 5001-5011) | `docs/01-development/AGENT-PROMPT-QUEUE.md`, `scripts/ops/install-night-agent-launchd.sh` |
| **PC-Gamer** | GPU compute worker: Ollama, ffmpeg, video render — routed via `scripts/ops/compute-worker-router.mjs` + `config/compute-workers.json`, respecting `config/pc-gamer-schedule.json` (Mauro's gaming windows) | `config/compute-workers.json` (`workerId: pc-gamer-openclaw-01`), `scripts/ops/pc-gamer-*.sh` |

Cursor/Claude/Codex CLI HTTP bridges (5001-5011) are not currently configured to run on
the PC-Gamer. If the intent is to have Cursor/Claude/Codex execute **on the PC-Gamer**
specifically (not the Mac), that is new wiring, not a reuse of an existing mechanism —
flag as a decision, not something this PR invents.

## GitHub Actions already in the repo (audited, per doc 022's explicit list)

| Workflow | Trigger | Does it enqueue an AgentTask? |
|---|---|---|
| `nightly-fix.yml` | `schedule` (03:00 daily) | No — type-check/lint only, opens GitHub issues on failure |
| `evolution-pipeline.yml` | `workflow_dispatch` | No — runs `tools/cli/main.py pipeline-run --dry-run` in a GitHub-hosted sandbox; does not call the orchestrator or BullMQ |
| `health-check-validation-orchestrator.yml` | `schedule` (*/5 min) | No — a *different* "ValidationOrchestrator" health probe (GET `/internal/meta-optimizer/metrics` only) with Discord alerts, unrelated to AgentTask |
| `qa-issue-notify.yml` | `issues: [opened, labeled]` | No — Discord notification only, no execution |
| `night-merge.yml`, `production-change-window.yml`, `promote-production-canary.yml` | various | Deploy/merge gates, not task pickup |
| `deploy.yml`, `deploy-peskids.yml`, `deploy-panini-lab.yml`, `peskids-staging.yml`, `setup-peskids-n8n.yml` | `push`/`workflow_run` (post-CI)/`workflow_dispatch` — never `pull_request` | No — join the tailnet via `tailscale/github-action@v4` (through `.github/actions/tailscale-connect`) but only to SSH `docker compose` deploy against the VPS; never call `/api/local/*` |

**Correction (verified by independent review):** an earlier version of this doc claimed
no `tailscale/github-action` usage exists anywhere in `.github/workflows/`. That was
wrong — it's used by the five deploy workflows listed above. The corrected finding:

**No GitHub Actions workflow in this repo currently calls the orchestrator's `/api/local/*`
routes**, even though the building blocks to do so already exist separately: the deploy
workflows already join the tailnet (`TAILSCALE_AUTHKEY` secret, already in production use)
and `cleanup-demos.yml` already uses a `PLATFORM_ADMIN_TOKEN` GitHub secret — but only
against the public `apps/api` (`NEXT_PUBLIC_APP_URL/api/tenants`), a different surface
than the orchestrator's `:3011` routes. Nothing today combines tailnet access with
`PLATFORM_ADMIN_TOKEN` to reach the orchestrator from CI. Doing so deliberately would
reuse `tailscale-connect` plus a `PLATFORM_ADMIN_TOKEN` secret scoped to the orchestrator
— no new self-hosted runner or new auth mechanism required — but it's still a
security-relevant scope decision (this GitHub-public repo could then enqueue orchestrator
work from a workflow run) that should be made deliberately, not added as a side effect of
this PR.

## Security finding (per doc 021's explicit ask)

`scripts/local-agent-watcher.ts` (deprecated) contained:

```ts
this.orchestratorToken = options.orchestratorToken || process.env.PLATFORM_ADMIN_TOKEN || 'local-dev';
```

Verified: no active caller (`grep` across `*.json`, `*.yml`, `*.sh`, `*.plist` finds only
`scripts/_archived/run-local-agent-system.sh`, itself archived). Not currently reachable
in production. **Fixed in this PR**: the fallback now throws instead of silently defaulting
to the literal string `local-dev`, matching the fail-closed pattern already proven in the
maintained `scripts/local-prompt-watcher.ts`.

Whether any deployed environment's `PLATFORM_ADMIN_TOKEN` was ever literally set to
`local-dev` cannot be verified from this environment (no Doppler/prod access from here) —
marked **UNKNOWN**, not "safe."

## Task locking / dedup / retries — what's real today

- **Dedup**: BullMQ `jobId = idempotency_key || request_id` — adding a job with an
  existing `jobId` is a no-op while that job is active/waiting. Real, verified in
  `apps/orchestrator/src/queue.ts`.
- **Retries**: `attempts: 2`, exponential backoff (`delay: 2000`). Real, same file.
- **Runtime status/cancel/timeout**: `AgentTaskRuntime` — real, typed lifecycle events
  (`task_started`, `task_completed`, `task_failed`, `task_cancelled`, `task_timed_out`,
  `task_approval_required`).
- **Claim before dispatch**: **does not exist.** `next-prompt-in-queue.sh` reads
  `status: pending` from a file's frontmatter with no atomic claim/lock — two concurrent
  runs of `dispatch-prompt-queue.sh` could pick the same file. Low practical risk today
  (single LaunchAgent, single Mac) but not enforced. Not fixed in this PR — flagged as a
  gap, not fabricated as solved.
- **GitHub-visible task state**: the tracked `docs/01-development/night-queue/*.md`
  frontmatter `status:` field is never written back to by any script in this repo. State
  changes (`pending` -> `done`) are manual edits today. ChatGPT/an operator watching
  GitHub cannot currently see "claimed"/"running" state without a human updating the file.

## Known gap: trust-gate test not yet wired into ci.yml

`npm run test:dispatch-prompt-queue` exists and passes locally (5/5), but is **not**
yet a step in `.github/workflows/ci.yml`. The credential available to the agent that
built this PR lacks the GitHub `workflow` OAuth scope required to modify files under
`.github/workflows/` (both `git push` and the GitHub API returned "Insufficient scope:
required workflow"). Someone with that scope needs to add, in the `scripts-check` job
of `ci.yml`, right after the `compute-worker policy tests` step:

```yaml
      - name: dispatch-prompt-queue trust gate tests
        run: node --test scripts/ops/__tests__/dispatch-prompt-queue-trust-gate.test.mjs
```

This is a one-line, additive, non-destructive CI step — no other change needed.

## Answer to the core question

**Does "GitHub task -> orchestrator -> worker -> PR" already exist?**

Yes for the execution half (queue -> worker -> HTTP bridge -> agent -> runtime status).
No for automatic discovery (GitHub push -> local pickup required a human `git pull`,
now fixed) and no for GitHub-visible task-state tracking or task claiming (both real
gaps, not fixed here — sized beyond "smallest safe bridge").

## Related

- `docs/01-development/night-queue/021-agent-security-usage-mission-control.md`
- `docs/01-development/night-queue/022-engineering-control-loop-notifications.md`
- `docs/01-development/AGENT-PROMPT-QUEUE.md`
- [[ADR-048-agent-task-store]]
- `docs/00-architecture/AGENT-LAB-CAPABILITY-OWNERSHIP.md`
