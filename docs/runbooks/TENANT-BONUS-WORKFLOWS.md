---
status: draft
owner: operations
last_review: 2026-05-20
---

# Tenant Bonus Workflows

This runbook packages the Opsly CRM Starter Pack as an included bonus for
existing tenants. It is intentionally conservative: import workflows inactive,
verify tenant health, then activate manually in each tenant n8n.

## Source of Truth

| Artifact | Purpose |
| --- | --- |
| `config/n8n-workflows/catalog.json` | Marketplace catalog shown in portal |
| `config/n8n-workflows/tenant-bonus-packs.json` | Tenant-specific bonus rollout map |
| `.n8n/1-workflows/crm/*.json` | n8n workflow templates |
| `scripts/install-crm-workflows.sh` | Import workflows into tenant n8n containers |
| `scripts/plan-tenant-bonus-workflows.sh` | Print rollout summary and safe commands |

## Included Pack

`crm-starter-pack` includes:

- Lead capture webhook: `POST /webhook/opsly-crm-lead`
- Hot lead alert webhook: `POST /webhook/opsly-crm-hot-lead`
- Weekday follow-up reminder
- Weekday daily pipeline digest

The workflows do not include credentials. Notifications use
`OPSLY_CRM_NOTIFY_WEBHOOK_URL` when configured and continue on failure when it
is missing.

## Tenant Positioning

| Tenant | Bonus positioning | Status |
| --- | --- | --- |
| `peskids` | Parent lead capture, feedback follow-up, weekly owner report | ready for dry-run |
| `smiletripcare` | Intake, follow-up reminders, daily pipeline digest | ready for dry-run |
| `localrank` | SEO audit leads, ranking requests, follow-up | ready for dry-run |
| `legalvial` | Legal intake, document follow-up, case digest | parent tenant review required |
| `jkboterolabs` | Project inquiry intake, support triage, owner digest | ready for dry-run |
| `intcloudsysops` | Internal ops intake, incident follow-up, agent digest | internal only |

## Safe Rollout

1. Verify public routing and tenant health before any demo:

   ```bash
   curl -L -s -o /dev/null -w '%{http_code}\n' https://api.op-sly.com/api/health
   curl -L -s -o /dev/null -w '%{http_code}\n' https://portal.op-sly.com/login
   ```

2. Review the rollout plan:

   ```bash
   ./scripts/plan-tenant-bonus-workflows.sh --commands
   ```

3. Dry-run one tenant:

   ```bash
   ./scripts/install-crm-workflows.sh --tenant peskids --dry-run
   ```

4. Import only after approval:

   ```bash
   ./scripts/install-crm-workflows.sh --tenant peskids
   ```

5. Open the tenant n8n UI, inspect each workflow, test manually, then activate.

## Guardrails

- Do not use `--all-running --force` for a client rollout unless there is a
  documented maintenance window.
- Do not activate workflows automatically.
- Do not add secrets to workflow JSON files.
- Do not expose OpenClaw, MCP, agent terminal, or admin execution endpoints as
  part of this customer-facing bonus.
- If public routing returns `404`, stop customer demo work and recover
  Traefik/API/portal first.

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
