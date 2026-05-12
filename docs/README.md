---
status: reference
owner: operations
updated: 2026-05-08T14:45:00Z
---

# Opsly Documentation Hub

**Source of truth for all operational, technical, and product information.**

Quick jump to what you need:

---

## 🚀 Getting Started

- **[README.md](README.md)** — This file. Start here.
- **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** — Cheatsheet: SSH, commands, env vars
- **[VISION.md](../VISION.md)** — Product north star + roadmap

---

## 📊 Current Status

- **Production:** 🟢 GREEN (API 200 OK, all services healthy)
- **Deployments:** Last: 2026-05-08 (VPS via Tailscale)
- **Cost:** $1,050/month (baseline), -15% optimization identified
- **Coverage:** 23.3% (tests), 70%+ target

View real-time status: See [AGENTS.md](../AGENTS.md)

---

## 🔧 Operations (How-To Guides)

### Runbooks (Step-by-Step)

| Document | Use When |
|----------|----------|
| [OPERATIONS-HANDBOOK.md](runbooks/OPERATIONS-HANDBOOK.md) | Daily operations, health checks, escalation |
| [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md) | 🆕 Something is broken — find solution here |
| [VPS-DEPLOYMENT-2026-05-08.md](runbooks/VPS-DEPLOYMENT-2026-05-08.md) | How we deployed to production |
| [SUPER-AGENT-SHADOW-DEPLOY.md](runbooks/SUPER-AGENT-SHADOW-DEPLOY.md) | Deploy Super Agent (experimental) |

### Guides (Deep Dives)

| Document | Purpose |
|----------|---------|
| [DATABASE-OPERATIONS.md](database/DATABASE-OPERATIONS.md) | SQL, migrations, Supabase management |
| [REDIS-QUEUE-GUIDE.md](infrastructure/REDIS-QUEUE-GUIDE.md) | Job queue, worker management |
| [COST-MONITORING-GUIDE.md](operations/COST-MONITORING-GUIDE.md) | Track, forecast, optimize costs |
| [SECURITY-POSTURE-AUDIT.md](security/SECURITY-POSTURE-AUDIT.md) | Security findings + remediations |
| [WORKER-SETUP-MAC2011.md](WORKER-SETUP-MAC2011.md) | Run agents on remote worker |

---

## 🔍 Audits & Analysis (May 2026)

**Comprehensive audits covering code, DB, tests, performance, security, and costs.**

Location: `docs/audits/`

| Document | Find |
|----------|------|
| [CODE-REVIEW-API-ROUTES.md](audits/CODE-REVIEW-API-ROUTES.md) | 50 API routes analyzed, validation gaps (48 missing) |
| [DATABASE-QUERY-AUDIT.md](audits/DATABASE-QUERY-AUDIT.md) | 1 N+1 pattern, 6 unfiltered queries, missing indexes |
| [TEST-COVERAGE-BASELINE.md](audits/TEST-COVERAGE-BASELINE.md) | 23.3% coverage, admin 0%, portal 5.4% (CRITICAL) |
| [LINT-RULES-GUIDE.md](audits/LINT-RULES-GUIDE.md) | ESLint gaps, migration plan |
| [DOCKER-OPTIMIZATION.md](audits/DOCKER-OPTIMIZATION.md) | 60-70% image size reduction potential |
| [PERFORMANCE-BOTTLENECK-ANALYSIS.md](audits/PERFORMANCE-BOTTLENECK-ANALYSIS.md) | 3 critical patterns (10-300x improvement) |
| [SECURITY-INPUT-VALIDATION-AUDIT.md](audits/SECURITY-INPUT-VALIDATION-AUDIT.md) | 41/43 routes without validation (CRITICAL) |
| [COST-DEEP-DIVE.md](audits/COST-DEEP-DIVE.md) | Per-tenant breakdown, -15% savings potential |

**Summary:** 89 issues identified (26 critical, 40 important, 23 nice-to-have)  
**Remediation:** 18-27 hours work planned

---

## 🏗️ Architecture & Design

### Decision Records (ADRs)

View all: `docs/adr/`

