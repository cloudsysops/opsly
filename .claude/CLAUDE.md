# CLAUDE.md — Opsly Codebase Guide for AI Assistants

**Last Updated:** 2026-05-21  
**Status:** Canonical guide for all Claude sessions in Opsly  
**Version:** 2.0 (Enhanced with full codebase structure)

---

## 🚀 SESSION STARTUP PROTOCOL

### Immediate Actions (First 5 minutes)

1. **Read canonical documents** (in order):
   - 📖 [`AGENTS.md`](https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md) — operational status + next steps
   - 🎯 [`VISION.md`](https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md) — product north star
   - 📚 [`docs/README.md`](docs/README.md) — documentation index

2. **Verify git state** (should execute instantly):
   ```bash
   git status
   git log --oneline -3
   git branch -v
   ```

3. **Load skills for your context** (if needed):
   ```bash
   node scripts/skill-finder.js "your task here" --autonomous
   ```

4. **Check infrastructure** (critical for deployment tasks only):
   ```bash
   # VPS status
   ssh vps-dragon@100.120.151.91 "docker ps --format '{{.Names}}\t{{.Status}}'"
   
   # Doppler secrets health
   doppler run --project ops-intcloudsysops --config prd -- print-env | grep -E "DISCORD|RESEND|GITHUB|NOTEBOOKLM"
   ```

### Abort Conditions

Stop and report if:
- Git status shows uncommitted critical changes (safety check)
- Doppler secrets are missing (ask user before continuing)
- AGENTS.md is older than 7 days (may be stale context)
- Infrastructure health check fails (VPS/Redis unreachable)

---

# Claude en Opsly — Sistema Autónomo

---

## 📁 Codebase Structure (Monorepo: Turbo + pnpm)

### Quick Navigator

```
opsly/
├── apps/                          # 27+ applications (see below)
├── lib/                           # 13 enterprise-scale library modules
├── packages/                      # Shared utilities & skills
├── docs/                          # Documentation (Obsidian vault + markdown)
├── config/                        # Configuration & metadata
├── scripts/                       # Operational scripts & automation
├── .claude/                       # Claude-specific configurations
├── .cursor/                       # Cursor IDE configurations
├── .codex/                        # GitHub Copilot configurations
├── AGENTS.md                      # Operational status (READ THIS FIRST)
├── VISION.md                      # Product north star
├── ROADMAP.md                     # Sprint timeline & milestones
└── CLAUDE.md                      # This file
```

### 📦 apps/ — Main Applications (27 deployable services)

| App | Purpose | Type | Port | Status |
|-----|---------|------|------|--------|
| **api** | REST API server, tenant isolation, business logic | Node.js | 3000 | Production |
| **admin** | Admin dashboard, metrics, cost tracking | Next.js | 3001 | Production |
| **portal** | Customer-facing portal | Next.js | 3002 | Production |
| **mcp** | Model Context Protocol server (Claude integration) | Node.js | 3003 | Production |
| **orchestrator** | Job orchestration, BullMQ, Temporal | Node.js | 3011 | Production |
| **llm-gateway** | Unified LLM provider gateway | Node.js | 3010 | Production |
| **context-builder** | Context aggregation for agents | Node.js | 3012 | Production |
| **agents** | Internal AI agent implementations | Node.js | — | Experimental |
| **local-services** | Local dev services, booking, customers | Node.js | — | Active Development |
| **billing-service** | Stripe integration, metering | Node.js | — | Production |
| **billing-dashboard** | Billing analytics & invoicing | Next.js | — | Production |
| **notebooklm-agent** | PDF→podcast generation | Node.js | — | Experimental |
| **tenant-onboarding-agent** | Automated tenant setup | Node.js | — | Production |
| **tenant-invitations** | Invitation system | Node.js | — | Production |
| **slack-bot** | Slack integration & notifications | Node.js | — | Production |
| **web** | Public website | Next.js | — | Production |
| **peskids** | Multi-channel form platform | Next.js | — | Active Development |
| **ml** | ML pipeline runner | TypeScript | — | Experimental |
| **airflow** | Airflow DAG definitions | Python | — | Experimental |
| **mcp-gateway** | MCP routing layer | Node.js | — | Production |
| **mcp-rendering-server** | MCP content rendering | Node.js | — | Experimental |
| **notion-mcp** | Notion integration | Node.js | — | Production |
| **task-orchestrator** | Task queue manager | Node.js | — | Production |
| **agent-manager** | Agent lifecycle management | Node.js | — | Production |
| **context-builder-v2** | Next-gen context builder (Shadow deploy) | Node.js | — | Staging |
| **experimental** | Experimental features | Various | — | Not for Prod |
| **__tests__** | End-to-end test suite | Vitest | — | CI/CD |

