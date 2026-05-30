---
status: generated
owner: operations
tags:
  - opsly/brain
  - opsly/skills
  - moc
---

# Skills Brain MOC

Generado por `scripts/sync-skills-to-brain.js`. No editar a mano — regenerar con:
```bash
node scripts/sync-skills-to-brain.js
```

## Arranque rápido por contexto

| Contexto de sesión | Skills a cargar |
|--------------------|-----------------|
| trabajo en peskids | [[opsly-peskids]], [[opsly-frontend]], [[opsly-api]], [[opsly-qa]] |
| nueva ruta API | [[opsly-api]], [[opsly-supabase]] |
| deploy / infra | [[opsly-infra]], [[opsly-qa]] |
| billing / Stripe | [[opsly-billing]], [[opsly-stripe-marketplace]] |
| diagnóstico monorepo | [[opsly-quantum]], [[opsly-context]] |
| crear/editar skill | [[opsly-skill-creator]] |
| LLM Gateway | [[opsly-llm]] |
| orchestrator / BullMQ | [[opsly-orchestrator]] |
| arquitectura / ADR | [[opsly-architect-senior]] |
| seguridad | [[opsly-shield]] |

---

## Skills por categoría

### ai
- [[opsly-ai-sdk-vercel]] — Vercel AI SDK en portal/admin/web con regla OpenClaw: UI y streaming s
- [[opsly-feedback-ml]] — Feedback loop, decisiones ML, auto-implement, aprobación humana. Flujo
- [[opsly-llm]] — LLM Gateway: llmCall, proveedores, caché, routing. Cualquier llamada a
- [[opsly-notebooklm]] — NotebookLM: PDF→podcast, fuentes, MCP tool (EXPERIMENTAL). Generar con

### architecture
- [[hermes-skeptic]] — Revisión crítica de planes y decisiones con foco en riesgos, supuestos
- [[opsly-architect]] — [DEPRECATED] Usar opsly-architect-senior en su lugar. Arquitectura leg
- [[opsly-architect-senior]] — Diagnóstico arquitectónico, riesgos, priorización, ADRs. Revisión de a
- [[opsly-modularity]] — Contrato core-first: lib compartida, tenant delgado, activación por te

### autonomy
- [[opsly-autonomous]] — Modo autónomo: detectar contexto, cargar skills sin intervención human

### billing
- [[opsly-billing]] — Stripe: subscriptions, invoices, metering, planes, webhooks. Gestión d
- [[opsly-cost-forecaster]] — Forecast Opsly multi-tenant spend across LLM tokens, infra, storage, a
- [[opsly-stripe-marketplace]] — Criterios Stripe oficiales (skill marketplace) mapeados a Opsly: Check

### bootstrap
- [[opsly-bootstrap]] — [DEPRECATED] Usar opsly-context en su lugar. Bootstrap de sesión legac
- [[opsly-context]] — Bootstrap de sesión: AGENTS, VISION, VPS, tokens. SIEMPRE al inicio de

### database
- [[opsly-supabase]] — Migraciones SQL, schema platform, RLS, políticas. Crear migraciones SQ
- [[opsly-supabase-marketplace]] — Seguridad Supabase y CLI (skill marketplace): RLS, JWT/metadata, vista

### development
- [[context-builder]] — Construcción de contexto operativo y memoria de investigación por tena
- [[opsly-agent-skills-bridge]] — Bridge layer integrating Addy Osmani's agent-skills (23 production bes
- [[opsly-api]] — Rutas en apps/api, patrones, templates, tests. Crear o modificar rutas
- [[opsly-bash]] — Scripts en scripts/, plantilla, set -euo pipefail, idempotencia. Crear
- [[opsly-frontend]] — Portal, Admin, UI, React, Tailwind, shadcn/ui. Desarrollo frontend en 