Key decisions:
- **ADR-009:** MCP agent tooling
- **ADR-011:** BullMQ orchestration
- **ADR-025:** NotebookLM integration
- **ADR-027:** Hybrid compute plane (K8s, future)
- **ADR-028:** Agent routing (current blocker, resolved)

### Technical Specs

| Document | Topic |
|----------|-------|
| [OPENCLAW-ARCHITECTURE.md](OPENCLAW-ARCHITECTURE.md) | LLM Gateway, routing, cost tracking |
| [IMPLEMENTATION-IA-LAYER.md](IMPLEMENTATION-IA-LAYER.md) | TypeScript routes, actual file locations |
| [KNOWLEDGE-SYSTEM.md](KNOWLEDGE-SYSTEM.md) | NotebookLM + Obsidian for agents |
| [AGENTS-GUIDE.md](AGENTS-GUIDE.md) | Multi-agent orchestration conventions |

---

## 💰 Financial & Growth

| Document | Use For |
|----------|---------|
| [COST-MONITORING-GUIDE.md](operations/COST-MONITORING-GUIDE.md) | Daily/weekly/monthly cost tracking |
| [COST-DEEP-DIVE.md](audits/COST-DEEP-DIVE.md) | Per-tenant analysis + optimization roadmap |
| [ROADMAP.md](../ROADMAP.md) | Product timeline, milestones, releases |

**Current:** $1,050/month (infrastructure $50 + operational $50 + AI $950)  
**Target:** $900/month (-15% via token limits, caching, model selection)

---

## 🛠️ Development & Debugging

### Setup & Configuration

- **[SESSION-GIT-SYNC.md](SESSION-GIT-SYNC.md)** — Git workflow before editing
- **[ACTIVE-PROMPT.md](ACTIVE-PROMPT.md)** — Optional: auto-execute shell commands from file

### Debugging

- **[TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md)** — Symptom → solution tree
- **[TECHNICAL-DEBT.md](TECHNICAL-DEBT.md)** — Known issues + workarounds (incl. audit npm / deuda moderate)
- **[SYSTEMATIC-DEBUGGING.md]** — Coming soon (skill available)

---

## 📚 How to Use This Wiki

### For Operators
1. Start: [QUICK-REFERENCE.md](QUICK-REFERENCE.md)
2. Daily: [OPERATIONS-HANDBOOK.md](runbooks/OPERATIONS-HANDBOOK.md)
3. Issues: [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md)

### For Engineers
1. Start: [VISION.md](../VISION.md) + [IMPLEMENTATION-IA-LAYER.md](IMPLEMENTATION-IA-LAYER.md)
2. Code: Relevant audit (CODE-REVIEW-API-ROUTES.md, DATABASE-QUERY-AUDIT.md, etc.)
3. Issues: [TECHNICAL-DEBT.md](TECHNICAL-DEBT.md) + [TROUBLESHOOTING-GUIDE.md](TROUBLESHOOTING-GUIDE.md)

### For DevOps
1. Start: [QUICK-REFERENCE.md](QUICK-REFERENCE.md)
2. Infra: [REDIS-QUEUE-GUIDE.md](infrastructure/REDIS-QUEUE-GUIDE.md), [DATABASE-OPERATIONS.md](database/DATABASE-OPERATIONS.md)
3. Costs: [COST-MONITORING-GUIDE.md](operations/COST-MONITORING-GUIDE.md) + [COST-DEEP-DIVE.md](audits/COST-DEEP-DIVE.md)
4. Deploy: [VPS-DEPLOYMENT-2026-05-08.md](runbooks/VPS-DEPLOYMENT-2026-05-08.md)
5. CI: catálogo workflows + **actionlint** — [ops/workflows-index.md](ops/workflows-index.md) (§ Workflow lint)

### For Product/Leadership
1. Vision: [VISION.md](../VISION.md)
2. Status: [AGENTS.md](../AGENTS.md)
3. Roadmap: [ROADMAP.md](../ROADMAP.md)
4. Costs: [COST-DEEP-DIVE.md](audits/COST-DEEP-DIVE.md)

---

## 📋 Full File Index

