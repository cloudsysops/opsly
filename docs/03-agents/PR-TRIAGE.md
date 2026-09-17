# Mission Control PR triage

This lane makes the active PR queue readable without giving automation production
authority.

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
| `impact:peskids` | Peskids product/tenant surface. |
| `impact:health-travel` | Health Travel product surface. |
| `impact:games` | Opsly Games / Astral Arena surface. |
| `impact:content` | Content Studio / media tooling. |
| `impact:platform` | Admin, portal, ICSO, Revenue Core or vertical platform surface. |
| `impact:shared-runtime` | Shared orchestrator/agent/worker execution surface. |
| `impact:infra` | Infrastructure, runtime or migration surface. |
| `impact:docs` | Documentation/reference impact. |
| `impact:control-plane` | CI/governance/control-plane behavior. |
| `merge:daytime` | Eligible for governed daytime integration once exact-head readiness/review gates pass. |
| `merge:governed` | Sensitive integration route; never unattended daytime merge. |
| `release:none` | Merge needs no production activation step. |
| `release:required` | Merge and release are separate; a governed apply/deploy/migration step is still required. |
| `night-merge` | Governed overnight integration queue. Merge only; release is separate. |

Priority is intentionally not inferred from code paths. P0/P1 remains a human
portfolio decision. State labels are reconciled by `scripts/ci/pr-triage.mjs`.
Impact/merge/release labels are derived from the actual changed paths by
`scripts/ci/change-impact.mjs` running from trusted `main`.

## Canonical routing

```text
OPEN PR
  |
  +--> changed paths --> impact:* labels
  |
  +--> Peskids / migration / deploy surface? ---- yes --> merge:governed
  |                                                   +--> release:required
  |
  +--> CI/governance/control-plane? --------------- yes --> merge:governed
  |                                                   +--> release:none unless apply/deploy path also changed
  |
  +--> all other product/runtime/docs work -------------> merge:daytime
                                                      +--> release:none

Then independently:
  dependency/base not integrated --> stack:blocked
  real check failing -------------> state:needs-fix
  exact-head checks green --------> state:ready
  independent review success -----> merge lane may admit
```

`merge:*` answers **how the code integrates**. `release:*` answers **whether a
separate production activation is still required**. `impact:*` answers **which
workstream owns the change**. These axes must not be collapsed into one label.

## Existing backlog reconciliation

The change-impact workflow classifies new/synchronized PRs immediately and also
reconciles every open PR on a six-hour cadence. Manual dispatch with PR `0` also
reconciles the complete open backlog. Only `impact:*`, `merge:*`, and `release:*`
labels are rewritten; priority, state, agent, stack and supersede labels are
preserved.

Useful GitHub views:

```text
is:pr is:open label:merge:daytime
is:pr is:open label:merge:governed
is:pr is:open label:release:required
is:pr is:open label:stack:blocked
is:pr is:open label:impact:peskids
is:pr is:open label:impact:health-travel
is:pr is:open label:impact:games
is:pr is:open label:impact:content
is:pr is:open label:impact:shared-runtime
```

## WIP budgets

- P0: at most 3 open PRs.
- P1: at most 7 open PRs.

The triage workflow emits a GitHub Actions warning if either budget is exceeded;
it does not deploy, mutate production data, rotate secrets, or bypass checks.

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

The workflows check out trusted `main`, never execute PR-head code under
`pull_request_target`, and the classifier itself has no merge/deploy/secret/data
mutation path. The merge lanes require exact-head evidence; production release
remains a separate governed action.
