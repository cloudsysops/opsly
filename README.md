# Opsly

> The autonomous DevOps agent. Operates your infrastructure 24/7. Tells you when it matters.

[![Docs Governance](https://github.com/cloudsysops/opsly/actions/workflows/docs-governance.yml/badge.svg)](https://github.com/cloudsysops/opsly/actions/workflows/docs-governance.yml)

## What is this?

Opsly is a DevOps agent that doesn't just suggest actions — it executes them. It monitors your infrastructure, fixes what breaks, deploys what you push, and reports back only when something needs your attention.

Built on an OAR (Plan-Execute-Reflect) orchestrator with hybrid LLM routing for cost-optimized intelligence. Local Llama for routine decisions, cloud models for critical ones.

## Status

Currently in production with internal tenants. External pilot in onboarding. Not yet open for public signup.

If you're interested in pilot access, see `docs/PILOT.md` (coming soon) or reach out: hello@opsly.dev

## Documentation

| Question | Document |
|----------|----------|
| What are we building and why? | [VISION.md](VISION.md) |
| What's planned and when? | [ROADMAP.md](ROADMAP.md) |
| Current operational state | [AGENTS.md](AGENTS.md) |
| This sprint | [SPRINT-TRACKER.md](SPRINT-TRACKER.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Decision records | [docs/adr/](docs/adr/) |
| All docs index | [docs/README.md](docs/README.md) |

## Architecture (high level)

```
                    ┌─────────────────────────────┐
                    │   Customer Infrastructure   │
                    │  (VPS, K8s, Docker, n8n,    │
                    │   databases, SaaS APIs)     │
                    └──────────────┬──────────────┘
                                   │
                          (secure agent / SSH)
                                   │
                    ┌──────────────▼──────────────┐
                    │       Opsly Platform        │
                    │  ┌──────────────────────┐   │
                    │  │  Perception Layer    │   │
                    │  │  (logs, metrics,     │   │
                    │  │   events, state)     │   │
                    │  └──────────┬───────────┘   │
                    │             │               │
                    │  ┌──────────▼───────────┐   │
                    │  │  OAR Orchestrator    │   │
                    │  │  Plan→Execute→Reflect│   │
                    │  └──────────┬───────────┘   │
                    │             │               │
                    │  ┌──────────▼───────────┐   │
                    │  │  LLM Gateway         │   │
                    │  │  Llama → Haiku       │   │
                    │  │  Sonnet → GPT-4o     │   │
                    │  └──────────┬───────────┘   │
                    │             │               │
                    │  ┌──────────▼───────────┐   │
                    │  │  Action Layer        │   │
                    │  │  (verified, logged,  │   │
                    │  │   reversible)        │   │
                    │  └──────────────────────┘   │
                    └─────────────────────────────┘
```

90% of decisions are rule-based (free). 10% use LLMs with per-tenant cost budgets.

## Tech stack

- **Platform**: Next.js 15, TypeScript, Supabase (Postgres + RLS), Redis/BullMQ
- **Infrastructure**: Docker Compose, Traefik v3, Tailscale mesh
- **Orchestration**: Custom OAR engine, MCP (Model Context Protocol) tools
- **LLM**: Local Llama (Ollama) + Claude Haiku/Sonnet + GPT-4o via OpenRouter
- **Observability**: Discord webhooks, custom dashboards (Prometheus/Grafana planned)

## How we built this

This platform was built using its own systems. The OAR orchestrator that operates customer infrastructure also operates this codebase — provisioning, deploying, and verifying changes. Every architectural decision (`docs/adr/`) was made or refined through the same agent we commercialize.

This is the demo: read the commit history.

## License

Proprietary. (Rationale and any open-source plans documented in [docs/adr/](docs/adr/) when decided.)

## Company

Opsly is a product of **IntCloudSysOps LLC**, focused on AI agent systems operations.