```
docs/
├─ README.md (this file)
├─ QUICK-REFERENCE.md
├─ TROUBLESHOOTING-GUIDE.md 🆕
├─ TECHNICAL-DEBT.md
├─ OPENCLAW-ARCHITECTURE.md
├─ IMPLEMENTATION-IA-LAYER.md
├─ KNOWLEDGE-SYSTEM.md
├─ AGENTS-GUIDE.md
├─ SESSION-GIT-SYNC.md
├─ ACTIVE-PROMPT.md
├─ WORKER-SETUP-MAC2011.md
│
├─ audits/
│  ├─ CODE-REVIEW-API-ROUTES.md
│  ├─ DATABASE-QUERY-AUDIT.md
│  ├─ TEST-COVERAGE-BASELINE.md
│  ├─ LINT-RULES-GUIDE.md
│  ├─ DOCKER-OPTIMIZATION.md
│  ├─ PERFORMANCE-BOTTLENECK-ANALYSIS.md
│  ├─ SECURITY-INPUT-VALIDATION-AUDIT.md
│  └─ COST-DEEP-DIVE.md
│
├─ runbooks/
│  ├─ OPERATIONS-HANDBOOK.md
│  ├─ VPS-DEPLOYMENT-2026-05-08.md
│  └─ SUPER-AGENT-SHADOW-DEPLOY.md
│
├─ database/
│  ├─ DATABASE-OPERATIONS.md
│  └─ SUPABASE-MIGRATION-AUDIT.md
│
├─ infrastructure/
│  ├─ REDIS-QUEUE-GUIDE.md
│  ├─ DOCKER-OPTIMIZATION.md (linked from audits)
│  └─ TRAEFIK-CONFIG.md
│
├─ operations/
│  ├─ COST-MONITORING-GUIDE.md
│  └─ COST-DEEP-DIVE.md (linked from audits)
│
├─ security/
│  └─ SECURITY-POSTURE-AUDIT.md
│
└─ adr/
   ├─ ADR-009-mcp.md
   ├─ ADR-011-bullmq.md
   ├─ ADR-025-notebooklm.md
   ├─ ADR-027-hybrid-compute.md
   └─ ADR-028-agent-routing.md
```

---

## 🔄 Maintenance

**Wiki updated:** 2026-05-08  
**Next review:** 2026-05-15  
**Owner:** @operations + @architects

| Doc                                          | Cuándo usarlo                                            |
| -------------------------------------------- | -------------------------------------------------------- |
| [`KNOWLEDGE-SYSTEM.md`](KNOWLEDGE-SYSTEM.md) | **ESENCIAL** — NotebookLM + Obsidian, flujo para agentes |
| [`NOTEBOOKLM-SETUP.md`](NOTEBOOKLM-SETUP.md) | Guía de instalación y configuración                      |

### 1. Estado y roadmap

> **Note:** Legacy planning (`MASTER-PLAN*.md`, `SPRINT-ROADMAP.md`) is in [`history/plans/`](history/plans/) — **deprecated snapshots** (ADR-033). Canon: [`../ROADMAP.md`](../ROADMAP.md), [`../SPRINT-TRACKER.md`](../SPRINT-TRACKER.md), [`../AGENTS.md`](../AGENTS.md); machine view: [`generated/sprint-status.auto.md`](generated/sprint-status.auto.md), [`generated/implementation-progress.auto.md`](generated/implementation-progress.auto.md).

| Doc                                                        | Cuándo usarlo                                            |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| [`01-development/VISION.md`](01-development/VISION.md)     | Norte producto, fases, límites; **índice canon vs planes temáticos** |
| [`../ROADMAP.md`](../ROADMAP.md)                           | Stub raíz → `docs/01-development/ROADMAP.md` (plan semanal) |
| [`../SPRINT-TRACKER.md`](../SPRINT-TRACKER.md)             | Stub raíz → `docs/01-development/SPRINT-TRACKER.md` (checkboxes) |
| [`plans/README.md`](plans/README.md)                       | Índice de planes temáticos (autonomía, CLI, go/no-go)    |
| [`01-development/IMPLEMENTATION-IA-LAYER.md`](01-development/IMPLEMENTATION-IA-LAYER.md) | Implementar capa IA en el monorepo (sin Python paralelo) |
| [`ACTIVE-PROMPT.md`](ACTIVE-PROMPT.md)                     | Prompt activo ejecutado por cursor-prompt-monitor        |