### 📚 lib/ — Enterprise Library Modules (13 modules)

**Location:** `lib/{module}` with `package.json` exported as `@intcloudsysops/{module}`

| Module | Purpose | Owner | Status |
|--------|---------|-------|--------|
| **api** | HTTP utils, request handling, middleware | claude | Stable |
| **components** | React component library + design system | claude | Stable |
| **config** | Environment vars, feature flags, secrets | claude | Stable |
| **errors** | Unified error handling + types | claude | Stable |
| **evaluation** | Testing utils, validators, safety checks | claude | Stable |
| **external-agent-registry** | External agent registry & discovery | claude | Active |
| **git-branch-orchestrator** | Git workflow automation | claude | Active |
| **migrations** | Database migration versioning | claude | Stable |
| **observability** | Logging, metrics, distributed tracing | claude | Stable |
| **prompts** | Versioned prompt registry for all agents | claude | Stable |
| **runtime** | Agent runtime, execution engine | claude | Active |
| **security** | Auth, encryption, PII redaction | claude | Stable |
| **services** | Repository pattern + data layer | claude | Stable |
| **telemetry** | Cost tracking, performance monitoring | claude | Stable |
| **testing** | Unified test framework setup | claude | Stable |
| **session-manager** | Session lifecycle, recovery | claude | Active |
| **workflow** | Safe execution, timeouts, retries | claude | Stable |

### 📄 docs/ — Documentation Structure

**Single source of truth:** Obsidian vault + markdown (synced via `npm run docs:sync`)

```
docs/
├── 01-development/           # Dev guides, workflows, conventions
├── 02-architecture/          # ADRs, system design, patterns
├── 03-agents/                # Agent-specific docs, orchestration
├── 04-operations/            # Runbooks, deployment, monitoring
├── adr/                       # Architecture Decision Records (ADR-001+)
├── brain/                     # Knowledge vault for RAG
├── database/                  # Schema, migrations, queries
├── design/                    # Design patterns, UI/component docs
├── infrastructure/            # VPS, Docker, networking
├── ops/                       # Operational procedures, checklists
├── orchestrator/              # Orchestration guides, repair queue
├── plans/                     # Sprint plans, feature plans
├── generated/                 # Auto-generated docs (DO NOT EDIT)
├── stubs/                     # Redirect files (keep root clean)
├── README.md                  # Documentation index
├── STRUCTURE-GUARDRAILS.md    # Where docs may live (protected)
└── index.md                   # Obsidian MOC (compact reference)
```

---

## Framework: OpenClaw

OpenClaw es el **framework de orquestación multi-agente** de Opsly. Ver `.openclaw.md` para configuración completa.

### Componentes OpenClaw

| Componente      | Puerto |
| --------------- | ------ |
| MCP Server      | 3003   |
| Orchestrator    | 3011   |
| LLM Gateway     | 3010   |
| Context Builder | 3012   |

## Sistema de Skills (Auto-activación)

**Regla central:** buscar skill existente primero; si no hay match adecuado, crear o extender skill por módulo usando `opsly-skill-creator`.

**Shared catalog para herramientas externas/internas:** `/mnt/skills/index.json` + `/mnt/skills/user/*` (publicar con `npm run skills:sync:external`).

### CLI de Skills

```bash
# Buscar skills por query
node scripts/skill-finder.js "crear api route"

# Modo autónomo (genera cadena)
node scripts/skill-finder.js "mcp tool oauth" --autonomous

# Auto-cargar skills
node scripts/skill-loader.js --context "deploy"

# Validar todos los manifests
bash scripts/skill-autoload.sh validate

# Hook de autoload
source scripts/skill-hooks.sh
skill_autoload "mi query"
```

