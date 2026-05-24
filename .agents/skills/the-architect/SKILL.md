---
status: draft
owner: operations
last_review: 2026-05-24
type: skill
tags:
  - opsly/agent-skill
---

# The Architect

Use this skill when the user asks for a complete product or system blueprint, when a tenant needs a build plan, or when Opsly needs to convert an idea into an implementation-ready design.

## Workflow

1. Read `references/CLAUDE.md` for the full role and constraints.
2. Use `references/questions/` and `references/knowledge/` as needed.
3. Produce a self-contained blueprint with:
   - product goal
   - target users
   - architecture
   - data model
   - API surface
   - frontend pages
   - deployment path
   - test plan
   - numbered build order
   - builder instructions
4. Save blueprints under `docs/blueprints/` or `docs/tenants/<slug>/` when the work belongs to Opsly.

## Opsly Adaptation

- Prefer existing Opsly infrastructure: Docker Compose, Traefik, Supabase, n8n, Uptime Kuma, OpenClaw, LLM Gateway.
- Do not recommend Vercel as the primary deploy path for tenant apps unless the user explicitly asks for it.
- For tenant pilots, design the smallest production slice first: public form, API endpoint, tenant data persistence, monitoring, owner summary.
- For Peskids, treat `https://peskids.op-sly.com` and `https://api.op-sly.com` as the active production targets.

## References

- `references/CLAUDE.md`
- `references/templates/blueprint-template.md`
- `references/templates/claude-md-template.md`
- `references/knowledge/skills-registry.md`
- `references/knowledge/stack-compatibility.md`

---

## Enlaces relacionados

- [[.agents/README|.agents]]
- [[README|Inicio]]
