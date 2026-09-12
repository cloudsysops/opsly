---
status: canon
owner: founder
last_review: 2026-09-11
type: operating-model
---

# Founder + Agent Operating System

## Purpose

Run Opsly as a professional software startup with one human founder and multiple supervised AI agents, without copying enterprise ceremony or duplicating sources of truth.

## Tool ownership

| Tool | Canonical responsibility |
| --- | --- |
| Notion | company strategy, product briefs, customer notes, decisions, SOPs, founder dashboard |
| GitHub Issues/Projects | engineering backlog, sprint execution, dependencies, PR linkage |
| GitHub PR/CI | implementation evidence, review, quality gates, release history |
| Opsly Mission Control | live portfolio, agent/runtime health, WIP, risks, decisions |
| BullMQ / AgentTask | active execution only |
| Gmail / Calendar | external commitments, sales, interviews, customer follow-up |

Do not mirror the same task manually into Notion, Jira and GitHub.

## Agile model

Use `solo-founder-agent-agile`.

- Sprint length: 7 days.
- Founder is Product Owner and final decision authority.
- Agents execute and report asynchronously.
- No daily meeting.
- GitHub evidence replaces status meetings.
- Mission Control is the operational review surface.

## Weekly cadence

### Sprint planning — 20 minutes

Choose at most 3 outcomes that materially change product, revenue, reliability or distribution.

Each workstream must satisfy Definition of Ready before entering active WIP.

### Async execution

Each agent reports:

```
TASK
STATUS
PR
HEAD_SHA
FILES_CHANGED
TESTS
CI
SECURITY
BLOCKERS
DECISIONS_NEEDED
NEXT_ACTION
```

### Sprint review

Review only durable evidence:

- PRs;
- CI;
- independent review;
- runtime verification;
- customer/revenue outcome.

### Retrospective

Ask:

1. What shipped?
2. What got stuck?
3. Which agent/process caused rework?
4. What duplicated effort?
5. What should be automated or deleted next week?

## WIP limits

- max active build/review workstreams: 4;
- max high-risk active workstreams: 1;
- max production-touching active workstreams: 1;
- max founder decisions waiting: 3.

When WIP is exceeded, stop starting and finish existing work.

## Founder escalation

Interrupt the founder only for:

- P0 production/security;
- P1 architecture/product/security/business decision;
- READY_FOR_DECISION.

Suppress:

- routine success;
- unchanged health;
- raw logs;
- agent chatter.

## Definition of Ready

A task is ready only when it has:

- clear objective;
- owner;
- scope;
- non-goals;
- acceptance criteria;
- risk;
- known dependencies.

## Definition of Done

A task is done only when:

- focused PR or durable artifact exists;
- required tests pass;
- CI is green on exact SHA;
- independent review is complete;
- evidence is persisted in GitHub;
- runtime is verified when applicable;
- follow-up is recorded.

## Jira decision

Do not introduce Jira yet.

Revisit when there are multiple human engineering teams, separate QA/support, enterprise traceability requirements, or GitHub Projects is demonstrably insufficient.

## Notion structure

Keep seven top-level areas:

1. Company OS
2. Product
3. Customers / CRM executive view
4. Decisions
5. SOP / Runbooks
6. Startup Metrics
7. Founder Dashboard

Engineering execution remains in GitHub, linked from Notion rather than duplicated.
