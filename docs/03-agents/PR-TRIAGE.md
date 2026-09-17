# Mission Control PR triage

This lane makes the active PR queue readable without giving automation merge or
production authority.

## Visual contract

| Label | Meaning |
| --- | --- |
| `priority:P0` | Critical path. Maximum 3 open PRs. Human-owned. |
| `priority:P1` | Next-important work. Maximum 7 open PRs. Human-owned. |
| `state:ready` | Non-draft PR whose observed real checks are terminal-green. |
| `state:needs-fix` | At least one non-governance check is failing. |
| `agent:working` | PR Doctor dispatched a repair for the current head SHA. |
| `state:waiting-human` | Explicit human decision/approval is required. Manual. |
| `stack:blocked` | Explicit dependency/stack boundary. Manual. |
| `state:superseded` | Replaced by a newer PR; cleanup candidate. Manual. |
| `night-merge` | Existing governed overnight merge lane. |

Priority is intentionally not inferred from code paths. P0/P1 remains a human
portfolio decision. State labels are reconciled by
`scripts/ci/pr-triage.mjs`.

## WIP budgets

- P0: at most 3 open PRs.
- P1: at most 7 open PRs.

The triage workflow emits a GitHub Actions warning if either budget is exceeded;
it does not merge, close, deploy, delete branches, or bypass checks.

## State transitions

```text
new/synchronized head
        |
        v
  checks pending  --------> no managed state label
        |
        +--- failure -----> state:needs-fix
        |                     |
        |             PR Doctor current-head marker
        |                     |
        |                     +--> agent:working
        |
        +--- green --------> state:ready
```

Draft PRs have managed state labels cleared. Manual dependency/governance labels
are preserved.

## Safety

The workflow checks out trusted `main`, never PR-head code under
`pull_request_target`, and has no merge/deploy/secret/data mutation path.
