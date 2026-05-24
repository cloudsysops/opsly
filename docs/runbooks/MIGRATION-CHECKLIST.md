---
status: canon
owner: operations
last_review: 2026-05-21
---

# Migration Checklist

Checklist de transición desde un tenant incubado en Opsly hacia un VPS
dedicado.

## Pre-migration

- Client approval recorded.
- Business case confirmed.
- Tenant usage reviewed.
- App, workflows, data, and config inventoried.
- Secrets strategy defined.
- Backup verified.
- Freeze window agreed.

## Migration

- Provision dedicated VPS.
- Install Docker Compose baseline.
- Configure Traefik.
- Install monitoring and backup services.
- Move app artifacts.
- Move workflows.
- Move data.
- Move configs.
- Validate DNS or routing cutover.

## Validation

- App loads correctly.
- Workflows execute.
- Data is intact.
- Monitoring is visible.
- Alerts work.
- Owner can operate the platform.

## Rollback

- Restore previous routing.
- Restore backups if needed.
- Re-enable Opsly-incubated runtime if cutover fails.
- Record the failure and reason before retrying.

## Post-migration

- Confirm client ownership boundaries.
- Remove or disable old shared dependencies.
- Document final runtime state.
- Update support and monitoring contacts.
- Record the migration outcome.


---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
