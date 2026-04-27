# AGENTS.md — Contexto Global para Todos los Agentes IA

> **Ruta de aprendizaje obligatoria para TODO agente que trabaje con Opsly.**
> Al iniciar cualquier sesión: carga este archivo primero.

## 📚 Fuente de verdad

- **Repo:** `cloudsysops/opsly` (público)
- **URL raw:** `https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md`
- **Último commit:** `ae7ee0e` (2026-04-13)

## 🧠 NotebookLM — Knowledge Layer Universal

> **Cada agente DEBE consultar NotebookLM al iniciar sesión.**
> Ver: [`docs/adr/ADR-025-notebooklm-knowledge-layer.md`](../adr/ADR-025-notebooklm-knowledge-layer.md)

**Query de startup obligatorio:**

```
"Eres el arquitecto senior de Opsly. Resume en 5 bullets:
1. Qué se decidió hoy
2. Qué está bloqueado
3. Qué es prioritario
4. Qué optimizar
5. Qué NO hacer

Basado en: AGENTS.md, ROADMAP.md, y las últimas decisiones en docs/adr/"
```

**Sync automático:** `npm run notebooklm:sync` tras cada commit (hook post-commit).

| Acción                 | Comando                                 |
| ---------------------- | --------------------------------------- |
| Sync docs → NotebookLM | `npm run notebooklm:sync`               |
| Query NotebookLM       | `npm run notebooklm:query "<pregunta>"` |
| Feed single doc        | `npm run docs:to-notebooklm`            |

**Keywords que activan consulta NotebookLM:**
`bloqueante`, `prioridad`, `estado actual`, `qué hacer`, `next`, `decisión`

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

| Agente / Herramienta                         | Skill                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| **Claude**                                   | `.claude/CLAUDE.md` + `/mnt/skills/index.json` + `/mnt/skills/user/*`       |
| **Cursor**                                   | `.cursor/rules/opsly.mdc` + `/mnt/skills/index.json` + `/mnt/skills/user/*` |
| **Copilot**                                  | `.github/copilot-instructions.md` + `/mnt/skills/index.json`                |
| **OpenCode**                                 | `/mnt/skills/index.json` + `/mnt/skills/user/*`                             |
| **Hermes**                                   | `docs/IMPLEMENTATION-IA-LAYER.md` + `/mnt/skills/index.json`                |
| **Decepticon / OpenClaude / nuevos agentes** | `/mnt/skills/index.json` + `/mnt/skills/user/*`                             |
| **Nuevo agente**                             | Leer `AGENTS.md` + `VISION.md` + **consultar NotebookLM**                   |

## 📁 Archivos de contexto por defecto

| Archivo                             | Propósito                                        | Obligatorio          |
| ----------------------------------- | ------------------------------------------------ | -------------------- |
| `AGENTS.md`                         | Estado operativo, bloqueantes, decisiones sesión | ✅ SIEMPRE           |
| `VISION.md`                         | Norte de producto, fases, ICP                    | ✅ Al inicio         |
| `docs/adr/*.md`                     | Decisiones de arquitectura                       | Si toca arquitectura |
| `/mnt/skills/index.json`            | Catálogo unificado de skills                     | ✅ SIEMPRE           |
| `/mnt/skills/user/opsly-*/SKILL.md` | Procedimientos operativos                        | Por skill            |

## 🔁 Publicación de skills para todos los agentes

```bash
# Export estándar para runtimes externos e internos
npm run skills:sync:external

# Dry-run
bash scripts/sync-skills-external.sh --dry-run
```

## 🪝 Hooks unificados para agentes

```bash
# Internos (Cursor/Hermes/servicios locales)
npm run agents:hooks:bootstrap:internal

# Externos (Claude/OpenCode/Copilot/Decepticon/OpenClaude)
npm run agents:hooks:bootstrap:external
```

Referencia completa:

- `docs/AGENT-HOOKS-OBSIDIAN-NOTEBOOKLM-N8N.md`

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

- [ ] **Consultar NotebookLM** al iniciar ("estado operativo actual de Opsly")
- [ ] Leer `AGENTS.md` completo
- [ ] Verificar estado VPS (`docker ps`)
- [ ] `npm run type-check` pasa
- [ ] Tests del workspace tocado pasan
- [ ] No exponer secretos en logs/salida
- [ ] Documentar en ADR si arquitectura

## 📝 Formato de decisiones

| Campo                    | Valor             |
| ------------------------ | ----------------- |
| Fecha                    | YYYY-MM-DD        |
| Decisión                 | Descripción clara |
| Razón                    | Por qué se tomó   |
| Archivos                 | Paths afectados   |
| Alternativas descartadas | Por qué no        |

## 🔗 Enlaces críticos

| Recurso       | URL                                                                |
| ------------- | ------------------------------------------------------------------ |
| Repo GitHub   | https://github.com/cloudsysops/opsly                               |
| AGENTS.md raw | https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md |
| VISION.md raw | https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md |
| Admin         | https://admin.ops.smiletripcare.com                                |
| Portal        | https://portal.ops.smiletripcare.com                               |
| API           | https://api.ops.smiletripcare.com                                  |
| VPS SSH       | `ssh vps-dragon@100.120.151.91`                                    |
