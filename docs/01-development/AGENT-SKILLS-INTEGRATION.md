---
status: guide
owner: operations
last_review: 2026-05-26
---

# Agent Skills Integration — Opsly

**Installed:** Addy Osmani's `agent-skills` (23 production best practices)  
**Adapter:** `opsly-agent-skills-bridge` (domain-specific patterns)  
**Location:** `/vendor/agent-skills` + `/skills/user/opsly-agent-skills-bridge/`

---

## Quick Start

### Load Skills by Phase

```bash
# Define phase (spec-driven development)
node scripts/load-agent-skills.js --phase define --context api

# Plan phase (task breakdown for BullMQ)
node scripts/load-agent-skills.js --phase plan --context orchestrator

# Build phase (TDD + multi-tenant checks)
node scripts/load-agent-skills.js --phase build --context api

# Test phase (Vitest + isolation)
node scripts/load-agent-skills.js --phase verify --context test

# Review phase (code quality + security audit)
node scripts/load-agent-skills.js --phase review --context security

# Simplify phase (extract & clarity)
node scripts/load-agent-skills.js --phase simplify

# Ship phase (canary deploy, feature flags)
node scripts/load-agent-skills.js --phase ship --context infra

# List all available skills
node scripts/load-agent-skills.js --list-all
```

---

## Integration with Development Workflow

### In `.claude/CLAUDE.md` (or IDE)

Add this section:

```markdown
## Agent Skills Bridge

When working on `/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, or `/ship`:

1. Run: `node scripts/load-agent-skills.js --phase <phase> --context <domain>`
2. Review the output checklist
3. Open the suggested template
4. Follow Addy's principles + Opsly guardrails

**Domains:** api, frontend, orchestrator, test, security, infra
```

### Example: Building a New API Route

```bash
# 1. Define the spec
node scripts/load-agent-skills.js --phase define --context api
# → Follow spec-driven principle, write OpenAPI + Zod first

# 2. Plan the slice
node scripts/load-agent-skills.js --phase plan --context api
# → Break into: schema → tests → route handler → integration test

# 3. Build with TDD
node scripts/load-agent-skills.js --phase build --context api
# → Tests first, check multi-tenant isolation, no `any`

# 4. Verify
node scripts/load-agent-skills.js --phase verify
# → Run tests, smoke tests

# 5. Review
node scripts/load-agent-skills.js --phase review --context security
# → Security audit, code review checklist, Cyber Neo scan

# 6. Ship
node scripts/load-agent-skills.js --phase ship --context infra
# → Feature flag, canary deploy, monitoring
```

---

## Agent Skills Overview

23 skills organized by development lifecycle:

### Define (Specification)
- `interview-me` — Gather requirements from stakeholders
- `spec-driven-development` — Write spec before code
- `idea-refine` — Refine ideas and acceptance criteria

### Plan (Task Breakdown)
- `planning-and-task-breakdown` — Slice tasks into independent increments
- `doubt-driven-development` — Identify and address unknowns early

### Build (Implementation)
- `incremental-implementation` — One slice at a time
- `test-driven-development` — Tests → code → refactor
- `context-engineering` — Maintain context across steps

### Verify (Quality Assurance)
- `browser-testing-with-devtools` — Test UI with DevTools
- `debugging-and-error-recovery` — Systematic debugging

### Review (Code Quality & Security)
- `code-review-and-quality` — Improve code health
- `security-and-hardening` — Security audit checklist
- `performance-optimization` — Profile and optimize

### Simplify (Clarity)
- `code-simplification` — Clarity over cleverness

### Ship (Launch & Deprecation)
- `shipping-and-launch` — Launch safely (canary, feature flags)
- `deprecation-and-migration` — Deprecate clearly (2-week notice)
- `ci-cd-and-automation` — Automated testing and deployment
- `git-workflow-and-versioning` — Clean git history

### Specialized
- `api-and-interface-design` — API design best practices
- `frontend-ui-engineering` — UI/UX implementation
- `source-driven-development` — Code-as-source-of-truth
- `documentation-and-adrs` — Docs and architecture decisions

---

## Opsly Guardrails (Always Applied)

When using agent-skills, Opsly patterns are non-negotiable:

✅ **TypeScript:** No `any` (always specific types)  
✅ **Multi-tenant:** `tenant_slug` on every scope boundary  
✅ **Secrets:** Doppler only (never hardcoded)  
✅ **Zero-Trust:** Portal routes validate `resolveTrustedPortalSession()`  
✅ **Composition:** Docker Compose (no K8s default)  
✅ **Testing:** Vitest + multi-tenant isolation  
✅ **CI:** Type-check, tests, coverage gates before merge  

**If agent-skills conflicts with these guardrails, Opsly rules win.**

---

## Adapters (In Development)

Opsly-specific adapters being built for each phase:

| Adapter | Purpose | Status |
|---------|---------|--------|
| `opsly-spec-driven.md` | API spec + Zod first | Planned |
| `opsly-task-breakdown.md` | BullMQ + Hive slicing | Planned |
| `opsly-tdd-incremental.md` | Tests + multi-tenant | Planned |
| `opsly-quality-gates.md` | CI gates checklist | Planned |
| `opsly-code-review-audit.md` | Security + patterns | Planned |
| `opsly-simplification-checklist.md` | Clarity metrics | Planned |
| `opsly-shipping-checklist.md` | Canary + flags + smoke | Planned |

Currently, the loader maps phases to agent-skills + Opsly context dynamically (no separate MD files needed yet).

---

## References

- **Agent Skills Repo:** https://github.com/addyosmani/agent-skills
- **Bridge Skill:** `/skills/user/opsly-agent-skills-bridge/SKILL.md`
- **Loader Script:** `/scripts/load-agent-skills.js`
- **Opsly VISION:** `/VISION.md`
- **Opsly Guardrails:** `/docs/04-infrastructure/SECURITY_CHECKLIST.md`

---

## FAQ

**Q: Do I have to use agent-skills?**  
A: No. They're optional guidance. Use them to improve code quality, security, and shipping practices.

**Q: What if agent-skills recommends something that conflicts with Opsly?**  
A: Opsly rules (no `any`, multi-tenant first, Docker Compose, Doppler secrets) always win. Adapt agent-skills to Opsly context.

**Q: Can I add my own domain contexts?**  
A: Yes. Edit `/scripts/load-agent-skills.js` → `DOMAIN_CONTEXT` object, add your context + guide + template.

**Q: How do I integrate with Cursor / Windsurf / etc.?**  
A: Copy agent-skills markdown files from `vendor/agent-skills/skills/` to `.cursor/rules/` or equivalent. They're plain Markdown.

---

**Version:** 1.0.0 | **Last Updated:** 2026-05-26
