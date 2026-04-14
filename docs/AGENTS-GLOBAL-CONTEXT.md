# AGENTS.md — Contexto Global para Todos los Agentes IA

> **Ruta de aprendizaje obligatoria para TODO agente que trabaje con Opsly.**
> Al iniciar cualquier sesión: carga este archivo primero.

## 📚 Fuente de verdad

- **Repo:** `cloudsysops/opsly` (público)
- **URL raw:** `https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md`
- **Último commit:** `ae7ee0e` (2026-04-13)

## 🚀 Inicio rápido para nuevo agente

```bash
# 1. Leer contexto
cat AGENTS.md

# 2. Leer norte de producto
cat VISION.md

# 3. Verificar estado VPS
ssh vps-dragon@100.120.151.91 "docker ps --format '{{.Names}}\t{{.Status}}' | head -10"

# 4. Quick commands
npm run type-check
```

## ⚡ Skills por tarea

| Agente / Herramienta | Skill |
|---------------------|-------|
| **Claude** | `.claude/CLAUDE.md` + `skills/user/opsly-*/SKILL.md` |
| **Cursor** | `.cursor/rules/opsly.mdc` + `skills/user/opsly-*/SKILL.md` |
| **Copilot** | `.github/copilot-instructions.md` |
| **OpenCode** | Este repo + skills/* |
| **Hermes** | `docs/IMPLEMENTATION-IA-LAYER.md` |
| **Nuevo agente** | Leer `AGENTS.md` + `VISION.md` |

## 📁 Archivos de contexto por defecto

| Archivo | Propósito | Obligatorio |
|---------|----------|------------|
| `AGENTS.md` | Estado operativo, bloqueantes, decisiones sesión | ✅ SIEMPRE |
| `VISION.md` | Norte de producto, fases, ICP | ✅ Al inicio |
| `docs/adr/*.md` | Decisiones de arquitectura | Si toca arquitectura |
| `skills/user/opsly-*/SKILL.md` | Procedimientos operativos | Por skill |

## 🔐 Reglas globales para todos los agentes

1. **NUNCA hardcodear secretos** — usar Doppler (`ops-intcloudsysops/prd`)
2. **NUNCA usar `any` en TypeScript**
3. **SSH al VPS** — solo por Tailscale `100.120.151.91`
4. **LLM calls** — siempre por `apps/llm-gateway` (no Anthropic/OpenAI directo)
5. **Validación antes de commit** — `npm run type-check` + tests
6. **Documentar decisiones** — ADR en `docs/adr/`

## 🏗️ Stack actual

```
VPS (control plane)                    Worker Mac 2011
┌─────────────────────────┐          ┌─────────────────────────┐
│ API :3000               │          │ Ollama :11434           │
│ LLM Gateway :3010      │◄────────►│ (qwen2.5-coder)        │
│ Orchestrator :3011       │          │ BullMQ workers          │
│ Redis (BullMQ/cache)    │          └─────────────────────────┘
└─────────────────────────┘
```

## ✅ Checklist antes de ejecutar código

- [ ] Leer `AGENTS.md` completo
- [ ] Verificar estado VPS (`docker ps`)
- [ ] `npm run type-check` pasa
- [ ] Tests del workspace tocado pasan
- [ ] No exponer secretos en logs/salida
- [ ] Documentar en ADR si arquitectura

## 📝 Formato de decisiones

| Campo | Valor |
|-------|-------|
| Fecha | YYYY-MM-DD |
| Decisión | Descripción clara |
| Razón | Por qué se tomó |
| Archivos | Paths afectados |
| Alternativas descartadas | Por qué no |

## 🔗 Enlaces críticos

| Recurso | URL |
|---------|-----|
| Repo GitHub | https://github.com/cloudsysops/opsly |
| AGENTS.md raw | https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md |
| VISION.md raw | https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md |
| Admin | https://admin.ops.smiletripcare.com |
| Portal | https://portal.ops.smiletripcare.com |
| API | https://api.ops.smiletripcare.com |
| VPS SSH | `ssh vps-dragon@100.120.151.91` |