### engineering
- [[api-and-interface-design]] — Design stable APIs with clear contracts. REST, versioning, error handl
- [[browser-testing-with-devtools]] — Chrome DevTools MCP for runtime verification. Performance profiling, n
- [[ci-cd-and-automation]] — Automated quality gates on every change. CI pipeline design, GitHub Ac
- [[code-review-and-quality]] — Five-axis code review: correctness, security, performance, maintainabi
- [[code-simplification]] — Reduce complexity without changing behavior. Remove dead code, flatten
- [[context-engineering]] — Load the right context at the right time. Context windows, prompt engi
- [[debugging-and-error-recovery]] — Reproduce → localize → fix → guard. Systematic debugging methodology. 
- [[deprecation-and-migration]] — Safe deprecation strategy with migration paths. Use when removing or r
- [[documentation-and-adrs]] — Document the why, not just the what. ADR templates, runbooks, API docs
- [[doubt-driven-development]] — Adversarial fresh-context review of every non-trivial decision. Use wh
- [[frontend-ui-engineering]] — Production-quality UI with accessibility. React, components, design sy
- [[git-workflow-and-versioning]] — Atomic commits, clean history, semantic PRs. Branching strategy, commi
- [[idea-refine]] — Refine vague ideas through structured divergent and convergent thinkin
- [[incremental-implementation]] — Build in thin vertical slices. Use for any multi-file feature implemen
- [[interview-me]] — Surface what the user actually wants before any plan or code. Structur
- [[performance-optimization]] — Measure first, optimize only what matters. Profiling, caching, query o
- [[planning-and-task-breakdown]] — Decompose work into verifiable tasks with dependency graphs. Use when 
- [[security-and-hardening]] — OWASP prevention, input validation, least privilege, secrets managemen
- [[shipping-and-launch]] — Pre-launch checklist, monitoring setup, rollback plan, feature flags. 
- [[source-driven-development]] — Verify against official docs before implementing. Use when working wit
- [[spec-driven-development]] — Requirements and acceptance criteria before code. Use for new features
- [[test-driven-development]] — Failing test first, then make it pass. Red-Green-Refactor cycle with e
- [[using-agent-skills]] — Meta-skill: discover and invoke the right engineering skill for any de

### infrastructure
- [[opsly-distributed-tracing]] — OpenTelemetry tracing for Opsly services: request correlation, latency
- [[opsly-infra]] — Docker, Compose, VPS, deploy, Traefik v3 (middlewares, ACME), Cloudfla
- [[opsly-self-healing]] — Self-healing agent: detección y reparación automática de domain mismat

### integration
- [[opsly-google-cloud]] — Google Cloud: Drive, BigQuery, Vertex AI, service account. Integrar se
- [[opsly-mcp]] — MCP OpenClaw: tools, OAuth/PKCE, scopes. Agregar o modificar tools del

### master
- [[opsly-quantum]] — Skill maestro: orquestación segura + acciones reales vía scripts del r

### notifications
- [[opsly-discord]] — Notificaciones Discord: notify-discord.sh, tipos, reglas. Notificar ev

### operations
- [[opsly-peskids]] — Peskids tenant-specific product and operations work. Use when changing
- [[opsly-tenant]] — Onboarding, suspensión, resume, diagnóstico de stacks por tenant. Onbo

### optimization
- [[opsly-simplify]] — Docker & Docker Compose optimization: multi-stage, anchors, limits. Op

### orchestration
- [[opsly-agent-teams]] — BullMQ / TeamManager, colas paralelas, eventos Redis. Encolar trabajo 
- [[opsly-jcode]] — Integración de jcode para generación de código autónoma en sandbox vía
- [[opsly-n8n-automation]] — Expert n8n automation for Opsly platform — autonomous agents, workflow
- [[opsly-orchestrator]] — OAR, workflows, n8n, super-agent, BullMQ. Orquestación de agentes y wo

### qa
- [[opsly-agent-verification]] — Evidencia antes de merge: type-check, tests workspace, validate-openap
- [[opsly-qa]] — Testing, smoke, audit, regression. Testing y validación de calidad.

### research
- [[opsly-brain-researcher]] — Agente de investigación autónomo que investiga el Obsidian Brain, sint
- [[opsly-researcher]] — Investigación web asistida vía llm-gateway /v1/search para comparar li

### tooling
- [[opsly-skill-creator]] — Crear, mejorar y evaluar skills para el ecosistema Opsly. Usar cuando 
