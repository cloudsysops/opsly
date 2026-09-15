---
status: live
owner: operations
last_review: 2026-09-15
tags:
  - opsly/brain
  - sessions
  - moc
---

# Agent Sessions Brain Index

`docs/brain/sessions/` is the canonical human-readable ledger for agent work handoffs that deserve durable session context. It complements machine evidence keyed by `work_id` / `request_id`; it does not replace Git history, PR discussion, canonical module documentation, or Agent Lab evidence.

## Write policy

Every autonomous work attempt must emit machine-readable evidence/handoff. Create or update a Brain session note when the attempt changes operational understanding, discovers a non-obvious constraint, hands work to another agent, fails in a way useful for retry, or produces a decision that the next worker must know.

A session record must contain: `work_id`/`request_id`, agent/runtime, attempt number, objective, issue/PR/branch/head, touched surface, decisions, validation/evidence, blockers/risks, terminal state, next step, and links to any canonical docs/Brain notes promoted by the work.

Do not create one disconnected memory file per trivial action. Repeated attempts for the same canonical work identity should append/link through the same work history. Never store secrets, tokens, environment dumps, customer PII, or credentials.

## Promotion rule

Session knowledge is temporary operational memory. If a discovery remains true after the work is complete, promote it in the same PR to the owning canonical location: `docs/brain/modules/`, `architecture/`, `workflows/`, `agents/`, `tenants/`, ADR/runbook, or other owner documentation. The session then links to that canonical knowledge instead of becoming a competing source of truth.

## Completion rule

An agent cannot report `DONE` for a material change until its handoff/evidence exists and required durable documentation/Brain promotion is either committed in the same PR or explicitly recorded as a blocked follow-up. When Markdown under the vault changes, `npm run index-knowledge` and `npm run obsidian:file-index` are part of documentary closure when the runtime can execute them.

## Template

```yaml
work_id: <canonical id>
request_id: <request id>
agent: <runtime>
attempt: <n>
objective: <short goal>
issue: <number/url>
pr: <number/url or null>
branch: <branch or null>
head_sha: <sha or null>
terminal_state: <DONE|RETRYABLE|NEEDS_HUMAN|BLOCKED>
```

```text
Changed surface:
Decisions / discoveries:
Validation and evidence:
Risks / blockers:
Next step:
Brain promotions:
Canonical documentation updates:
```

## Related

- [[03-agents/AGENT-BRAIN-CONTRACT|Agent Brain Contract]]
- [[brain/agents/README|Agents MOC]]
- [[01-development/DOCUMENTATION-LIFECYCLE|Documentation Lifecycle]]