### Índice de Skills (v3.0)

| Priority   | Skill                    | Category       | Usage                                      |
| ---------- | ------------------------ | -------------- | ------------------------------------------ |
| CRITICAL   | `opsly-context`          | bootstrap      | SIEMPRE al inicio de cualquier sesión      |
| CRITICAL   | `opsly-quantum`          | master         | Visión completa del monorepo + diagnóstico |
| CRITICAL   | `opsly-autonomous`       | autonomy       | Modo autónomo sin confirmación humana      |
| CRITICAL   | `opsly-skill-creator`    | tooling        | Crear/mejorar skills                       |
| HIGH       | `opsly-api`              | development    | Rutas en apps/api                          |
| HIGH       | `opsly-bash`             | development    | Scripts en scripts/                        |
| HIGH       | `opsly-frontend`         | development    | Portal, Admin, UI React                    |
| HIGH       | `opsly-supabase`         | database       | Migraciones SQL, RLS                       |
| HIGH       | `opsly-infra`            | infrastructure | Docker, Compose, VPS, deploy               |
| HIGH       | `opsly-llm`              | ai             | LLM Gateway, providers, cache              |
| HIGH       | `opsly-mcp`              | integration    | MCP OpenClaw tools                         |
| HIGH       | `opsly-tenant`           | operations     | Onboarding, suspensión, stacks             |
| HIGH       | `opsly-orchestrator`     | orchestration  | OAR, workflows, n8n                        |
| HIGH       | `opsly-billing`          | billing        | Stripe subscriptions, invoices             |
| HIGH       | `opsly-architect-senior` | architecture   | Diagnóstico, ADRs, riesgos                 |
| MEDIUM     | `opsly-agent-teams`      | orchestration  | BullMQ, colas paralelas                    |
| MEDIUM     | `opsly-qa`               | qa             | Testing, smoke, audit                      |
| MEDIUM     | `opsly-discord`          | notifications  | Notificaciones Discord                     |
| MEDIUM     | `opsly-feedback-ml`      | ai             | Feedback loop, decisiones ML               |
| MEDIUM     | `opsly-google-cloud`     | integration    | Google Cloud services                      |
| LOW        | `opsly-notebooklm`       | ai             | PDF→podcast (EXPERIMENTAL)                 |
| LOW        | `opsly-simplify`         | optimization   | Docker/Compose optimization                |
| DEPRECATED | `opsly-bootstrap`        | —              | Usar `opsly-context`                       |
| DEPRECATED | `opsly-architect`        | —              | Usar `opsly-architect-senior`              |

### Templates Reutilizables

```bash
# En skills/templates/
template-api-route.md      # Ruta API con tests
template-bash-script.md    # Script idempotente
template-mcp-tool.md       # Tool MCP con OAuth
template-migration.md      # Migración SQL
template-test.md           # Tests Vitest
```

## Autonomía — Reglas de Ejecución

### Sin Confirmar (Auto-ejecutar)

- Búsqueda y lectura de archivos
- Creación de archivos según templates
- Ejecución de `npm run type-check`
- Tests unitarios con `npm run test`
- Validaciones con `npm run validate-*`
- Git status/log (lectura)

### Con Confirmación Requerida

- Deploy a producción (`--prod`)
- `docker system prune --volumes`
- `terraform apply`
- Modificación de `.env` o Doppler
- Creación de migración SQL nueva
  -Cambios destructivos en Supabase
- Credentials en Doppler

### Escalation Automático

```
confidence < 0.3  →  Reportar y preguntar
intent = "deploy" →  Confirmar antes de ejecutar
domain = "unknown" → Solicitar contexto adicional
```

### Token Optimization (CRÍTICO)

**SIEMPRE que necesites contexto/información del proyecto:**

```
1. ¿Existe en docs/brain/?              → brain:research (60-70% tokens saved)
2. ¿Es búsqueda en código?              → grep/find localmente
3. ¿Necesitas arquitectura?             → AGENTS.md + VISION.md
4. ¿Última opción?                      → Pedir al usuario
```

