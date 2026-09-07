# Opsly Ecosystem Consolidation -- AI Decision Table

Date: 2026-09-07
Status: PROPOSAL (awaiting human decision)
Author: Cursor Cloud Agent (session 2026-09-07)

## Context

After auditing the full monorepo (3,947 TS files, 18 apps, 35 lib modules, 100 migrations, 47 workers, 80+ MCP tools), this document maps every built capability, classifies it, and proposes which to activate, evolve, or archive.

## Active tenants (KEEP)

| Tenant | Stack | Status |
|--------|-------|--------|
| Peskids | Full app (43 pages, 89 API routes, 35 services) + n8n | Production at www.peskids.com |
| SmileTripCare | n8n CRM + Uptime Kuma | Running on VPS |
| LocalRank | n8n CRM + Uptime Kuma + LegalVial sub-client | Running on VPS |

## Agent work pending review (unmerged branches)

### Sentinel (security hardening) -- 8 branches

| Branch | What it does | Recommendation |
|--------|-------------|----------------|
| sentinel-consent-security-hardening | Rate limiting + audit on consent endpoint | MERGE (1 commit, focused) |
| sentinel-dsar-token-sec-get | Rate limit + audit on DSAR verification | MERGE |
| sentinel-peskids-form-get-security | Rate limit on Peskids forms GET | MERGE |
| sentinel/governance-breach-security-17180692707850648486 | Harden breach endpoint | MERGE (pick one of 3 duplicates) |
| sentinel/governance-breach-security-hardening | Same endpoint, different approach | CLOSE (duplicate) |
| sentinel/harden-governance-breach-endpoint | Same endpoint, third attempt | CLOSE (duplicate) |
| sentinel/local-services-public-booking-security | Security on booking endpoint | MERGE |
| sentinel/provisioning-quote-rate-limit-audit | Rate limit on provisioning | MERGE |

### Palette (UX/accessibility) -- 5 branches

| Branch | What it does | Recommendation |
|--------|-------------|----------------|
| palette/kpi-card-accessibility | KPICard a11y in portal | MERGE |
| palette/service-card-a11y-ux | ServiceCard link affordance | MERGE |
| palette/status-badge-indicator-dot | Visual status dot | MERGE |
| palette-register-a11y | Registration form a11y | MERGE (pick one of 2 duplicates) |
| palette-register-accessibility | Same, different approach | CLOSE (duplicate) |

### Bolt (performance) -- 2 branches

| Branch | What it does | Recommendation |
|--------|-------------|----------------|
| bolt-cache-portal-tenant-health | Cache health checks in Redis | Already merged to main |
| bolt/cache-admin-llm-costs-endpoint | Cache LLM costs endpoint | MERGE |

### Feature branches (various agents)

| Branch | Commits | What it does | Recommendation |
|--------|---------|-------------|----------------|
| feat/content-studio-youtube | +5 | YouTube publishing for Content Studio | REVIEW (useful for LocalRank marketing) |
| feat/content-engine-mvp | +5 | Video pipeline MVP | REVIEW |
| feat/nightly-ops-upgrade-rollback | +4 | Night ops with rollback | REVIEW |
| feat/academy-whatsapp-sandbox | +3 | WhatsApp sandbox for testing | REVIEW (useful for Peskids WhatsApp activation) |
| feat/academy-tenant-generator | +2 | Tenant generator template | REVIEW |
| feat/content-pipeline-consolidation | +2 | Consolidate content pipelines | REVIEW |

### Branches to DELETE (stale/merged/duplicate)

