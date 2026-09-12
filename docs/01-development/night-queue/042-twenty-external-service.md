---
id: twenty-external-service-042
status: pending
owner: opencode-builder
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Twenty external service hardening

## Goal
Operate Twenty as the canonical open-source CRM without vendoring its monorepo into Opsly.

## Deliver
- use `config/external-services.json` as source of truth
- bootstrap official `twentyhq/twenty` into `~/.opsly/external-services/twenty`
- pin a reviewed release/tag and exact resolved SHA
- make Docker image/version agree with the reviewed release
- add doctor check comparing deployed version vs expected pin
- document upgrade procedure: review release notes -> staging -> smoke -> approval -> prod
- never auto-upgrade Twenty in production

## Fork policy
Use API/config/SDK/app extension first. Create `cloudsysops/twenty-opsly` only if an unavoidable maintained source patch is required and license review passes.

## Acceptance
- no production path tracks `main` or unpinned `latest`
- exact SHA is observable
- Peskids and ICSO adapters point to Twenty only
- GHL is absent from active provider choices
- upgrade rollback is documented
