---
status: draft
owner: operations
last_review: 2026-06-18
type: report
---

# Opsly Agency Operating System Audit

**Mission:** reduce founder coordination time by turning the current Peskids / ICSO / Opsly stack into a repeatable client launch system.

**Scope reviewed:**
- tenant registry and tenant config
- Peskids-specific code and scripts
- GoHighLevel setup and validation
- n8n workflows and onboarding scripts
- health and smoke automation
- docs and blueprints for incubation

## Classification legend

- `PASS` = reusable as-is
- `WARN` = reusable, but still tenant-specific or partial
- `FAIL` = missing or too brittle for repeatable launch
- `MANUAL` = currently requires human UI work
- `AUTOMATABLE` = can be scripted quickly with low risk
- `DO_NOT_AUTOMATE_YET` = automation should wait for a contract or approval boundary

## What Is Already Reusable

| Item | Classification | Evidence | Why it matters |
| --- | --- | --- | --- |
| Tenant config registry | `PASS` | `packages/opsly-core/src/tenant-config/registry.ts` | There is already a canonical in-memory registry shape for tenant configs. |
| Tenant contract template | `PASS` | `config/tenants/_template.tenant.json` | New tenants already have a starter contract. |
| Incubation blueprint | `PASS` | `docs/blueprints/opsly-operational-blueprint/CLIENT-INCUBATION-TEMPLATE.md` | The lifecycle and extraction concept already exist. |
| Reference architecture | `PASS` | `docs/blueprints/opsly-operational-blueprint/REFERENCE-ARCHITECTURE.md` | The platform vs client-layer split is already documented. |
| Peskids GHL contract | `PASS` | `docs/tenants/peskids/GOHIGHLEVEL-CONTRACT.md` | Gives a concrete agency/tenant boundary and validation steps. |
| Agency GHL contract | `PASS` | `docs/tenants/intcloudsysops/GOHIGHLEVEL-CONTRACT.md` | Same for the agency account. |
| GHL provisioning agent | `PASS` | `packages/provisioning/src/ghl-provisioner.ts` | Reusable provisioning logic for tags, fields, and forms. |
| GHL validation script | `PASS` | `scripts/validate-ghl-config.sh` | Immediate repeatable check for GHL access/scopes. |
| Peskids smoke scripts | `PASS` | `scripts/peskids-mvp-smoke.sh`, `scripts/test-peskids-client-demo.sh`, `scripts/smoke-peskids-auth-surfaces.sh` | Good foundation for demo readiness checks. |
| Opsly repo alignment script | `PASS` | `scripts/opsly-repo-align.sh` | Good base for repo/VPS status and sync. |
| Peskids reusable guidance | `PASS` | `docs/tenants/peskids/OPSLY-REUSE.md` | Documents what can be shared and what must stay tenant-scoped. |
| Existing health scripts | `PASS` | `scripts/monitor-ghl-health.sh`, `scripts/daily-health-check.sh`, `scripts/health-check-autostart.sh` | The project already has health-check primitives. |
| Existing deployment scripts | `PASS` | `scripts/deploy-peskids-production.sh`, `scripts/peskids-deploy-vps.sh`, `scripts/deploy-validation-orchestrator.sh` | Repeatable deployment mechanics already exist, though scoped differently. |

## What Is Still Hardcoded To Peskids

| Item | Classification | Evidence | Why it is still tenant-specific |
| --- | --- | --- | --- |
| Peskids tenant config | `WARN` | `config/tenants/peskids.json` | Real values are embedded for a specific tenant. |
| Peskids app tree | `WARN` | `apps/peskids/**` | The app is rich and reusable in shape, but the content, brand, and routes are Peskids-specific. |
| Peskids migrations | `WARN` | `apps/peskids/migrations/**` | Schema and operations are useful, but naming and entities are tenant-coded. |
| Peskids deploy scripts | `WARN` | `scripts/peskids-*.sh` | They encode a real tenant launch path rather than a generic client launcher. |
| Peskids docs package | `WARN` | `docs/tenants/peskids/**` | Valuable reference material, but still client-specific. |
| Peskids GHL settings | `WARN` | `config/peskids-github-secrets.json`, `config/peskids-firebase-admin.json.example` | Operationally useful but tenant-bound. |
| Peskids health / webhook routes | `WARN` | `apps/peskids/app/api/**` | Very reusable patterns, but route names and payloads are tenant-named. |
| Peskids URLs | `WARN` | `config/agent-url-audit.json` | Hardcoded live URLs make the current setup concrete but not generic. |

## What Is Manual Today

