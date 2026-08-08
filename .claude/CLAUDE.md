---
status: canonical
owner: operations
last_review: 2026-08-08
type: config
tags: [opsly/claude-config]
---

# CLAUDE.md — Opsly Codebase Guide

**Version:** 2.3 | **Project:** cloudsysops/opsly | **Model role:** Architect/Reviewer | **Updated:** 2026-08-08

---

## SESSION STARTUP

1. **Read context** (in order): 
   - [AGENTS.md](https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md) — operational state, next steps, blockers by session
   - [VISION.md](https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md) — product direction, north star
   
2. **Check git state:**
   ```bash
   git status && git log --oneline -3
   bash scripts/git-session-brief.sh  # rama + tema + áreas tocadas
   ```

3. **Load skills for your task:**
   ```bash
   node scripts/skill-finder.js "your task description" --autonomous
   ```

4. **Verify critical dependencies:**
   - Doppler secrets accessible: `doppler run -- echo "OK"`
   - AGENTS.md last review <7 days old
   - VPS reachable (if needed): `npm run opsly:tailscale:ping`
   - Redis working (for orchestrator jobs): `redis-cli ping`

**Abort session if:** Doppler unavailable · AGENTS.md stale (>7 days) · VPS unreachable (prod tasks)

---

## ABSOLUTE RULES

- NEVER: K8s/Swarm/nginx (no ADR), secrets in code, `any` in TS, skip `validate-config.sh`, `terraform apply` without plan
- ALWAYS: read AGENTS.md first, use OpenClaw, use skill-finder, follow `docs/01-development/GIT-WORKFLOW.md`
- Git: feature branches only — no direct push to `main` (exception: doc-only closes per policy)

---

## STACK & INFRA

| Service         | Port |
|----------------|------|
| api             | 3000 |
| admin           | 3001 |
| portal          | 3002 |
| mcp             | 3003 |
| llm-gateway     | 3010 |
| orchestrator    | 3011 |
| context-builder | 3012 |

- **VPS:** `vps-dragon@100.120.151.91` (Tailscale only) · `/opt/opsly`
- **Doppler:** `ops-intcloudsysops / prd`
- **Supabase:** `jkwykpldnitavhmtuzmo`
- **GitHub:** `cloudsysops/opsly`

---

## AUTONOMY RULES

**Auto-execute:** file reads/search · `npm run type-check` · `npm run test` · `npm run validate-*` · `git status/log`

**Require confirmation:** prod deploy · `docker system prune --volumes` · `terraform apply` · `.env`/Doppler edits · new SQL migration · destructive Supabase changes

**Escalate when:** `confidence < 0.3` · `intent = "deploy"` · unknown domain

---

## TOKEN OPTIMIZATION

1. Need project context? → `brain:research` MCP tool (~300 tokens vs 5000)
2. Need code search? → `grep`/`find` locally
3. Need architecture? → AGENTS.md + VISION.md
4. Last resort → ask user

---

## SKILLS INDEX

Use `node scripts/skill-finder.js "<query>" --autonomous` to get the right skill. Key skills:

| Priority | Skill | When |
|----------|-------|------|
| CRITICAL | `opsly-context` | Session bootstrap |
| CRITICAL | `opsly-quantum` | Full monorepo diagnosis |
| CRITICAL | `opsly-autonomous` | No-confirmation mode |
| CRITICAL | `opsly-skill-creator` | Create/improve skills |
| HIGH | `opsly-api` | apps/api routes |
| HIGH | `opsly-supabase` | SQL migrations, RLS |
| HIGH | `opsly-frontend` | Portal, Admin, React |
| HIGH | `opsly-infra` | Docker, VPS, deploy |
| HIGH | `opsly-llm` | LLM Gateway |
| HIGH | `opsly-mcp` | MCP tools |
| HIGH | `opsly-orchestrator` | OAR, BullMQ, n8n |
| HIGH | `opsly-billing` | Stripe subscriptions |
| HIGH | `opsly-shield` | Guardian Grid, secret scan |
| HIGH | `opsly-architect-senior` | ADRs, risk analysis |
| HIGH | `opsly-tenant` | Onboarding, stacks |
| MEDIUM | `opsly-content-studio` | Content generation |
| MEDIUM | `opsly-qa` | Testing, smoke, audit |
| MEDIUM | `opsly-discord` | Alerts, notifications |
| LOW | `opsly-notebooklm` | PDF→podcast (experimental) |

Templates: `skills/templates/` — `template-api-route.md`, `template-migration.md`, `template-mcp-tool.md`, `template-test.md`

---

## AGENT SKILLS BRIDGE

