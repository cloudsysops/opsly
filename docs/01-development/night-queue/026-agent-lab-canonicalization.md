---
id: agent-lab-canonicalization-026
status: pending
owner: cursor-repair
agent: cursor
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Agent Lab — Canonicalize one evidence/learning package

## Mission

Resolve the duplication between PR #1187 (`lib/agent-lab-evidence`) and PR #1190 (`lib/agent-learning`).

Choose **one** canonical package and supersede the other. Do not merge both in parallel.

## Inputs

- PR #1187
- PR #1190
- canonical AgentTask / Orchestrator path
- current CI failures on #1190

## Required work

1. Diff #1187 vs #1190 by responsibility, API surface, imports, tests and consumers.
2. Decide which package remains canonical.
3. Prefer the option that:
   - reuses existing AgentTask contracts;
   - has the smaller API;
   - does not create a second state/task registry;
   - has less migration cost;
   - cleanly separates evidence/learning from execution.
4. Fix the winning PR's CI:
   - validate-structure
   - validate-agent-context
   - security scan
   - npm audit only if introduced by this PR.
5. Add a durable comment to both PRs:
   - WINNER
   - SUPERSEDED
   - migration/rename needed
   - remaining blockers.
6. Do not touch #1204/#1197 or trusted-node files.

## Exit criteria

Return:

```
AGENT_LAB_CANONICALIZATION

WINNER_PR:
WINNER_PACKAGE:
SUPERSEDED_PR:
REASON:
FILES_CHANGED:
CI:
MIGRATION_REQUIRED:
FOLLOW_UP:
BLOCKERS:
```

Builder must not self-approve.
