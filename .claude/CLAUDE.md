---
status: canonical
owner: operations
last_review: 2026-05-24
type: config
tags: [opsly/claude-config]
---

# CLAUDE.md — Opsly Codebase Guide

**Version:** 2.2 | **Project:** cloudsysops/opsly | **Model role:** Architect/Reviewer

---

## SESSION STARTUP

1. Read (in order): [AGENTS.md](https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md) → [VISION.md](https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md)
2. `bash scripts/git-session-brief.sh` para ver **rama + tema + áreas tocadas**; al cambiar de rama, el hook `post-checkout` lo repite automáticamente
3. `git status && git log --oneline -3`
4. `bash .claude/hooks/opsly-session-start-skills.sh` o `node scripts/skill-finder.js "your task" --autonomous`

**Abort if:** Doppler secrets missing · AGENTS.md >7 days stale · VPS/Redis unreachable

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

1. Run `npm run validate-agent-contract` before work.
2. Generate a task brief: `npm run agent:brief -- --agent claude --task "..."`.
3. Load only the skills returned by the brief; never autoload the full catalog.
4. Need project context? → `brain:research` MCP tool (~300 tokens vs 5000).
5. Need code search? → `rg` locally.
6. Need architecture? → AGENTS.md + VISION.md.
7. Last resort → ask user.

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

## LIB MODULES (18)

Full registry: `config/modules.json` · Governance: `lib/{module}/GOVERNANCE.md`

Core: `prompts` · `observability` · `components` · `evaluation` · `content-studio` · `errors` · `services` · `config` · `security` · `api` · `workflow` · `telemetry` · `testing` · `migrations` · `runtime` · `session-manager` · `git-branch-orchestrator` · `external-agent-registry`

New module only if: reusable by 2+ apps · >100 lines · stable API.

---

## APPS (27)

Core production: `api:3000` · `admin:3001` · `portal:3002` · `mcp:3003` · `orchestrator:3011` · `llm-gateway:3010` · `context-builder:3012` · `peskids` · `billing-service` · `billing-dashboard` · `rendering-engine` · `tenant-onboarding-agent` · `tenant-invitations` · `slack-bot` · `web` · `mcp-gateway` · `notion-mcp` · `task-orchestrator` · `agent-manager`

Experimental: `agents` · `notebooklm-agent` · `ml` · `airflow` · `mcp-rendering-server` · `context-builder-v2` (staging) · `local-services` (active dev) · `experimental`

Full detail: `ls apps/` or see `docs/02-architecture/`

---

## GIT PROTOCOL (mandatory for all agents)

```bash
git add -A
git commit -m "feat(scope): description"
git push origin <branch-name>
# After push:
gh pr create --draft --base main --head <branch-name>
```

Commit format: `feat|fix|docs|refactor|test|chore(scope): description`

## BRANCH / THEME DISCIPLINE

- Una sesión = una rama = un tema.
- Si el worktree toca más de un tema grande, dividir antes de editar.
- Si estás en `main` con cambios locales, crear rama primero.
- Si la rama no representa el tema, renombrar o recrear la rama antes de seguir.

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