**Integrated:** Addy Osmani's 23 production-grade skills (https://github.com/addyosmani/agent-skills)  
**Adapter:** `opsly-agent-skills-bridge` bridges agent-skills to Opsly domain patterns  
**Location:** `vendor/agent-skills/` + `skills/user/opsly-agent-skills-bridge/`

### Usage

Load skills by development phase + domain context:

```bash
# Define (spec, requirements, ADR)
node scripts/load-agent-skills.js --phase define --context api

# Plan (task breakdown, Hive slicing)
node scripts/load-agent-skills.js --phase plan --context orchestrator

# Build (TDD + multi-tenant isolation)
node scripts/load-agent-skills.js --phase build --context api

# Verify (browser tests, debugging)
node scripts/load-agent-skills.js --phase verify

# Review (code quality, security audit)
node scripts/load-agent-skills.js --phase review --context security

# Simplify (clarity, extract to lib/)
node scripts/load-agent-skills.js --phase simplify

# Ship (canary deploy, feature flags)
node scripts/load-agent-skills.js --phase ship --context infra

# List all skills
node scripts/load-agent-skills.js --list-all
```

### Domains

- **api:** OpenAPI spec + Zod validation, multi-tenant isolation, rate limiting
- **frontend:** React components, a11y, CLS/LCP, dark mode
- **orchestrator:** BullMQ jobs, Hive subtasks, error recovery, retry logic
- **test:** Multi-tenant isolation in tests, Vitest + mocks, coverage gates
- **security:** Doppler secrets, Zero-Trust validation, Cyber Neo scans, audit logs
- **infra:** Docker Compose (no K8s default), Traefik, VPS, canary deploy

### Opsly Guardrails (Always Applied)

✅ **TypeScript:** No `any` (always specific types)  
✅ **Multi-tenant:** `tenant_slug` on every scope boundary  
✅ **Secrets:** Doppler only (never hardcoded)  
✅ **Zero-Trust:** Portal routes validate `resolveTrustedPortalSession()`  
✅ **Composition:** Docker Compose (no K8s default)  
✅ **Testing:** Vitest + multi-tenant isolation  
✅ **CI:** Type-check, tests, coverage gates before merge

**If agent-skills conflicts with these guardrails, Opsly rules win.**

### References

- **Guide:** `docs/01-development/AGENT-SKILLS-INTEGRATION.md`
- **Bridge Skill:** `skills/user/opsly-agent-skills-bridge/SKILL.md`
- **Loader Script:** `scripts/load-agent-skills.js`
- **Agent-skills Repo:** https://github.com/addyosmani/agent-skills

---

## CODE RULES

- **Reuse first:** check `lib/` before writing new logic
- **Imports:** `@intcloudsysops/{module}` — never relative paths to lib
- **Data access:** Repository pattern via `lib/services/`
- **No `any`** in TypeScript — always specific types
- **Errors:** `@intcloudsysops/errors`
- **Validation:** at system boundaries only (user input, external APIs)
- **Tests:** required for `lib/` logic; optional for app-specific UI

**New API route:** `apps/api/app/{feature}/route.ts` → Repository → Zod → auth middleware → update `apps/api/openapi.json`

**New migration:** `npm run migrations:create --workspace=@intcloudsysops/migrations` → SQL with RLS → `npm run db:migrate` → `npm run db:codegen`

**Shield features:** `apps/api/app/shield/` · tables: `shield_alert_config`, `shield_score_history`, `shield_secret_findings` · test with `SHIELD_SECRET_SCAN_SIMULATE=true`

---

## LIB MODULES (30)

**Full registry:** `config/modules.json` · **Governance:** `lib/{module}/GOVERNANCE.md`

**Core (stable):** 
- `prompts` · `observability` · `components` · `evaluation` · `errors` · `services` · `config` · `security` · `api` · `workflow` · `telemetry` · `testing` · `migrations` · `runtime`
- `session-manager` · `git-branch-orchestrator` · `external-agent-registry` · `content-studio` · `pattern-catalog` · `prompt-guard`
- `capacity-alert` · `sigma-harness` · `voice-messaging` · `mission-control-kit` (multi-tenant MC contracts)

**Experimental/Domain-specific:**
- `conversational-runtime` (channel layer over opsly-core)
- `wompi-gateway` (Colombia payments, LatAm variant of Stripe)
- `openwa` · `whatsapp` · `wacrm-channel` (WhatsApp integrations)
- `tenant-profile` (profile aggregation)

**Criteria for new module:** reusable by 2+ apps · stable API · <governance>
**Breaking changes:** require ADR

---

## APPS (31)

