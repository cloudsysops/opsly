---
name: opsly-agent-skills-bridge
version: 1.0.0
description: Bridge layer integrating Addy Osmani's agent-skills (production best practices) with Opsly domain patterns
triggers:
  - spec, plan, build, test, review, simplify, ship
  - production practices, best practices, software quality
  - agile, workflow, development lifecycle
category: development
priority: high
dependencies:
  - vendor/agent-skills (external)
  - opsly-architect-senior (for architecture decisions)
  - opsly-api, opsly-infra, opsly-orchestrator (domain-specific)
status: stable
---

# Opsly Agent Skills Bridge

**Integration:** Addy Osmani's 23 production-grade skills adapted for Opsly's multi-tenant, AI-orchestrated platform.

## Overview

The `agent-skills` package encodes best practices for:
- **Define:** Spec-driven development, interview-based requirements
- **Plan:** Task breakdown, incremental slicing
- **Build:** Test-driven development, context engineering
- **Verify:** Browser testing, debugging, quality gates
- **Review:** Code review, security auditing, performance optimization
- **Ship:** Git workflow, CI/CD, deprecation, launch

**Opsly Bridge:**  
Each skill maps to Opsly's context (orchestrator, tenant isolation, OpenClaw, Guardian Shield) with domain-specific guides.

---

## Available Commands

Map `/slash` commands to agent-skills phases:

| Command | Phase | Opsly Skill |
|---------|-------|-----------|
| `/spec` | Define | `opsly-spec-driven` (in progress) |
| `/plan` | Plan | `opsly-task-breakdown` (in progress) |
| `/build` | Build | `opsly-tdd-incremental` (in progress) |
| `/test` | Verify | `opsly-quality-gates` (in progress) |
| `/review` | Review | `opsly-code-review-audit` (in progress) |
| `/code-simplify` | Simplify | `opsly-simplification-checklist` (in progress) |
| `/ship` | Ship | `opsly-shipping-checklist` (in progress) |

---

## Quick Reference: Agent Skills → Opsly Pattern Mapping

### 1. Spec-Driven Development (`interview-me`, `spec-driven-development`)

**Agent-Skills Principle:** Interview stakeholders, define the spec first, then code.

**Opsly Adaptation:**
- **Tenant onboarding:** Use `interview-me` to gather Stack requirements (n8n workflows, monitoring, custom apps)
- **Feature spec:** Template in `skills/templates/template-spec-driven.md`
- **ADR alignment:** Spec links to architecture decisions (see `docs/adr/`)
- **API contract:** OpenAPI spec + Zod validation first, route implementation second

**Command:**
```bash
# 1. Interview tenant needs
node scripts/skill-finder.js "spec-driven" --autonomous

# 2. Generate spec
npx tsx skills/manifest/src/spec-generator.ts --context "peskids lead capture"

# 3. Link to ADR if architectural
echo "ADR reference: https://github.com/cloudsysops/opsly/blob/main/docs/adr/ADR-0XX.md"
```

---

### 2. Planning & Task Breakdown (`planning-and-task-breakdown`)

**Agent-Skills Principle:** Break large tasks into small, independently valuable slices.

**Opsly Adaptation:**
- **Sprints:** Align to `ROADMAP.md` (weekly increments, Fase 1–4)
- **Slicing criteria:** 
  - Each slice must compile (`npm run type-check`)
  - Each slice has passing tests
  - Each slice merges to feature branch without blocking others
- **Hive multi-agent:** Complex tasks become subtasks in `HiveOrchestrator` (Queen assigns by role)

**Command:**
```bash
# Decompose Peskids Phase 2 into slices
node scripts/task-breakdown.js \
  --epic "Peskids Phase 2 Week 1" \
  --description "Lead validation, N8N setup, RLS" \
  --max-tasks 5

# Output: GitHub issues linked to sprint board
```

---

### 3. Test-Driven Development (`test-driven-development`, `incremental-implementation`)

**Agent-Skills Principle:** Tests are specs; code follows.

**Opsly Adaptation:**
- **API route TDD:** Write `GET /api/portal/usage` test first, route after
- **Orchestrator jobs:** Write test for Hive retry logic, implement retry handler
- **Multi-tenant validation:** Test suite ensures `tenant_slug` isolation at every layer
- **Coverage gates:** CI enforces >80% for lib/, >60% for apps/

**Command:**
```bash
# Generate test skeleton from spec
npx tsx skills/manifest/src/test-generator.ts \
  --spec "apps/api/app/api/portal/usage/spec.md" \
  --framework vitest

# Run TDD loop (Red → Green → Refactor)
npm run test -- --watch --ui
```

---

### 4. Code Review & Quality (`code-review-and-quality`, `security-and-hardening`)

**Agent-Skills Principle:** Code review is continuous; security is integral.

**Opsly Adaptation:**
- **Opsly code review checklist:**
  - [ ] No `any` in TypeScript
  - [ ] Multi-tenant validation: `tenant_slug` on every scope boundary
  - [ ] Zero-Trust portal routes: `resolveTrustedPortalSession()` before data access
  - [ ] Secrets: no hardcoded, all in Doppler
  - [ ] Rate limits: public endpoints protected
  - [ ] Audit logs: security-sensitive actions logged
