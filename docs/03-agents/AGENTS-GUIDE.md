---
status: canon
owner: operations
last_review: 2026-06-02
scope: multi-agent-conventions
---

# AGENTS-GUIDE — Conventions for Parallel Agents

> This file is only for multi-agent conventions. It does not replace `AGENTS.md`.
> `AGENTS.md` = current session state, blockers, and next increment.
> This guide = shared rules for parallel sessions and automation.

## /goal

Founder Mode — Peskids → Blueprint → Agency Replication

- Peskids is the live case and visible brand.
- Blueprint is the reusable artifact extracted from Peskids.
- Agency is the distribution channel for replicating the Blueprint.
- Do not create new platform or infrastructure work unless it directly helps capture leads, convert leads, measure conversion, or replicate the model.

## What "Go Live" means for Peskids

Peskids is Go Live only when the end-to-end path exists:

1. Lead enters through GHL.
2. Lead/contact fields are captured and validated.
3. Follow-up exists and is operational.
4. Trial class can be offered and tracked.
5. Enrollment is recorded.
6. Active student is visible in the dashboard or Opsly Executive.
7. Supabase persists the event with tenant-scoped identity.

If any of those steps are missing, Peskids is not Go Live yet.

## Session Discipline

- One session = one theme = one branch.
- Do not mix Peskids, Blueprint, and Agency in the same worktree unless the task explicitly requires all three.
- If the work spans more than one theme, split it before editing.
- If a branch does not represent the theme, rename or recreate it.

## Scope Priority

1. Peskids live case.
2. Academy Blueprint.
3. Agency Blueprint.
4. Broader Opsly platform work only when it directly supports capture, conversion, measurement, or replication.

## Where Each Thing Belongs

- `OPSLY_CONTEXT.md`: global stable context.
- `docs/tenants/<slug>/TENANT_<SLUG>.md`: tenant context entrypoint.
- `docs/blueprints/*.md`: compact blueprint context.
- `AGENCY_CONTEXT.md`: agency / partner context.
- `AGENTS.md`: current session state, blockers, and next action.
- `docs/AGENTS-GUIDE.md`: conventions for parallel work only.
- `docs/tenants/peskids/*`: live tenant contract, operational docs, and extraction inputs.
- `docs/blueprints/*`: reusable Academy / Agency playbooks, SOPs, and onboarding.
- `VISION.md`: product north star.

## Parallel Agent Rules

- Before starting, read `OPSLY_CONTEXT.md`, `AGENTS.md`, and only the relevant tenant/blueprint/agency file.
- Every agent should declare which part of the `/goal` it is unblocking.
- Do not duplicate session state here.
- Do not create a second source of truth for the goal.
- Do not open a new platform initiative just because the codebase makes it easy.
- Keep outputs reviewable, reusable, and narrow.

## Blueprint Exit Criteria

The Blueprint is ready when:

- A new academy can be deployed in under 1 hour.
- Pipeline, form, landing, workflows, dashboard, and SOPs are all reusable.
- No tenant-specific fork is required for the common case.
- The operating model can be handed to another operator without extra code changes.

## Agency Exit Criteria

The Agency Blueprint is ready when:

- A partner agency can sell the offer without knowing the underlying stack.
- The handoff process is documented.
- Lead capture, follow-up, and reporting are repeatable across tenants.
- IntCloudSysOps keeps ownership of the common model and the agency gets the channel role.

