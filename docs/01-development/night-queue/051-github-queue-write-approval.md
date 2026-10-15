---
id: github-queue-write-approval-051
status: done
priority: P2
agent: local_claude
owner: platform
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
workstream: github-queue-write-approval
conflict_key: github-queue-write-approval
semantic_scope: github-queue-write-approval/051
requires_pr: true
requires_approval: true
paid_infra_required: false
production_deploy: false
autonomy: supervised
estimated_minutes: 45
resource_class: medium
node_types: mac
architecture_patterns: AgentTaskEnvelopeV1, explicit approval, governed dispatch
---

# GitHub Agent Queue Write Approval Propagation

## Goal

Design and implement a first-class approval chain for future write-capable GitHub Agent Queue work without weakening AgentTask policy.

## Unhold evidence (050 GREEN)

Hard boundary satisfied — read-only GitHub → Gamer E2E is green:

| Field | Value |
| --- | --- |
| 050 | completed |
| GHA run | `38166358478` |
| marker | `GAMER_OPENCODE_OK` |
| worker | `home-gpu-01` |
| model | `ollama/qwen3.5:latest` |
| PR #1709 | OPEN (not merged); head `e43e2bc8f57d5ea2002e3de82d5a5c4d78ffc824` |

Previous status: `held` → `pending` → **`done`** via PR **#1710** (squash merge `802f2ef1d` on `main`, 2026-10-15).

### Runtime activation (human)

| Secret / flag | Notes |
| --- | --- |
| `OPSLY_WRITE_APPROVER_TOKEN` | **Required for mint.** Must be distinct from `PLATFORM_ADMIN_TOKEN`. |
| `PLATFORM_ADMIN_TOKEN` | Dispatch / consume ops only — **cannot mint**. |
| `OPSLY_GITHUB_AGENT_TYPED_WRITE=true` | Submitter propagates pre-minted approval only. |
| `OPSLY_GITHUB_AGENT_WRITE_APPROVAL_ID` | Pre-minted `approval_id` (never auto-minted by submitter). |

Binding also includes `task_content_sha256` + `selected_agent` (exact prompt + runtime).

## Context

The canonical GitHub Agent Queue remains fail-closed for writes until this typed approval chain exists and is validated. Do **not** treat `x-autonomy-approved`, DispatchClaimV1, or sandbox Approval Gate as substitutes.

## Required design

A write-capable task must prove all of the following:

1. the tracked workpack explicitly declares write intent;
2. a trusted approval event exists and is bound to the exact task/request identity;
3. approval is carried into or referenced by AgentTaskEnvelopeV1 through a typed contract;
4. AgentTaskRuntime validates that approval before allowing `write_allowed=true`;
5. approval cannot be inferred only from an HTTP header;
6. approval cannot be reused for a different request/workpack/SHA;
7. audit evidence records approver/source/time without exposing secrets;
8. read-only tasks remain approval-free;
9. paid infra and production deploy remain separate explicit gates.

## Acceptance

- threat model documented;
- typed approval contract;
- tests for approved write, missing approval, stale/replayed approval, mismatched SHA/request and read-only execution;
- no global `autoApproveSensitive=true`;
- no bypass of AgentTaskRuntime;
- one canonical control plane;
- one PR with migration notes.

## Threat model (brief)

| Threat | Mitigation |
| --- | --- |
| Caller self-asserts `approved=true` / header-only | Runtime ignores `x-autonomy-approved` for `write_allowed`; requires server-minted `AgentTaskWriteApprovalV1` |
| Replay across jobs | Consume-once in Redis (`opsly:write-approval:v1:*`) |
| Cross-PR / SHA confusion | Exact binding: work_id, request_id, claim_id, workstream, conflict_key, repository, pr_number, pr_branch, pr_head_sha (40-char), write_allowed=true; fingerprint = canonical JSON SHA-256 |
| Confusing claim with approval | DispatchClaimV1 remains independent; approval binding must match server-acquired `claimId`/`taskId`/`workstream` before consume |
| Write approval skips other gates | Typed approval satisfies only write; network/browser/infra still `require_approval` |
| Dry-run burns one-shot approval | `dry_run` returns before consume |
| Caller-controlled `approved_by` | Mint requires `OPSLY_WRITE_APPROVER_TOKEN`; sets `approved_by=write-approver` (caller label → audit `requested_by` only) |
| Unbounded TTL | Caller `expires_at` rejected above 24h max |
| Sandbox Approval Gate confusion | Separate namespace/API; not reused |
| Global `autoApproveSensitive` | Forced off when `write_allowed=true` |

## Canonical API

`POST /api/local/agent-task-write-approval` with `action: mint | consume`.
- **Mint:** Bearer `OPSLY_WRITE_APPROVER_TOKEN` (must ≠ `PLATFORM_ADMIN_TOKEN`); `approved_by=write-approver`.
- **Consume (HTTP ops):** write-approver **or** platform-admin. Runtime consume uses the Redis store under the task AbortController.

Envelope carries `metadata.write_approval_ref = { schema_version, approval_id }` plus binding fields; runtime consumes under the task AbortController after dry-run / non-write gates.

### GitHub queue submitter (typed write)

Read-only by default. Typed write only when `OPSLY_GITHUB_AGENT_TYPED_WRITE=true` **and** the workpack has `requires_pr=true` + `requires_approval=true`, with:

- `OPSLY_GITHUB_AGENT_WRITE_APPROVAL_ID` — **pre-minted** approval (never auto-minted by the submitter)
- `OPSLY_GITHUB_AGENT_WRITE_PR_NUMBER` / `_PR_BRANCH` / `_PR_HEAD_SHA` (+ repository)
- Binding `claim_id` / `request_id` must equal the submit `request_id` (`DispatchClaimV1.claimId === requestId`)

## Hard boundaries

- ~~HOLD until the read-only GitHub → Gamer E2E is green.~~ **Satisfied by 050 / run 38166358478.**
- No production deploy.
- No paid resources.
- Do not weaken existing fail-closed policy.
- Do not redispatch #1691 until this workpack is implemented, tested, exact-head reviewed, and merged.
- Reviewer/CWD hardening (`pc-gamer-opencode-plane.sh` overnight cwd, independent-review plan agent) is a **separate follow-up**, not part of this PR.