| Pattern | Count | Reason |
|---------|-------|--------|
| nightly-fix/* | 11 | Auto-generated, stale |
| auto-fix/* | 4 | Auto-generated, stale |
| jules-* | 4 | Jules agent experiments, already merged what was useful |
| Duplicate sentinel branches | 3 | Same endpoint, multiple attempts |
| Duplicate palette branches | 1 | Same component, multiple attempts |
| fix/franchise-domain-contract-reconciliation | 1 | PR #1085 already closed |
| fix/franchise-persistence-types | 1 | PR #1098 already merged (canonical) |
| feat/opsly-moon-night-shift | 1 | PR #935 closed |
| fix/peskids-* (merged PRs) | 4 | Already in main |

## Built capabilities -- activation roadmap

### Tier 1: Activate NOW (flag flip, no code changes)

| Capability | How to activate | Risk |
|-----------|----------------|------|
| Peskids lead reminders (24h/48h) | `PESKIDS_LEAD_REMINDER_24H_ENABLED=true` | None (internal logic only) |
| Peskids escalation | `PESKIDS_LEAD_ESCALATION_48H_ENABLED=true` | None |
| Peskids auto-followup creation | `PESKIDS_AUTO_CREATE_FOLLOWUP_ENABLED=true` | None |
| Peskids attendance risk alerts | `PESKIDS_ATTENDANCE_RISK_ALERT_ENABLED=true` | None |
| Peskids trial reminders | `PESKIDS_TRIAL_REMINDER_ENABLED=true` | None |

### Tier 2: Activate with config (needs API keys in Doppler)

| Capability | Dependencies | Impact |
|-----------|-------------|--------|
| Peskids hot-lead WhatsApp alerts | WhatsApp provider (OpenWA/WaCRM) + API key | Real-time lead notifications |
| Peskids daily digest | Email config (Resend) or WhatsApp | Daily operational summary |
| Peskids AI reply assistant | LLM Gateway + Anthropic key (already in Doppler) | Staff productivity |
| Wompi payments | Wompi API keys | Accept payments |
| Shield security scanner | `OPSLY_SHIELD_SCAN_WORKER_ENABLED=true` | Automated vulnerability detection |

### Tier 3: Evolve for ecosystem (needs development)

| Capability | What exists | What to build | Value for ecosystem |
|-----------|------------|---------------|---------------------|
| Content Studio | 44 modules (captions, compliance, YouTube publisher) | Wire to LLM Gateway, create admin UI | LocalRank can offer content services |
| Social Automation | generate-reel.mjs + publish-scheduled.mjs (PR #222) | Merge PR, connect to Content Studio | Automated social media for all tenants |
| Conversational Runtime | Full lib + Panini Lab integration | Integrate into Peskids for family chatbot | Reusable across tenants |
| Airflow outbound campaigns | DAG with find_leads + create_drafts | Connect to real APIs, add approval flow | LocalRank lead generation |
| Kafka event streaming | Docker compose ready | Wire to orchestrator for real-time analytics | Platform-wide event bus |

### Tier 4: Architecture improvements

| Area | Current state | Improvement | Benefit |
|------|--------------|-------------|---------|
| Orchestrator mode | VPS in queue-only | Enable worker-enabled on VPS or Mac worker | Activate all 47 workers |
| LLM Gateway routing | Code ready, providers configured | Deploy with real API keys | AI features across platform |
| Hive Swarm | QueenBee + Workers coded, endpoints wired | E2E test, activate | Multi-agent task execution |
| MCP tools | 80+ tools registered | Deploy MCP server, connect to Claude/Cursor | Agent ecosystem |

## Decision matrix (human input needed)

| Decision | Options | Impact |
|----------|---------|--------|
| Peskids Tier 1 flags | Activate all 5 safe flags | Immediate operational value |
| WhatsApp provider | OpenWA vs WaCRM vs Jelou | Determines messaging integration |
| Content Studio activation | Wire to LLM Gateway now vs later | LocalRank marketing capability |
| Kafka | Deploy vs defer | Real-time analytics |
| Branch cleanup | Delete 24+ stale branches | Repo hygiene |
| Sentinel security PRs | Merge 5 unique, close 3 duplicates | Security hardening |
| Palette UX PRs | Merge 3 unique, close 1 duplicate | Portal accessibility |
