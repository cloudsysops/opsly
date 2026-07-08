---
status: canon
owner: operations
last_review: 2026-07-08
type: onboarding
tags:
  - opsly/brain
  - opsly/agents
  - opsly/onboarding
---

# Onboarding de Agente — Quick Start

> Eres un agente nuevo (Claude, Cursor, Copilot, Codex, Hermes, OpenCode) que acaba de entrar al ecosistema Opsly. Lee esto primero, siempre.

---

## Los 3 documentos obligatorios

Lee en este orden antes de cualquier acción:

1. **[AGENTS.md](../../AGENTS.md)** — memoria compartida de sesiones, estado actual, blockers, próximos pasos
2. **[VISION.md](https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md)** — por qué existe Opsly, a dónde va
3. **[CLAUDE.md](../../.claude/CLAUDE.md)** — reglas técnicas, stack, guardrails, comandos

---

## Contexto en 60 segundos

**Opsly** es una plataforma SaaS multi-tenant para automatizar operaciones de PYMES. Arquitectura de microservicios (27 apps en el monorepo). Un solo operador humano: **Cristian Boteros** (`cboteros1@gmail.com`).

**Repo:** `cloudsysops/opsly` | **VPS:** `vps-dragon@100.120.151.91` (Tailscale) | **Secrets:** Doppler `ops-intcloudsysops / prd`

**Tenant de referencia:** `peskids` — academia de natación, primer vertical incubado

---

## Reglas no negociables

| Regla | Por qué |
|-------|---------|
| `doppler run --project ops-intcloudsysops --config prd -- <cmd>` | Nunca hardcodear secrets |
| No push directo a `main` | PR workflow obligatorio |
| No `any` en TypeScript | Multi-tenant type safety |
| `tenant_slug` en todo scope boundary | Isolation multi-tenant |
| No K8s/Swarm/nginx sin ADR | Stack definido: Docker Compose + Traefik |
| No `terraform apply` sin plan previo | Infraestructura destructiva |
| No activar Wompi en producción | Pendiente smoke + secrets |
| No tocar Clerk, Sentinel, Bolt, Palette, wacrm viejo, Chatwoot, GHL | Feature freeze explícito |

---

## Tu primera acción en sesión

```bash
# 1. Leer AGENTS.md (estado compartido)
cat AGENTS.md | head -80

# 2. Ver rama, tema y áreas tocadas
bash scripts/git-session-brief.sh

# 3. Estado git rápido
git status && git log --oneline -3

# 4. Encontrar el skill correcto para tu tarea
node scripts/skill-finder.js "mi tarea aquí" --autonomous
```

---

## Stack de servicios

| App | Puerto | Descripción |
|-----|--------|-------------|
| `api` | 3000 | Control plane SaaS multi-tenant |
| `admin` | 3001 | Dashboard de operaciones |
| `portal` | 3002 | Portal por tenant (Zero-Trust) |
| `mcp` | 3003 | OpenClaw MCP tools |
| `peskids` | 3004 | Vertical academia de natación |
| `llm-gateway` | 3010 | Gateway LLM: Fable/Opus/Sonnet/Haiku |
| `orchestrator` | 3011 | BullMQ, OAR, agentes locales |
| `context-builder` | 3012 | Knowledge index + brain sync |

---

## Stack AI — Modelos y cuándo usarlos

```
claude-fable-5   (alias: fable)  → Decisiones críticas, playbooks, arquitectura
claude-opus-4-8  (alias: opus)   → Análisis profundo, razonamiento extendido
claude-sonnet-4-6 (alias: sonnet) → Producción estándar, respuestas de negocio
claude-haiku-4-5-20251001 (alias: haiku) → Clasificación, routing, alta frecuencia
```

**Regla:** Todo LLM pasa por `apps/llm-gateway`. Nunca importar el SDK de Anthropic directamente.

```ts
import { llmCall } from '@intcloudsysops/llm-gateway';

await llmCall({
  model: 'sonnet',           // o 'fable', 'opus', 'haiku'
  prompt: '...',
  tenant_slug: 'peskids',    // OBLIGATORIO
  request_id: crypto.randomUUID(), // OBLIGATORIO
});
```

Ver detalles: [[brain/skills/fable5-manual]] · [[brain/AI-STRATEGY]] · [[brain/modules/llm-gateway]]

---

## Skills más usados

Carga el skill correcto antes de empezar cualquier tarea:

| Tarea | Skills a cargar |
|-------|----------------|
| Trabajo en peskids | `opsly-peskids`, `opsly-frontend`, `opsly-api` |
| Nueva ruta API | `opsly-api`, `opsly-supabase` |
| LLM / AI | `opsly-llm`, `fable5-manual` |
| Deploy / infra | `opsly-infra`, `opsly-qa` |
| Billing / Stripe | `opsly-billing`, `opsly-stripe-marketplace` |
| Diagnóstico monorepo | `opsly-quantum`, `opsly-context` |
| Crear/editar skill | `opsly-skill-creator` |
| ADR / arquitectura | `opsly-architect-senior` |
| Seguridad / Shield | `opsly-shield` |

Ver mapa completo: [[brain/skills/README]]

---

## Comandos de validación (antes de hacer PR)

```bash
# Type-check de todo el monorepo
npm run type-check

# Tests del workspace que tocaste
npm run test --workspace=@intcloudsysops/<modulo>

# Validar configuración
bash scripts/validate-config.sh

# Validar OpenAPI si tocaste apps/api
npm run validate-openapi --workspace=@intcloudsysops/api

# Full CI gate (puede ser lento — usar en VPS)
npm run verify
```

---

## Al cerrar sesión

```bash
# 1. Ver qué cambió
git status && git diff --stat

# 2. Actualizar AGENTS.md con: completado / blockers / próximos pasos
# (sección "Sesión YYYY-MM-DD" al final de AGENTS.md)

# 3. Commit y push
git add AGENTS.md && git commit -m "docs(agents): session update $(date +%Y-%m-%d)"
git push origin <branch-name>

# 4. Si la tarea está lista → crear PR
gh pr create --draft --base main --head <branch-name>
```

---

## Rutas del brain más útiles

| Necesidad | Documento |
|-----------|-----------|
| Visión general del vault | [[brain/INDEX]] |
| Skills disponibles | [[brain/skills/README]] |
| Módulos del monorepo | [[brain/modules/README]] |
| Tenants activos | [[brain/tenants/README]] |
| Workflows n8n + OpenClaw | [[brain/workflows/README]] |
| ADRs y mapas técnicos | [[brain/architecture/README]] |
| Estrategia AI | [[brain/AI-STRATEGY]] |
| Manual Fable 5 | [[brain/skills/fable5-manual]] |
| Instrucciones para agentes n8n | [[brain/skills/fable5-agent-instructions]] |
| Playbook por tipo de tenant | [[brain/TENANT-AI-PLAYBOOK]] |
| Módulo peskids | [[brain/modules/peskids]] |

---

## Escalada

Si `confidence < 0.3` o el intent es `deploy` o dominio desconocido: **escala a Cristian**.

No tomes acciones destructivas (prune Docker, drop tables, force push) sin confirmación explícita del usuario.

---

*Actualizado 2026-07-08 | v1.0.0 | Ver también [[brain/README]] para reglas del vault*
