---
status: draft
owner: operations
last_review: 2026-05-25
type: runbook
tags:
  - opsly/runbook
---

# Incubation Platform Foundation Runbook

Use this runbook to inspect the first read-only foundation of Opsly.

## Read-only checks

```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://127.0.0.1:3000/api/admin/mission-control | jq .

curl -H "Authorization: Bearer <admin-token>" \
  http://127.0.0.1:3000/api/admin/agents | jq .

curl -H "Authorization: Bearer <admin-token>" \
  http://127.0.0.1:3000/api/admin/tenants/registry | jq .
```

## Provisioning skeleton

```bash
scripts/provisioning/tenant-bootstrap-skeleton.sh --tenant peskids --stage mvp_validation
scripts/provisioning/tenant-bootstrap-skeleton.sh --tenant peskids --stage mvp_validation --json
```

## Expected behavior

- All endpoints are read-only.
- No production tenant is modified.
- The provisioning script prints a dry-run plan only.
- Approval boundaries remain explicit.

## Troubleshooting

- If `/api/admin/mission-control` fails, check `REDIS_URL`,
  `ORCHESTRATOR_INTERNAL_URL`, and the LLM gateway base URL envs.
- If a tenant appears blocked, inspect the lifecycle stage and extraction readiness
  in `config/platform-foundation.json` plus the tenant source file under `config/tenants/`.
- If an agent is degraded, verify the config in `config/agents-team.json` and the service
  mapping in `config/agent-services.json`.
