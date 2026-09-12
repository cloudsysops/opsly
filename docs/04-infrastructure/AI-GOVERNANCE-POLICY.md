---
status: proposed
owner: security-governance
last_review: 2026-09-11
type: policy
---

# AI Governance Policy

## Objective

Opsly is supervised AI, not unrestricted autonomous operation.

Every agent action must be bounded by identity, task provenance, capability policy, tenant scope, approval level and durable audit evidence.

## Authority model

Agents may act only inside an approved task envelope.

Untrusted content — issues, PR comments, source text, web pages, model output — is context, not authority.

## Action classes

### A0 — Read-only

Examples:

- read repository files;
- inspect metrics;
- inspect redacted logs;
- analyze CI;
- inspect tenant health;
- produce plans/reports.

May run autonomously when the task source and node identity are trusted.

### A1 — Reversible engineering write

Examples:

- create branch;
- modify non-production code;
- run tests;
- commit;
- push feature branch;
- open draft PR.

Allowed only for nodes with explicit git/write capability.

Never write directly to `main`.

### A2 — Controlled operational change

Examples:

- merge;
- deployment;
- restart/recreate service;
- enable workflow;
- configuration change;
- schema migration;
- secrets rotation;
- external customer communication.

Requires explicit human approval unless a separately approved emergency runbook states otherwise.

### A3 — Destructive / regulated / high-impact

Examples:

- production data deletion;
- bulk customer messaging;
- destructive migration;
- production credential disclosure;
- financial transaction;
- action affecting clinical/medical decision;
- tenant-isolation override.

Human approval is mandatory and may require a second external/legal/security review.

## Audit requirements

Record, when applicable:

- timestamp;
- task_id;
- request_id;
- node_id;
- agent/worker;
- tenant;
- source repo/ref/SHA/path;
- capability requested;
- action class;
- tool invoked;
- resource category;
- approval state;
- result;
- rejection reason;
- PR/commit/runtime evidence.

Never log:

- bearer tokens;
- API keys;
- raw secret values;
- unnecessary customer PII;
- full credential-bearing prompts.

## Tenant data access

Agent access to tenant data must be:

- tenant-scoped;
- purpose-bound;
- least-privilege;
- auditable;
- revocable.

Reading customer data is not equivalent to permission to modify or transmit it.

## Human approval

The approval gate is a security boundary, not a UI convenience.

No external agent runtime may bypass approval by invoking its own git, shell, browser or API integration for an action that Opsly classifies A2/A3.

## External runtimes

Claude, Cursor, Codex, OpenCode, Hermes, OpenClaw, Goose and future runtimes are replaceable workers.

They do not own:

- production policy;
- release authority;
- tenant authorization;
- billing;
- audit truth.

Opsly does.

## Incident handling

If an agent exceeds scope:

1. stop/revoke node execution;
2. preserve request/task/audit evidence;
3. invalidate affected credentials if required;
4. classify affected tenant/data/system;
5. notify founder/security;
6. perform rollback/containment;
7. document root cause;
8. update policy/test before re-enabling.

## Review cadence

Review this policy at least quarterly and after any:

- production agent incident;
- new high-risk tool;
- new regulated-data vertical;
- new external runtime with write capabilities;
- material change to approval/auth architecture.