### 2. Arquitectura

| Doc                                                                                    | Cuándo usarlo                                                              |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`REPO-MAP.md`](REPO-MAP.md)                                                           | **Estructura del monorepo:** qué editar (VISION/AGENTS), whitelist raíz, scripts |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                                                   | Control plane vs data plane, Traefik, redes                                |
| [`ARCHITECTURE-DISTRIBUTED.md`](ARCHITECTURE-DISTRIBUTED.md)                           | VPS control + workers remotos (Mac 2011), Redis Tailscale                  |
| [`HYBRID-OPSLY-ADMIN.md`](HYBRID-OPSLY-ADMIN.md)                                       | **Centro de mando** (Mac `opsly-admin`): Cursor, MCP, Git, DragonB, SSH    |
| [`runbooks/e2e-hybrid-write.md`](runbooks/e2e-hybrid-write.md)                         | E2E escritura API `/api/tools/execute`, deploy `app`, Trivy                |
| [`runbooks/VPS-DISK-SECURITY-SCAN.md`](runbooks/VPS-DISK-SECURITY-SCAN.md)             | Disco VPS, Trivy, `cleanup-vps.sh`                                         |
| [`runbooks/DEPLOY-GITHUB-ACTIONS.md`](runbooks/DEPLOY-GITHUB-ACTIONS.md)               | Deploy CI → VPS (Tailscale, `VPS_HOST`, rollback imagen)                   |
| [`runbooks/TENANT-ONBOARDING-TRIAGE.md`](runbooks/TENANT-ONBOARDING-TRIAGE.md)         | Triage onboarding tenants (logs, DB, cola, Docker)                         |
| [`runbooks/LOCAL-SERVICES-GO-LIVE.md`](runbooks/LOCAL-SERVICES-GO-LIVE.md)             | Go-live tenant **Equipa** (`local-services`) — oferta limpieza + upgrade   |
| [`runbooks/PRODUCTION-SECURITY-BASELINE.md`](runbooks/PRODUCTION-SECURITY-BASELINE.md) | Checklist mínimo red/secretos/apps en `prd`                                |
| [`VPS-SSH-WORKER-NODES.md`](VPS-SSH-WORKER-NODES.md)                                   | Clave SSH VPS → workers (`authorized_keys`), solo Tailscale                |
| [`SSH-USERS-FOR-AGENTS.md`](SSH-USERS-FOR-AGENTS.md)                                   | **Qué usuario SSH usar** (VPS, worker, Mac) — agentes y humanos            |
| [`AGENTS-AUTONOMOUS-RUNBOOK.md`](AGENTS-AUTONOMOUS-RUNBOOK.md)                         | Workers autónomos: systemd, Ollama, cola `openclaw`, verificación          |
| [`FIRST-OPENCLAW-AGENTS-MAC2011.md`](FIRST-OPENCLAW-AGENTS-MAC2011.md)                 | Primer arranque workers OpenClaw en Mac 2011 (SSH, Redis, E2E)             |
| [`DECEPTICON-WORKER.md`](DECEPTICON-WORKER.md)                                         | Decepticon en worker Ubuntu (instalación, seguridad, vs LLM Gateway Opsly) |
| [`RTK.md`](RTK.md)                                                                     | RTK: reducción de tokens en contexto de agente (Cursor/VPS/worker)         |
| [`WORKER-FLOWS.md`](WORKER-FLOWS.md)                                                   | Quién corre TeamManager vs workers BullMQ                                  |
| [`OPENCLAW-ARCHITECTURE.md`](OPENCLAW-ARCHITECTURE.md)                                 | MCP + Orchestrator + LLM Gateway + Context Builder                         |
| [`design/OAR.md`](design/OAR.md)                                                       | Opsly Agentic Runtime (OAR): loops, MemoryInterface, AgentActionPort       |
| [`adr/ADR-027-hybrid-compute-plane-k8s.md`](adr/ADR-027-hybrid-compute-plane-k8s.md)   | Control plane Compose vs compute plane K8s (futuro, criterios)             |
| [`QUICKSTART-AGENTS.md`](QUICKSTART-AGENTS.md)                                         | Añadir tools MCP OpenClaw, tests, qué no duplicar                          |
| [`ORCHESTRATOR.md`](ORCHESTRATOR.md)                                                   | BullMQ jobs, workers, circuit breaker, prioridades                         |
| [`LLM-GATEWAY.md`](LLM-GATEWAY.md)                                                     | Cache Redis, routing bias, cost tracking                                   |
| [`TOKEN-BILLING-SYSTEM.md`](TOKEN-BILLING-SYSTEM.md)                                   | Tokens/créditos vs USD; qué existe hoy vs wallet prepago (roadmap)         |
| [`TOKEN-SYSTEM-GUIDE.md`](TOKEN-SYSTEM-GUIDE.md)                                       | Guía corta: ahorro, routing, presupuestos                                  |
| [`CONTEXT-BUILDER.md`](CONTEXT-BUILDER.md)                                             | Sesiones de agentes, TTL por plan, persistencia                            |
| [`AGENTS-GUIDE.md`](AGENTS-GUIDE.md)                                                   | Agentes paralelos, roles, límites por plan                                 |
| [`WORKER-TEAM-ARCHITECTURE.md`](WORKER-TEAM-ARCHITECTURE.md)                           | Equipos OpenClaw / roles vs `TeamManager` (roadmap)                        |
| [`WORKER-TEAM-BILLING.md`](WORKER-TEAM-BILLING.md)                                     | Billing workers: uso LLM, budgets, qué falta (CPU/mem)                     |

