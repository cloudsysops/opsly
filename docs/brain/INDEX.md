---
status: canon
owner: operations
last_review: 2026-07-08
type: index
tags:
  - opsly/brain
  - opsly/index
  - moc
---

# Opsly Brain — Índice Maestro

> Punto de entrada único para cualquier agente, desarrollador o automatización que necesite orientarse en el sistema. Si no sabes por dónde empezar, empieza aquí.

---

## Orientación rápida

| Pregunta | Respuesta |
|----------|-----------|
| ¿Qué es Opsly? | [[VISION.md]] + [[AGENTS.md]] |
| ¿Cómo arranco una sesión? | [[AGENT-ONBOARDING]] (este vault) |
| ¿Qué skill necesito? | [[brain/skills/README]] — tabla por contexto |
| ¿Qué módulo/app toca mi tarea? | [[brain/modules/README]] |
| ¿Qué workflows existen? | [[brain/workflows/README]] |
| ¿Cómo gestiono un tenant? | [[brain/tenants/README]] |
| ¿Qué ADR aplica? | [[brain/architecture/README]] |
| ¿Cómo uso Fable 5? | [[brain/skills/fable5-manual]] |
| ¿Cómo configuro un agente n8n? | [[brain/skills/fable5-agent-instructions]] |
| ¿Cuál es la estrategia AI? | [[brain/AI-STRATEGY]] |
| ¿Cómo onboarding de nuevo tenant? | [[brain/TENANT-AI-PLAYBOOK]] |

---

## Mapa del vault

```
docs/brain/
├── INDEX.md                   ← estás aquí
├── README.md                  → reglas del vault
├── AI-STRATEGY.md             → estrategia AI 2026 (canon)
├── TENANT-AI-PLAYBOOK.md      → AI config por tipo de tenant
├── AGENT-ONBOARDING.md        → arranque rápido para nuevos agentes
├── dashboard.md               → tablero ejecutivo
│
├── skills/                    → skills por contexto de sesión
│   ├── README.md              → MOC de skills (tabla arranque rápido)
│   ├── fable5-manual.md       → manual completo Fable 5
│   ├── fable5-agent-instructions.md → instrucciones para Sonnet/Haiku/n8n
│   ├── opsly-llm.md           → LLM Gateway: modelos, routing, caché
│   └── [60+ skills...]
│
├── modules/                   → una nota por app/package
│   ├── README.md              → MOC de módulos
│   ├── api.md                 → apps/api (control plane)
│   ├── portal.md              → apps/portal (tenant UI)
│   ├── admin.md               → apps/admin
│   ├── llm-gateway.md         → apps/llm-gateway (Fable/Opus/Sonnet/Haiku)
│   ├── orchestrator.md        → apps/orchestrator (BullMQ)
│   ├── mcp.md                 → apps/mcp (OpenClaw tools)
│   ├── peskids.md             → apps/peskids (tenant vertical)
│   └── [otros módulos...]
│
├── agents/                    → roles y límites de agentes
│   └── README.md              → Claude, Cursor, Copilot, OpenCode, Hermes
│
├── tenants/                   → contexto operativo por tenant
│   ├── README.md
│   ├── peskids.md             → tenant peskids (incubado)
│   └── [otros tenants...]
│
├── workflows/                 → n8n, OpenClaw, Shield, billing, CRM
│   ├── README.md
│   ├── openclaw.md
│   ├── shield.md
│   ├── billing.md
│   └── [otros workflows...]
│
└── architecture/              → ADRs y mapas técnicos
    ├── README.md
    ├── system-map.md
    └── knowledge-graph.md
```

---

## Stack AI (resumen ejecutivo)

| Modelo | Alias | Cuándo |
|--------|-------|--------|
| `claude-fable-5` | `fable` | Decisiones críticas, arquitectura, playbooks de tenant |
| `claude-opus-4-8` | `opus` | Razonamiento complejo, análisis profundo |
| `claude-sonnet-4-6` | `sonnet` | Producción estándar, respuestas de negocio |
| `claude-haiku-4-5-20251001` | `haiku` | Clasificación, routing, alta frecuencia |

Regla: `complexityLevel 3 → fable`, `2 → balanced (sonnet)`, `1 → cheap (haiku)`

Patrón 3-tier: **Fable genera** el playbook → **Sonnet ejecuta** en producción → **Haiku monitorea** a escala

Ver detalles: [[brain/skills/fable5-manual]] · [[brain/AI-STRATEGY]] · [[brain/modules/llm-gateway]]

---

## Guardrails globales (siempre activos)

- **No K8s/Swarm/nginx** sin ADR aprobado
- **No secrets en código** — Doppler únicamente
- **No `any` en TypeScript** — siempre tipos específicos
- **Multi-tenant isolation**: `tenant_slug` en todo scope boundary
- **Zero-Trust Portal**: `resolveTrustedPortalSession()` en todas las rutas del portal
- **No push directo a `main`** — PR workflow obligatorio
- **Doppler wrapper**: `doppler run --project ops-intcloudsysops --config prd -- <cmd>`

---

## Flujo de sesión estándar

```bash
# 1. Ver estado de rama y cambios recientes
bash scripts/git-session-brief.sh

# 2. Cargar skills relevantes para la tarea
node scripts/skill-finder.js "mi tarea" --autonomous

# 3. Consultar el brain si necesitas contexto de un módulo o tenant
# → ver docs/brain/modules/<modulo>.md
# → ver docs/brain/tenants/<tenant>.md

# 4. Al cerrar sesión
git status && git diff --stat
# Actualizar AGENTS.md: completado / blockers / próximos pasos
git add AGENTS.md && git commit -m "docs(agents): session update $(date +%Y-%m-%d)"
git push origin <branch-name>
```

---

## ADR activos recientes

| ADR | Decisión |
|-----|----------|
| ADR-047 | Fable 5 como modelo estratégico para decisiones de tenant (2026-07-08) |
| ADR-044 | LLM Gateway como single gateway (no bypass) |
| ADR-040 | Docker Compose por defecto — no K8s |

Ver carpeta completa: `docs/adr/`

---

*Actualizado 2026-07-08 | Versión 1.0.0 | Ver también [[brain/README]] para reglas del vault*