**Core production platform:**
- **API Layer:** `api:3000` (core GraphQL/REST) · `llm-gateway:3010` (LLM routing)
- **Control Plane:** `admin:3001` (Opsly Moon admin) · `portal:3002` (tenant portal) · `orchestrator:3011` (OAR/BullMQ jobs)
- **Infrastructure:** `context-builder:3012` (multi-tenant context) · `mcp:3003` (tool registry)
- **Core services:** `billing-service` · `billing-dashboard` · `rendering-engine` · `slack-bot` · `task-orchestrator`
- **Multi-tenant agents:** `tenant-onboarding-agent` · `tenant-invitations` · `agent-manager` · `notion-mcp`

**Production tenants:**
- `peskids` (learning platform) · `intcloudsysops` (internal platform) · `icso` (ICSO agency) · `smiletripcare` (healthcare)
- `panini-lab` (partner) · `notebooklm-agent` (Google NotebookLM adapter)

**Developer/Experimental:**
- `local-services` (Docker dev services) · `ml` (ML experiments) · `agents` (agent testing)
- `mcp-rendering-server` · `task-orchestrator` · `airflow` (workflow scheduling)
- `experimental` · `web` (legacy/archive)

**Full listing & detail:** `ls apps/` or `docs/02-architecture/APPS-REGISTRY.md`

---

## GIT PROTOCOL (mandatory for all agents)

**For all changes:** follow `docs/01-development/GIT-WORKFLOW.md` (read it once per session).

**Standard flow:**
```bash
# 1. Sync & create branch
git fetch origin && git checkout main && git pull --ff-only
git checkout -b feat/<short-topic> 

# 2. Make changes, test
npm run type-check && npm run test

# 3. Commit & push
git add -A
git commit -m "feat(scope): clear description"
git push -u origin <branch-name>

# 4. Open PR (required)
# After push: create PR (draft OK) toward main
```

**Commit format:** `feat|fix|docs|refactor|test|chore(scope): description` (Conventional Commits)

**Production merge windows:** 
- **Peskids prod changes** → nighttime only (`America/Bogota` 22:00–06:00) 
- **Safe tags:** `safe-daytime` / `hotfix-prod` for exceptions
- See: `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`

## BRANCH / THEME DISCIPLINE

- **One session = one branch = one theme.** If worktree mixes multiple major areas, split before editing.
- **Temporary agent branches** (`cursor/*`, `claude/*`) are auto-cleanup — PR or close + delete when done.
- **Never** accumulate weeks of work in one agent branch without integrating.
- **If branch no longer matches theme:** create new branch or worktree before continuing.
- **Allowed root .md files:** `AGENTS.md`, `README.md`, `ROADMAP.md`, `VISION.md`, `SECURITY.md`, `CONTRIBUTING.md` (see `config/root-whitelist.json`)

---

## SECURITY

- Secrets: Doppler only — `doppler run --project ops-intcloudsysops --config prd -- <cmd>`
- Never commit `.env`, never log tokens/keys
- Multi-tenant isolation via RLS · JWT on all endpoints · Zod on all inputs

---

## AGENT ROLES

| Agent | Role |
|-------|------|
| Claude | Architecture, decisions, unblocking |
| Cursor | Code execution, commits |
| AGENTS.md | Shared memory across sessions |

OAR agents: `OrchestratorAgent` (BullMQ/Temporal) · `OpsAgent` (health/deploy) · `BillingAgent` (Stripe) · `SecurityAgent` (Guardian Grid)

VPS orchestrator mode: `OPSLY_ORCHESTRATOR_MODE=queue-only` · Remote worker: `worker-enabled` + `REDIS_URL=redis://100.120.151.91:6379`

---

## CANONICAL DOCS (protected — no edits without governance)

`VISION.md` · `ROADMAP.md` · `AGENTS.md` · `SPRINT-TRACKER.md` · `docs/README.md` · `docs/index.md` · `docs/STRUCTURE-GUARDRAILS.md` · `config/docs-root-allowlist.json` · `config/modules.json`

---

## SESSION CLOSE

```bash
git status && git diff --stat
# Update AGENTS.md: completed / blockers / next steps
git add AGENTS.md && git commit -m "docs(agents): session update $(date +%Y-%m-%d)"
git push origin <branch-name>
```

---

## BRAIN / SHARED KNOWLEDGE

All agents share: `docs/03-agents/AGENT-BRAIN-CONTRACT.md` · `config/knowledge-index.json` · `docs/brain/` (Obsidian vault) · `apps/mcp/src/tools/graphyfi.ts`

Do not create parallel Claude memory — use shared brain.

---

*Related: [[.claude/README]] · [[README]]*