### 3. Decisiones de arquitectura (ADRs)

Índice completo de `docs/adr/` (un número = un archivo; sin duplicados).

| ADR                                                              | Decisión clave                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [ADR-001](adr/ADR-001-docker-compose-por-tenant.md)              | Docker Compose por tenant (no Swarm/K8s)                                |
| [ADR-002](adr/ADR-002-traefik-sobre-nginx.md)                    | Traefik v3 como reverse proxy                                           |
| [ADR-003](adr/ADR-003-doppler-secrets.md)                        | Doppler como gestor de secrets                                          |
| [ADR-004](adr/ADR-004-supabase-schema-por-tenant.md)             | Supabase con schema por tenant                                          |
| [ADR-005](adr/ADR-005-traefik-v3-1-docker-api.md)                | Traefik v3.3+ frente a Docker Engine 29.x                               |
| [ADR-006](adr/ADR-006-api-testing-vitest.md)                     | Tests de API con Vitest (Node)                                          |
| [ADR-007](adr/ADR-007-runbooks-y-documentacion-operativa.md)     | Estructura de runbooks y documentación operativa                        |
| [ADR-008](adr/ADR-008-terraform-digitalocean-plan.md)            | Terraform en DigitalOcean (plan sin apply automático)                   |
| [ADR-009](adr/ADR-009-openclaw-mcp-architecture.md)              | OpenClaw MCP Server Architecture                                        |
| [ADR-010](adr/ADR-010-llm-gateway.md)                            | LLM Gateway con Cache Redis                                             |
| [ADR-011](adr/ADR-011-event-driven-orchestrator.md)              | Orchestrator Event-Driven con BullMQ                                    |
| [ADR-012](adr/ADR-012-observability.md)                          | Observabilidad por tenant                                               |
| [ADR-013](adr/ADR-013-google-cloud-openSource-strategy.md)       | Google Cloud + Open Source Integration Strategy                         |
| [ADR-014](adr/ADR-014-notebooklm-agent.md)                       | NotebookLM Agent (EXPERIMENTAL)                                         |
| [ADR-015](adr/ADR-015-hermes-orchestrator-architecture.md)       | Hermes como servicio Docker separado                                    |
| [ADR-016](adr/ADR-016-legalvial-multitenant-model.md)            | LegalVial — modelo multi-tenant / aislamiento (notas + enlaces)         |
| [ADR-017](adr/ADR-017-worker-teams-billing-roadmap.md)           | Equipos de workers por tenant y billing ampliado (roadmap)              |
| [ADR-018](adr/ADR-018-pgvector-embeddings-rag.md)                | pgvector + Embeddings para RAG en decisiones Hermes                     |
| [ADR-019](adr/ADR-019-prometheus-grafana-observability.md)       | Prometheus + Grafana para observabilidad de plataforma                  |
| [ADR-020](adr/ADR-020-orchestrator-worker-separation.md)         | Separación control plane (VPS) ↔ worker plane (remoto)                  |
| [ADR-021](adr/ADR-021-predictive-bi-scalability.md)              | Escalabilidad — Predictive BI Engine                                    |
| [ADR-022](adr/ADR-022-di-pattern-testability.md)                 | Dependency Injection sobre vi.mock para módulos con singletons          |
| [ADR-023](adr/ADR-023-approval-gate-phase1.md)                   | Approval Gate — Fase 1 (MVP)                                            |
| [ADR-024](adr/ADR-024-ollama-local-worker-primary.md)            | Ollama local como worker primario (costo/latencia)                      |
| [ADR-025](adr/ADR-025-notebooklm-knowledge-layer.md)             | NotebookLM como knowledge layer (EXPERIMENTAL)                          |
| [ADR-026](adr/ADR-026-tenant-context-postgres-first.md)          | Contexto tenant: Postgres-first (cache/invalidación)                    |
| [ADR-027](adr/ADR-027-hybrid-compute-plane-k8s.md)               | Compute plane híbrido (K8s opcional) vs control plane Compose           |
| [ADR-028](adr/ADR-028-tenant-onboarding-pattern.md)              | Onboarding por tenant: plantilla + `config/tenants/*.json`              |
| [ADR-029](adr/ADR-029-infrastructure-layers-shared-vs-tenant.md) | Capas: plataforma compartida vs runtime dedicado por tenant             |
| [ADR-030](adr/ADR-030-prepaid-token-wallet-roadmap.md)           | Wallet prepago y “tokens” de cuenta (roadmap)                           |
| [ADR-031](adr/ADR-031-token-optimization-ollama-primary.md)      | Optimización de tokens + Ollama primary (doc paralela; ver ADR-024)     |
| [ADR-032](adr/ADR-032-scripts-organization.md)                   | Scripts por categoría + wrappers compatibilidad                         |
| [ADR-033](adr/ADR-033-docs-canonicalization.md)                  | Canon docs + `docs/generated/*.auto.md` + historial en `history/plans/` |
| [ADR-034](adr/ADR-034-ci-hygiene.md)                             | Higiene CI y docs-governance (relacionado con ADR-033)                   |
| [ADR-035](adr/ADR-035-openclaw-per-tenant.md)                    | OpenClaw Context Builder + MCP per-tenant (PROPOSED)                    |
| [ADR-036](adr/ADR-036-cli-consolidation-tools-cli-first.md)      | Consolidación CLI `tools/cli` → `apps/cli` (propuesto)                  |