**brain:research MCP tool:**
- Triggers: "investigar X", "research X", "explain X", "¿cómo funciona X?"
- Retorna: {question, answer, sources[], confidence, iterations}
- Costo: ~300 tokens vs. 5000 tokens full context
- Skill: `opsly-brain-researcher` (HIGH priority)

## URLs raw

- AGENTS.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
- VISION.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md

## Opsly Brain compartido

Claude debe usar el mismo cerebro que Codex, Cursor, OpenCode, Hermes, Copilot y
workers locales:

1. `docs/03-agents/AGENT-BRAIN-CONTRACT.md`
2. `config/knowledge-index.json`
3. `config/github-module-graph.json` cuando exista
4. `docs/brain/` como vault Obsidian canonico
5. `apps/mcp/src/tools/graphyfi.ts` como entrada Graphyfi/MCP

No crear memoria paralela para Claude. Si falta el grafo de modulos GitHub,
inspeccionar el repo y documentar ese gap en el handoff.

## Política unificada (Claude, OpenCode, agentes internos/externos)

Estas reglas aplican igual para Claude, OpenCode, Cursor, Copilot y automatismos:

- Fuente de verdad operativa: `AGENTS.md`.
- Guardrails transversales: `docs/03-agents/AGENT-GUARDRAILS.md`.
- Flujo Git oficial: `docs/01-development/GIT-WORKFLOW.md`.

Regla Git clave: **código/infra/tests por PR** (`feat/*` o `fix/*`), no push directo a `main` salvo cierres documentales permitidos por política del repo.

## Reglas Absolutas

- **NUNCA** K8s, Swarm, nginx (salvo ADR)
- **NUNCA** secretos en código
- **NUNCA** `any` en TypeScript
- **NUNCA** saltarse `validate-config.sh` antes de deploy
- **NUNCA** terraform apply sin plan
- **SIEMPRE** leer AGENTS.md al iniciar
- **SIEMPRE** usar OpenClaw como framework de trabajo
- **SIEMPRE** usar skill-finder para detectar skills necesarios
- **SIEMPRE** seguir `docs/01-development/GIT-WORKFLOW.md` para ramas/PR/merge

## Stack

| Servicio        | Puerto |
| --------------- | ------ |
| api             | 3000   |
| admin           | 3001   |
| portal          | 3002   |
| mcp             | 3003   |
| llm-gateway     | 3010   |
| orchestrator    | 3011   |
| context-builder | 3012   |

## Infraestructura

- VPS: `/opt/opsly` — SSH **solo Tailscale** `vps-dragon@100.120.151.91`
- IP pública: `PLATFORM_VPS_PUBLIC_IP` (Doppler, no commitear el valor) (solo HTTP/HTTPS)
- Doppler: `ops-intcloudsysops` / `prd`
- Supabase: `jkwykpldnitavhmtuzmo`
- GitHub: `cloudsysops/opsly`

## División Roles

| Herramienta | Rol                                              |
| ----------- | ------------------------------------------------ |
| Claude (tú) | Arquitectura, decisiones, desbloqueos, autonomía |
| Cursor      | Ejecución, código, commits                       |
| AGENTS.md   | Memoria compartida entre sesiones                |

## agent_teams

Configuración de equipos de agentes (reemplaza `enable-flag.json`):

- **OrchestratorAgent**: coordina tareas vía BullMQ/Temporal
  - Modos: `queue-only` (VPS control plane), `worker-enabled` (remotos)
  - Estrategias OAR: ReAct, Plan-Execute, Reflection
  - Ver: `1-agent-teams/orchestrator.md`
- **OpsAgent**: onboarding, health checks, deployments
  - Ver: `1-agent-teams/ops-agent.md`
- **BillingAgent**: Stripe, metering, cost alerts
  - Ver: `1-agent-teams/billing-agent.md`
- **SecurityAgent**: Zero-Trust, access review
  - Ver: `1-agent-teams/security-agent.md`