| Item | Classification | Evidence | Why it is manual |
| --- | --- | --- | --- |
| GHL workflow creation | `MANUAL` | `docs/tenants/peskids/GHL-WORKFLOWS.md`, `docs/tenants/intcloudsysops/GHL-AGENCY-MANUAL-UI-CHECKLIST.md` | Workflows still require UI assembly and verification. |
| Email/SMS template setup | `MANUAL` | `packages/provisioning/src/ghl-provisioner.ts` | The provisioner marks templates as `manual_required`. |
| Some Peskids deploy steps | `MANUAL` | `scripts/deploy-peskids-production.sh` | The script is a production handoff aid, not a generic client launcher. |
| Workflow QA | `MANUAL` | `docs/tenants/peskids/CLIENT-DEMO-CHECKLIST.md`, `docs/tenants/peskids/DEMO-SCRIPT.md` | Demo validation still needs human review. |
| Extraction approval | `MANUAL` | `docs/blueprints/opsly-operational-blueprint/CLIENT-INCUBATION-TEMPLATE.md` | The move to a dedicated VPS is a business decision, not an automatic step. |
| GHL scope validation | `MANUAL` | `scripts/validate-ghl-config.sh` | The script checks scopes, but somebody still has to resolve missing permissions. |
| Founder coordination across agents | `MANUAL` | current multi-agent workflow | There is no single command yet that turns the whole system into a concise operational picture. |

## What Can Be Automated Quickly

| Item | Classification | Why now |
| --- | --- | --- |
| Single repo/VPS status command | `AUTOMATABLE` | Combines branch, deploy run, health and tenant readiness into one read-only command. |
| GHL config smoke wrapper | `AUTOMATABLE` | Already exists as a script; only needs a founder-friendly summary command. |
| Client launch plan generator | `AUTOMATABLE` | The contract can be derived from current tenant and blueprint docs. |
| Demo readiness summary | `AUTOMATABLE` | The repo already exposes enough health checks and URL audits. |
| Workflow catalog snapshot | `AUTOMATABLE` | `config/n8n-workflows/*` already acts as a source of truth. |
| Tenant launch checklist docs | `AUTOMATABLE` | Can be generated from the same intake contract and blueprint template. |

## What Should NOT Be Automated Yet

| Item | Classification | Why not yet |
| --- | --- | --- |
| Direct production mutations | `DO_NOT_AUTOMATE_YET` | Any destroy/restart action must remain approval-gated. |
| Auto-creating GHL workflows in production | `DO_NOT_AUTOMATE_YET` | The UI contract and permissions are still tenant-specific. |
| Cross-tenant provisioning | `DO_NOT_AUTOMATE_YET` | The system still needs a stable tenant intake contract and extraction gates. |
| Silent WhatsApp/email sends | `DO_NOT_AUTOMATE_YET` | Approval-first is still the correct default. |
| Destructive VPS cleanup | `DO_NOT_AUTOMATE_YET` | Safe cleanup can be automated, but not volume/data deletion. |
| Full founder dashboard build | `DO_NOT_AUTOMATE_YET` | First define the source mapping and the minimum operational truth. |

## Current Founder Time Traps

1. Switching between repo state, deploy state, health checks, and tenant-specific docs.
2. Repeating GHL validation and workflow verification for each tenant.
3. Manually cross-checking whether a client is ready for demo or launch.
4. Re-explaining tenant-specific steps that should be derived from a contract.
5. Coordinating multiple agents without a single “source of truth” command.
6. Debugging the same operational surface through different scripts instead of one status view.

## Recommended Automation Roadmap

### P0 - Stop The Bleeding

- Add `npm run opsly:status`.
- Add a single deploy/readiness summary for the founder.
- Keep status commands read-only and idempotent.

### P1 - Repeatable Client Launch

- Define `client-launch.schema.json`.
- Add a plan generator that outputs launch steps, risks, and manual checkpoints.
- Reuse the Peskids templates as the first client launch baseline.

### P2 - Founder Console

- Expose a read model for clients, leads, GHL sync, deploys, and alerts.
- Keep it read-only until the source mapping is stable.

### P3 - Semi-Automated Provisioning

- Turn the client launch plan into scripted tenant setup.
- Generate landing, lead, webhook, and smoke templates from the intake contract.
- Keep approvals explicit for anything that changes customer-facing state.

### P4 - Delegation

- Push checklist-heavy support tasks to operator playbooks.
- Make the founder’s job mostly sales, demos, and approval decisions.

## Bottom Line

Opsly already has the raw material for a client launch machine. The missing layer is not “more platform”; it is a small, standard, read-only operating surface that tells the founder:

1. what is healthy,
2. what needs attention,
3. what is safe to automate,
4. and what still requires a human decision.