### 4. Infra y deploy

| Doc                                                                | Cuándo usarlo                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [`VPS-ARCHITECTURE.md`](VPS-ARCHITECTURE.md)                       | Topología VPS, Traefik, IPs, puertos                                     |
| [`DOPPLER-VARS.md`](DOPPLER-VARS.md)                               | Variables por entorno (`prd`, `stg`)                                     |
| [`GITHUB-TOKEN.md`](GITHUB-TOKEN.md)                               | PAT GitHub: `GITHUB_TOKEN` (canónico) vs `GITHUB_TOKEN_N8N` (legado n8n) |
| [`MONITORING.md`](MONITORING.md)                                   | Prometheus + Node Exporter en `infra/` (métricas Admin)                  |
| [`CLOUDFLARE-PROXY-ACTIVATION.md`](CLOUDFLARE-PROXY-ACTIVATION.md) | Activar proxy CF naranja                                                 |
| [`DEPLOY-VPS-AND-INDEX.md`](DEPLOY-VPS-AND-INDEX.md)               | Deploy completo en VPS paso a paso                                       |
| [`CICD-VPS.md`](CICD-VPS.md)                                       | GitHub Actions: rama `staging` → VPS staging; `main` → prod              |
| [`SESSION-GIT-SYNC.md`](SESSION-GIT-SYNC.md)                       | `git pull` / `git-sync-repo.sh` en opsly-admin, opsly-worker y VPS       |
| [`AUTO-PUSH-WATCHER.md`](AUTO-PUSH-WATCHER.md)                     | Servicio cursor-prompt-monitor en VPS                                    |
| [`infra/terraform/README.md`](../infra/terraform/README.md)        | IaC Terraform DigitalOcean                                               |