**Configuración en VPS:**
```bash
# Control plane (VPS)
OPSLY_ORCHESTRATOR_MODE=queue-only

# Worker remoto (Mac 2011)
OPSLY_ORCHESTRATOR_MODE=worker-enabled
REDIS_URL=redis://100.120.151.91:6379
```

## Before Proposing Code

1. **Reuse first:** Check if logic exists in `lib/` or another app → import instead of rewrite
2. **Monorepo-aware imports:** Always use workspace paths `@intcloudsysops/{module}` not relative paths
3. **Split large functions:** >50 lines → break into smaller, testable units
4. **Data access:** Supabase queries → use Repository pattern in `lib/services/`
5. **Resource creation:** Use Factory pattern in `lib/services/{entity}.factory.ts`
6. **Magic numbers:** Store in `lib/config/constants.ts` or env vars
7. **Type safety:** NO `any` in TypeScript — always use specific types
8. **Error handling:** Use `@intcloudsysops/errors` for unified error classes
9. **Validation:** Only at system boundaries (user input, external APIs) — trust internal code
10. **Tests:** Write tests for logic in `lib/`, optional for app-specific UI code

### API Development Checklist

```bash
# 1. Create route in apps/api/app/{feature}/route.ts
# 2. Use Repository pattern for data access
# 3. Add validation schema (Zod)
# 4. Write middleware for auth/permissions
# 5. Test with curl or Postman
# 6. Document in OpenAPI spec (apps/api/openapi.json)
# 7. Run: npm run type-check && npm run test --workspace=@intcloudsysops/api
```

### Database Changes Checklist

```bash
# 1. Create migration: npm run migrations:create --workspace=@intcloudsysops/migrations
# 2. Define schema in migration file
# 3. Apply locally: npm run db:migrate
# 4. Update TypeScript types: npm run db:codegen
# 5. Add RLS policies (security-first)
# 6. Test with sample data
# 7. Document schema in docs/database/SCHEMA.md
```

### Frontend (Next.js) Checklist

```bash
# 1. Create component in apps/{app-name}/src/components/
# 2. Use @intcloudsysops/components for shared UI
# 3. Handle loading/error/success states
# 4. Add responsive design (mobile-first)
# 5. Test manually in browser before commit
# 6. Type all props (no `any`)
# 7. Document with Storybook if component is reusable
```

---

## 🔄 Common Tasks

### Adding a New API Endpoint

```bash
# 1. Understand requirements from AGENTS.md or issue
# 2. Create route: apps/api/app/features/[feature]/route.ts
# 3. Import Repository from @intcloudsysops/services
# 4. Add Zod validation schema
# 5. Implement handler with proper error handling
# 6. Update OpenAPI spec
# 7. Test: npm run test --workspace=@intcloudsysops/api
# 8. Commit: git commit -m "feat(api): add {endpoint} route"
```

### Creating a Database Migration

```bash
# 1. npm run migrations:create --workspace=@intcloudsysops/migrations
# 2. Edit: lib/migrations/src/{timestamp}_description.sql
# 3. Write SQL with proper RLS policies
# 4. Test locally: npm run db:migrate
# 5. Generate types: npm run db:codegen
# 6. Commit: git commit -m "feat(db): migration for {table}"
# 7. Verify in AGENTS.md that schema change is documented
```

### Debugging a Failing Test

```bash
# 1. Run test with verbose output: npm run test -- --reporter=verbose
# 2. Check error message and stack trace
# 3. Inspect test file: lib/{module}/__tests__/{file}.test.ts
# 4. Look for mocks, stubs, or setup issues
# 5. Add console.log or debugger statements (remove before commit)
# 6. Re-run: npm run test -- --watch {pattern}
```

### Deploying to Production

```bash
# 1. Ensure all tests pass: npm run test
# 2. Type-check: npm run type-check
# 3. Create PR, get review
# 4. Merge to main branch
# 5. CI/CD automatically deploys to VPS
# 6. Monitor: check Doppler logs, admin dashboard
# 7. If issues: rollback immediately, investigate in staging first
```

---

## 📦 Enterprise-Scale Library Modules (v1.0)

**All code is consolidated into 13 reusable, versioned library modules.** See `config/modules.json` for the complete registry.