- **Security agents:** Use `security-auditor.md` persona to auto-review sensitive code
- **Cyber Neo:** Guardian Shield secret scan integration

**Command:**
```bash
# Trigger Copilot code review on PR
gh pr review --approve --comment "@copilot please review this"

# Auto-security audit
node scripts/skill-finder.js "security" --autonomous

# Cyber Neo secret scan
./scripts/security/cyber-neo-summary.sh
```

---

### 5. Performance & Simplification (`code-simplification`, `performance-optimization`)

**Agent-Skills Principle:** Clear code > clever code; optimize where it matters.

**Opsly Adaptation:**
- **Orchestrator jobs:** Keep handlers under 200 lines; extract to lib/services/
- **Frontend:** Lazy-load Portal components; measure CLS/LCP
- **API response times:** Target <200ms for tenant endpoints (cache + aggregation)
- **Database queries:** Use indexes (Supabase), avoid N+1

**Command:**
```bash
# Simplify complex function
/code-simplify --file apps/api/lib/complex-handler.ts

# Performance profiling
node scripts/perf-profile.js --endpoint "/api/portal/usage" --duration 10s
```

---

### 6. Shipping & Launch (`shipping-and-launch`, `deprecation-and-migration`)

**Agent-Skills Principle:** Ship fast; launch early; deprecate clearly.

**Opsly Adaptation:**
- **Feature flag:** New features gated by `FEATURE_*` env (see `apps/api/lib/feature-flags.ts`)
- **Canary deployment:** Deploy to staging first, smoke test, then prod
- **Blue-green:** If multi-VPS, alternate deployments (not current, but ready)
- **Deprecation:** 2-week notice, docs + warnings, migration guide (ADR + runbook)

**Command:**
```bash
# Ship to prod (with safeguards)
./scripts/ship-prod.sh --feature "guardian-shield" --canary

# Deprecation runbook
npx tsx scripts/deprecation-guide.ts --old-route "/api/old-endpoint" --new-route "/api/new-endpoint"
```

---

## Integration with `.claude/CLAUDE.md` & IDE Tools

### Add to CLAUDE.md

```markdown
## Agent Skills Bridge (Opsly)

When the session activates `/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, or `/ship`:

1. Source Addy's best practices from `vendor/agent-skills/skills/{skill-name}/SKILL.md`
2. Adapt to Opsly domain using patterns below
3. Follow Opsly guardrails (no `any`, multi-tenant, Doppler secrets, etc.)

**Quick Start:**
- `node scripts/skill-finder.js "spec" --autonomous`  → loads spec-driven skill + Opsly adapter
- `node scripts/skill-finder.js "test" --autonomous`  → TDD pattern + Opsly test template
```

### Cursor / Windsurf / OpenCode Integration

Copy Opsly-specific skill adaptations to `.cursor/rules/` or equivalent:
```bash
cp skills/user/opsly-agent-skills-bridge/adapters/*.md .cursor/rules/
```

---

## Reference: Opsly Skill Adapters (in Development)

| Adapter | Purpose | Status |
|---------|---------|--------|
| `opsly-spec-driven.md` | API spec + Zod schema first | TODO |
| `opsly-task-breakdown.md` | Slice tasks for BullMQ + Hive | TODO |
| `opsly-tdd-incremental.md` | Tests for multi-tenant isolation | TODO |
| `opsly-quality-gates.md` | CI gates: type-check, tests, coverage | TODO |
| `opsly-code-review-audit.md` | Security + Opsly patterns checklist | TODO |
| `opsly-simplification-checklist.md` | Complexity vs. clarity in libs | TODO |
| `opsly-shipping-checklist.md` | Canary + feature flags + smoke | TODO |

---

## Warnings & Constraints

- ⚠️ **Agent-skills is opinionated:** Adapt to Opsly, don't blindly follow if it conflicts with VISION.md
- ⚠️ **No Kubernetes:** Agent-skills doesn't mention infra; Opsly is Compose-first (see ADR-001)
- ⚠️ **Multi-tenant first:** Every pattern must account for `tenant_slug` isolation
- ⚠️ **Secrets:** Doppler only; agent-skills doesn't cover secrets—Opsly does strictly

---

## Further Reading

- **Agent Skills:** https://github.com/addyosmani/agent-skills
- **Opsly VISION:** [VISION.md](../../VISION.md)
- **Opsly Roadmap:** [ROADMAP.md](../../ROADMAP.md)
- **Opsly ADRs:** [docs/adr/](../../docs/adr/)

---

## Related Skills

- `opsly-architect-senior` — Design decisions + risk analysis
- `opsly-api` — API route patterns
- `opsly-orchestrator` — BullMQ + Hive workflows
- `opsly-infra` — Deployment + Docker + VPS

---

**Version:** 1.0.0 | **Owner:** Opsly Architects | **Last updated:** 2026-05-26