### 5. Billing y Stripe

| Doc                                                      | Cuándo usarlo                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`BILLING-USD-DIAGRAMS.md`](BILLING-USD-DIAGRAMS.md)     | Diagramas Mermaid: USD, enforcement, admin `/costs`, vs wallet ADR-017 |
| [`WALLET-PREPAID-ROADMAP.md`](WALLET-PREPAID-ROADMAP.md) | Wallet prepago pausado — prerequisitos                                 |
| [`BILLING-FLUSH-VERCEL.md`](BILLING-FLUSH-VERCEL.md)     | Cron metered billing, flush Redis → Stripe                             |
| [`REFACTOR-CHECKLIST.md`](REFACTOR-CHECKLIST.md)         | Checklist de variables manuales (Stripe price IDs)                     |

### 6. Seguridad

| Doc                                                                        | Cuándo usarlo                                    |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| [`SECURITY_CHECKLIST.md`](SECURITY_CHECKLIST.md)                           | Zero-Trust por ruta API — revisar antes de merge |
| [`SECURITY_AUDIT_REPORT.md`](SECURITY_AUDIT_REPORT.md)                     | Auditoría de seguridad completa                  |
| [`ARCHITECT-SECURITY-REVIEW.md`](ARCHITECT-SECURITY-REVIEW.md)             | Review arquitectónica de seguridad               |
| [`SECURITY-MITIGATIONS-2026-04-09.md`](SECURITY-MITIGATIONS-2026-04-09.md) | UFW + Tailscale + Cloudflare paso a paso         |

### 7. Operación y runbooks

| Doc                                                            | Cuándo usarlo                                                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`runbooks/admin.md`](runbooks/admin.md)                       | Ops día a día del administrador                                         |
| [`runbooks/dev.md`](runbooks/dev.md)                           | Setup y workflows del desarrollador                                     |
| [`runbooks/incident.md`](runbooks/incident.md)                 | Respuesta a incidentes paso a paso                                      |
| [`runbooks/managed.md`](runbooks/managed.md)                   | Runbook para tenants managed                                            |
| [`INVITATIONS_RUNBOOK.md`](INVITATIONS_RUNBOOK.md)             | Flujo completo de invitaciones                                          |
| [`TENANT-TESTING-PLAN.md`](TENANT-TESTING-PLAN.md)             | Checklist corto: URLs y pasos para tenants en staging                   |
| [`TENANT-TESTING-GUIDE.md`](TENANT-TESTING-GUIDE.md)           | Guía ampliada de verificación n8n / Uptime / portal                     |
| [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)                     | Diagnóstico: Traefik, Docker, Supabase, Doppler                         |
| [`FAQ.md`](FAQ.md)                                             | Preguntas frecuentes con respuestas directas                            |
| [`FAILOVER-RUNBOOK.md`](FAILOVER-RUNBOOK.md)                   | Detección, alertas y failover (segundo origen + LB; manual por defecto) |
| [`FAILOVER-GCP-ARCHITECTURE.md`](FAILOVER-GCP-ARCHITECTURE.md) | Standby GCP (e2-micro) vs segundo VPS; diagramas y límites              |
| [`GCP-STANDBY-CONFIG.md`](GCP-STANDBY-CONFIG.md)               | Redis 1 GB, health ligero, orden de despliegue                          |
| [`GCP-ACTIVATION-CHECKLIST.md`](GCP-ACTIVATION-CHECKLIST.md)   | Checklist activación proyecto opslyquantum + LB                         |

### 8. Automatización y IA