### Core Infrastructure Modules

| Module | Purpose | Owner |
|--------|---------|-------|
| `@intcloudsysops/prompts` | Versioned prompt registry (all agents) | claude |
| `@intcloudsysops/observability` | Unified logging, metrics, tracing | claude |
| `@intcloudsysops/components` | Shared React components & design system | claude |
| `@intcloudsysops/evaluation` | Testing, validators, safety checks | claude |

### Enterprise Utilities (9 additional modules)

- `@intcloudsysops/errors` — Unified error handling
- `@intcloudsysops/services` — Repository pattern + multi-tenant isolation
- `@intcloudsysops/config` — Environment configuration & feature flags
- `@intcloudsysops/security` — Auth, encryption, PII redaction
- `@intcloudsysops/api-utils` — Unified API response format
- `@intcloudsysops/workflow` — Safe execution with timeouts
- `@intcloudsysops/telemetry` — Cost & performance tracking
- `@intcloudsysops/testing` — Unified test framework
- `@intcloudsysops/migrations` — Database migration versioning

**Key Rule:** Never duplicate code. If logic exists in 2+ places → consolidate to lib/.

### Finding & Using Modules

1. Check `config/modules.json` — what exists, owner, dependencies
2. Read `lib/{module}/GOVERNANCE.md` — versioning rules, review process
3. Import from `@intcloudsysops/{module}`
4. For full docs: `docs/01-development/LIBRARY-MODULES.md`

### When to Create New Module

