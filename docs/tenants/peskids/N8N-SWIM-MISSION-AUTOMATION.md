# Peskids n8n — Swim mission assignment

## Status

Prepared, **inactive by default**.

Canonical workflow:

`infra/n8n/workflows/peskids/peskids-swim-mission-auto-assign.json`

## Boundary

n8n does not own missions and does not write Supabase directly.

It calls the canonical Peskids endpoint:

`POST /api/internal/swim-missions/assignments`

with the existing internal secret.

That endpoint performs the same mission lookup, safety gate, audit persistence,
idempotency and domain event emission used by the rest of Peskids.

## Executable mode

This workflow only executes:

`auto_assign_safe`

`recommend_only` remains a separate future recommendation/approval flow and
must not be treated as an assignment.

## Required payload

```json
{
  "student_id": "uuid",
  "mission_slug": "bubbles-v1",
  "assignment_mode": "auto_assign_safe",
  "rule_id": "after-class-breathing-v1",
  "idempotency_key": "class:<id>:student:<id>:mission:bubbles-v1",
  "reason": "Instructor-approved reinforcement after class",
  "due_at": "2026-09-20T23:59:59Z"
}
```

## Activation requirements

All are required before enabling:

- domain/API PR landed;
- migration approved/applied in the target environment;
- `PESKIDS_INTERNAL_SECRET` available to n8n;
- `PESKIDS_PUBLIC_URL` points at the intended environment;
- `PESKIDS_SWIM_MISSION_AUTOMATION_ENABLED=true`;
- rule references an academy-approved `dry_land_safe` catalog mission;
- staging E2E proves idempotency and audit fields;
- professor/support override remains available.

The workflow export stays `active:false` in git.

## Initial rules to pilot

Start narrow:

1. class attended + instructor skill flag `breathing_rhythm` -> `bubbles-v1`;
2. class attended + instructor skill flag `streamline_posture` -> `streamline-v1`;
3. class attended + instructor skill flag `kick_coordination` -> `kick-rhythm-v1`.

Do not infer a swimming weakness from attendance alone. The class event should
carry an instructor-approved skill/reinforcement signal before an automatic
assignment is created.