| Doc                                                                  | Cuándo usarlo                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`AUTOMATION-PLAN.md`](AUTOMATION-PLAN.md)                           | Loop Discord → GitHub → Cursor                                                    |
| [`N8N-SETUP.md`](N8N-SETUP.md)                                       | n8n Discord→GitHub; Doppler `N8N_WEBHOOK_SECRET_GH` (legado `N8N_WEBHOOK_SECRET`) |
| [`N8N-IMPORT-GUIDE.md`](N8N-IMPORT-GUIDE.md)                         | Importar workflows n8n                                                            |
| [`02-tools/N8N-MCP-INTEGRATION.md`](02-tools/N8N-MCP-INTEGRATION.md) | MCP **n8n-mcp** (Cursor + Docker opcional) junto a OpenClaw                       |
| [`OBSERVABILITY.md`](OBSERVABILITY.md)                               | Métricas, logs, alertas, Prometheus                                               |
| [`PERFORMANCE_BASELINE.md`](PERFORMANCE_BASELINE.md)                 | Baselines de performance por endpoint                                             |
| [`CLAUDE-WORKFLOW-OPTIMIZATION.md`](CLAUDE-WORKFLOW-OPTIMIZATION.md) | Optimización de sesiones con Claude                                               |

### 9. Google Cloud y Drive

| Doc                                                        | Cuándo usarlo                       |
| ---------------------------------------------------------- | ----------------------------------- |
| [`GOOGLE-CLOUD-SETUP.md`](GOOGLE-CLOUD-SETUP.md)           | Setup inicial GCP + service account |
| [`GOOGLE-CLOUD-ACTIVATION.md`](GOOGLE-CLOUD-ACTIVATION.md) | Activación BigQuery + Vertex AI     |
| [`GOOGLE-DRIVE-SYNC.md`](GOOGLE-DRIVE-SYNC.md)             | Sync Drive: SA vs OAuth usuario     |

### 10. Tenants y portal

| Doc                                                                                | Cuándo usarlo                           |
| ---------------------------------------------------------------------------------- | --------------------------------------- |
| [`LOCALRANK-TESTER-GUIDE.md`](LOCALRANK-TESTER-GUIDE.md)                           | Onboarding del tenant LocalRank         |
| [`SSH-COMMANDS-LOCALRANK.md`](SSH-COMMANDS-LOCALRANK.md)                           | Comandos SSH específicos para LocalRank |
| [`EXECUTION-PLAN-LOCALRANK-NOTEBOOKLM.md`](EXECUTION-PLAN-LOCALRANK-NOTEBOOKLM.md) | Plan ejecución NotebookLM + LocalRank   |
| [`ADMIN-ECOSYSTEM.md`](ADMIN-ECOSYSTEM.md)                                         | Ecosistema panel admin completo         |

### 11. Testing y calidad

| Doc                                                | Cuándo usarlo                        |
| -------------------------------------------------- | ------------------------------------ |
| [`TEST_PLAN.md`](TEST_PLAN.md)                     | Plan de pruebas por componente       |
| [`qa/README.md`](qa/README.md)                     | **QA UI multi-ambiente:** checklist tester, prompt IA → Cursor, script copia |
| [`QA-REVIEW-COMPLETE.md`](01-development/QA-REVIEW-COMPLETE.md) | QA review completa del sistema       |
| [`LIBRARIES-INSTALLED.md`](LIBRARIES-INSTALLED.md) | Librerías instaladas y justificación |

### 12. Skills y agentes Claude

| Doc                                          | Cuándo usarlo                         |
| -------------------------------------------- | ------------------------------------- |
| [`../skills/README.md`](../skills/README.md) | Índice de skills, cómo usar manifests |

**Mantener este índice:** edita el `.md` correspondiente, `git add` / `commit` / `push`, y actualiza esta tabla si añades documentos nuevos.

---

## Quick Links

- **GitHub:** https://github.com/cloudsysops/opsly
- **Supabase:** https://app.supabase.com
- **Stripe:** https://dashboard.stripe.com
- **Admin Dashboard:** https://admin.ops.smiletripcare.com (Tailscale)
- **API Docs:** Auto-generated from OpenAPI spec (see IMPLEMENTATION-IA-LAYER.md)

---

**Last updated:** 2026-05-08  
**Version:** 2.1  
**Status:** ✅ Active