Only if ALL conditions are true:
- Reusable by 2+ apps
- Non-trivial (>100 lines of logic)
- Stable API (won't change monthly)
- Otherwise: keep in app-specific code

---

## 🔒 Canonical Documentation (Protected)

**These files are canonical sources of truth and MUST NOT be modified except via explicit governance:**

- `VISION.md` — Product north star (only updates: product changes)
- `ROADMAP.md` — Timeline & milestones (only updates: sprint planning)
- `AGENTS.md` — Operational status & next steps (update at session end, commit/push immediately)
- `SPRINT-TRACKER.md` — Current sprint progress (update per team consensus)
- `docs/README.md` — Documentation brain map
- `docs/index.md` — Obsidian MOC (compact index)
- `docs/STRUCTURE-GUARDRAILS.md` — Where docs may live; root of `docs/` is **three hubs only**
- `config/docs-root-allowlist.json` — Closed list for files at `docs/` root (do not expand without architecture review)
- `docs/stubs/*` — Short redirects to canonical paths under `docs/` (see `docs/stubs/README.md`)
- `config/modules.json` — Module registry (update only when adding/retiring modules)

**Protection:** Branch protection rules on `main`, pre-commit hooks validate structure (`validate-structure`, `structure-guard.sh`).

---

## Git Operations — Protocolo Obligatorio para TODOS los agentes

**⚠️ CRÍTICO:** Después de CADA tarea completada, SIEMPRE:

```bash
# 1. Revisar cambios
git status

# 2. Agregar cambios
git add -A

# 3. Commitear con mensaje descriptivo (en inglés)
git commit -m "feat(scope): descripción clara"
# Ejemplos:
#   git commit -m "feat(local-services): add migration for services, customers, bookings"
#   git commit -m "fix(api): resolve tenant isolation in quotes endpoint"
#   git commit -m "docs(adr): add ADR-037 multi-tenant architecture decision"

# 4. Pushear a rama asignada
git push origin <branch-name>
```

**Por qué:** 
- ✅ GitHub refleja siempre estado actual del código
- ✅ Fácil trackear progreso por commits
- ✅ Evita "cambios perdidos" cuando agentes rotan
- ✅ CI corre automáticamente en cada push

**APLICA A (sin excepciones):**
- ✅ Claude (AI en Claude Code)
- ✅ Cursor (AI en Cursor IDE)
- ✅ Codex (AI en Copilot)
- ✅ GitHub Copilot
- ✅ Cualquier agente externo que modifique código
- ✅ Cualquier script automatizado

**NO EXCEPTIONS:** Todo código que entre al repo debe pasar por: `git add → git commit → git push`

---

## 🚀 Automatic Phase Notifications (Opsly Local Services)

**What:** Automatic detection and notification of Local Services development phases.

**Where:** `scripts/phase-detector.sh` (runs via `.githooks/post-commit`)

**Triggered by:**
- Phase 0 Complete: ADRs + prompts created
- Phase 1 Complete: API infrastructure + migrations deployed
- Phase 2 Complete: n8n workflows + webhooks + Stripe integration deployed

**Notifies:**
- Internal team: Discord / Slack channels
- Developer: Branch, commit hash, author
- Next phase: What comes after current phase

**Example notifications:**
```
✅ Phase 1 Complete: API Infrastructure
Database migrations, tenant isolation, booking endpoints, and Next.js UI deployed.

Branch: main | Commit: 274dbde | Author: Cursor

→ Next: Phase 2: Cursor builds automation workflows (n8n, webhooks, integrations)
```

**Setup required (one time):**
```bash
# Ensure webhooks are in Doppler
doppler secrets get DISCORD_WEBHOOK_URL
doppler secrets get SLACK_WEBHOOK_URL

# Script is auto-called by .githooks/post-commit
# No manual invocation needed
```

**How to test:**
```bash
# Manually trigger phase detection
bash scripts/phase-detector.sh

# View phase state
cat .github/phase-state.json
```

---

## Typical Autonomous Workflow

```bash
# 1. Detect skills for your context
node scripts/skill-finder.js "your task description" --autonomous

# 2. Load skills (optional if found above)
node scripts/skill-loader.js --context "your domain"

# 3. Implement using templates from skills/templates/
#    Examples: template-api-route.md, template-migration.md, template-test.md

# 4. Validate before commit
npm run type-check
npm run test --workspace=<affected-workspace>
npm run lint:check

# 5. COMMIT + PUSH (MANDATORY)
git add -A
git commit -m "feat(scope): clear description"
git push origin <branch-name>

# 6. After push: create PR if one doesn't exist
gh pr create --draft --base main --head <branch-name>
```

---

## 🤖 Claude's Role in This Codebase

### What Claude Excels At

✅ **Architecture & Design Decisions**
- Proposing system design patterns
- Architecture Decision Records (ADRs)
- Technology choices with tradeoffs
- Refactoring strategy
- Risk analysis

✅ **Code Review & Quality**
- Analyzing code for issues
- Suggesting improvements
- Identifying security/performance problems
- Type safety validation
- Cross-cutting concerns

✅ **Documentation & Clarity**
- Writing clear guides and runbooks
- Explaining complex systems
- Updating AGENTS.md and system status
- Generating docs from code
- Creating decision records

✅ **Problem-Solving & Debugging**
- Root cause analysis
- Debugging complex issues
- Proposing fixes with explanation
- Testing strategies
- Monitoring and observability setup

### What Claude Should Avoid

❌ **Don't:**
- Create code without user's explicit request for implementation
- Modify `.env` or sensitive configs without user confirmation
- Push directly to `main` (always use feature branch)
- Guess infrastructure credentials or secrets
- Make destructive changes (delete, reset --hard) without asking
- Propose multiple unrelated changes in one PR
- Commit personal workflow preferences (eslint config, IDE settings)

### How Claude Works With Other Tools

| Tool | When to Use | Communication |
|------|-----------|-----------------|
| **Cursor** | Code implementation, editing, fixing | Claude proposes → Cursor executes |
| **GitHub Copilot** | Auto-completion, inline suggestions | Parallel tool, no conflicts |
| **Hermes** | Background automation, scheduled tasks | Read status from `AGENTS.md` |
| **n8n** | Workflow automation, webhooks | Query `.n8n/` configs, don't edit |
| **Doppler** | Environment secrets | Use CLI for read-only, ask user for edits |

---

## 🔐 Security & Compliance

### Secrets Management

- **Never** commit `.env` files or secrets
- **Never** log sensitive data (API keys, tokens, passwords)
- **Use Doppler** for all secrets: `doppler run --project ops-intcloudsysops --config prd -- <command>`
- **PII Redaction:** Use `@intcloudsysops/security` for redaction
- **Audit:** Check commits with `git log --patch | grep -E "key|secret|password"`

### Authentication & Authorization

- **Multi-tenant isolation:** Enforced at database level (RLS policies)
- **JWT validation:** On all API endpoints (middleware in `lib/api`)
- **RBAC:** Role-based access via Supabase auth
- **Never hardcode roles:** Store in database with proper RLS

### Code Security

- **Type safety first:** TypeScript `strict` mode, no `any`
- **Input validation:** Zod schemas on all endpoints
- **SQL injection:** Always use parameterized queries (Supabase does this)
- **XSS prevention:** React auto-escapes, use DOMPurify for rich content
- **CSRF protection:** Verify request origin on state-changing operations

---

## 📊 Monitoring & Observability

### Key Dashboards

- **Admin metrics:** `https://admin.<DOMAIN>/metrics`
- **Cost tracking:** `https://admin.<DOMAIN>/costs`
- **Logs:** Doppler integration with Datadog (if enabled)
- **Alerts:** Discord webhook + Slack notifications

### Common Monitoring Tasks

```bash
# View recent logs
doppler run --project ops-intcloudsysops --config prd -- npm run logs:view

# Check VPS status
ssh vps-dragon@100.120.151.91 "systemctl status opsly"

# Monitor Redis queue (BullMQ)
npm run orchestrator:status --workspace=@intcloudsysops/orchestrator

# Check database health
npm run db:health --workspace=@intcloudsysops/migrations
```

### Alerting

All critical issues should trigger:
1. **Discord notification** → #ops-alerts channel
2. **Slack notification** → #opsly-incidents thread
3. **PagerDuty** → if critical service is down
4. **Update AGENTS.md** → document incident and resolution

---

## 📖 Essential References

**Always have these open when working:**

1. **AGENTS.md** — Current session state + blockers → https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
2. **VISION.md** — Product roadmap + north star → https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md
3. **docs/adr/** — Architecture decisions
4. **docs/01-development/GIT-WORKFLOW.md** — Git protocol (branching, PRs)
5. **docs/01-development/LIBRARY-MODULES.md** — How to use lib modules
6. **docs/IMPLEMENTATION-IA-LAYER.md** — Real app paths for AI features
7. **README.md** — Project overview + quick commands

### Quick Command Reference

```bash
# Type-check all workspaces (before commit)
npm run type-check

# Test specific workspace
npm run test --workspace=@intcloudsysops/api

# Lint check (pre-commit)
npm run lint:check

# Format code
npm run format

# Build for production
npm run build

# Start dev server
npm run dev

# Git workflow (ALWAYS use these)
git checkout -b feat/your-feature
git add -A
git commit -m "feat(scope): description"
git push origin feat/your-feature
# Then create PR via GitHub or gh CLI
```

---

## 🎓 Learning Resources

**New to this codebase?**

1. Read [`docs/README.md`](docs/README.md) — documentation map
2. Read [`VISION.md`](VISION.md) — understand product goals
3. Read [`docs/adr/ADR-001.md`](docs/adr/ADR-001.md) through latest — understand decisions
4. Look at a simple app first (e.g., `apps/web`) → understand patterns
5. Try a small fix to `lib/` → understand module system
6. Review a merged PR on GitHub → see what good looks like

**Need help?**
- Ask Claude: "How does [system/feature] work?"
- Check `docs/brain/` for knowledge base
- Search issue tracker for similar problems
- Look at AGENTS.md for known blockers/workarounds

---

## 🔍 Session Closing Protocol

**When finishing your session, ALWAYS:**

```bash
# 1. Verify changes are clean
git status
git diff --stat

# 2. Update AGENTS.md with:
#    - What you completed
#    - Any blockers or TODOs
#    - Next steps for next session
# 3. Commit
git add AGENTS.md
git commit -m "docs(agents): session update YYYY-MM-DD"

# 4. Push your branch
git push origin <branch-name>

# 5. Create PR if needed
gh pr create --draft --base main --head <branch-name>

# 6. Leave URL of updated AGENTS.md for next session
# https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
```

This ensures continuity and helps the next agent (or session) start immediately with context.
