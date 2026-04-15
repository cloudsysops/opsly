# Skills Opsly v2.0 — Sistema Autónomo

> Skills procedurales para agentes IA autónomos en **Opsly** — sin improvisar, sin preguntar.

## Quick Start

```bash
# Detectar skills automáticamente
node scripts/skill-finder.js "crear api route" --autonomous

# Auto-cargar skills
node scripts/skill-loader.js --context "mi query"

# Modo autonomía total
node scripts/skill-finder.js "godmode" --autonomous
```

## Sistema de Autonomía

### Concepto

El sistema de skills permite que el agente **decida SOLO** qué skills cargar basándose en la query del usuario, sin necesidad de confirmación.

### Componentes

| Componente | Ubicación | Función |
|------------|-----------|---------|
| `skill-finder.js` | `scripts/` | Búsqueda con fuzzy matching + scoring |
| `skill-loader.js` | `scripts/` | Auto-carga de skills en cadena |
| `skill-autonomous.ts` | `skills/manifest/src/` | Análisis de contexto y decisiones |
| `skill-hooks.sh` | `scripts/` | Hooks Bash para integración |
| `skill-validator.ts` | `skills/manifest/src/` | Validación completa de skills |
| `skill-doc-gen.js` | `scripts/` | Generación de documentación |

### Flujo Autónomo

```
User Query → skill-finder.js → classify intent/domain
           → suggestChain() → skills[]
           → skill-loader.js → load content
           → execute autonomously
```

## CLI Reference

### skill-finder.js

```bash
# Búsqueda simple
node scripts/skill-finder.js "crear api route"

# Modo autónomo (genera cadena)
node scripts/skill-finder.js "mcp tool oauth" --autonomous

# Output JSON (para scripts)
node scripts/skill-finder.js "mi query" --json

# Cargar todos los skills
node scripts/skill-loader.js --all
```

### skill-autonomous.ts

```bash
# Análisis de contexto
npx tsx skills/manifest/src/skill-autonomous.ts "crear migration"

# Salida:
# - intent: create|modify|debug|deploy|monitor|analyze
# - domain: api|bash|infra|ml|db|tenant|mcp|unknown
# - confidence: 0-1
# - plan: cadena de skills
```

### skill-validator.ts

```bash
# Validar todos los skills
npx tsx skills/manifest/src/skill-validator.ts

# Valida:
# - manifest.json (campos requeridos)
# - Triggers (mínimo 5)
# - Cross-references (existen en índice)
# - SKILL.md (secciones obligatorias)
```

### skill-doc-gen.js

```bash
# Generar README completo
node scripts/skill-doc-gen.js readme

# Generar API docs
node scripts/skill-doc-gen.js api

# Matriz de triggers
node scripts/skill-doc-gen.js triggers

# Matriz de dependencias
node scripts/skill-doc-gen.js matrix
```

### skill-hooks.sh

```bash
# Importar funciones
source scripts/skill-hooks.sh

# Detectar skill para query
skill_detect "crear api"

# Auto-cargar skills
skill_autoload "mi query"

# Validar manifests
skill_validate

# Listar todos
skill_list
```

## Skills Disponibles (16)

### Critical (2)

| Skill | Triggers | Descripción |
|-------|----------|-------------|
| `opsly-autonomous` | autónomo, godmode, auto-fix | Sistema de autonomía completo |
| `opsly-context` | sesión, inicio, contexto | Bootstrap de sesión |

### High (7)

| Skill | Triggers | Descripción |
|-------|----------|-------------|
| `opsly-quantum` | orquestación, diagnóstico | Skill maestro |
| `opsly-api` | api, route, endpoint | Rutas API |
| `opsly-bash` | script, bash, shell | Scripts Bash |
| `opsly-llm` | llm, ai, modelo | LLM Gateway |
| `opsly-mcp` | mcp, tool, oauth | MCP OpenClaw |
| `opsly-supabase` | sql, supabase, rls | Migraciones |
| `opsly-tenant` | tenant, onboard, n8n | Onboarding |

### Medium (5)

| Skill | Triggers | Descripción |
|-------|----------|-------------|
| `opsly-agent-teams` | bullmq, queue, job | BullMQ teams |
| `opsly-discord` | discord, webhook | Notificaciones |
| `opsly-feedback-ml` | feedback, ml, auto | Feedback + ML |
| `opsly-google-cloud` | gcp, drive, bigquery | GCP |
| `opsly-architect-senior` | arquitectura, ADR | Arquitectura |

### Low (2)

| Skill | Triggers | Descripción |
|-------|----------|-------------|
| `opsly-notebooklm` | notebooklm, podcast | NotebookLM |
| `opsly-simplify` | docker, compose | Docker optimization |

## Templates

En `skills/templates/`:

| Template | Uso |
|----------|-----|
| `template-api-route.md` | Rutas API con tests |
| `template-bash-script.md` | Scripts idempotentes |
| `template-mcp-tool.md` | Tools MCP con OAuth |
| `template-migration.md` | Migraciones SQL |
| `template-test.md` | Tests Vitest |

## Integración

### Claude / Cursor

Añadir a `.claude/CLAUDE.md`:

```bash
# Al inicio de sesión
source scripts/skill-hooks.sh
skill_autoload "inicio sesión"
```

### GitHub Actions

```yaml
- name: Validate Skills
  run: |
    npx tsx skills/manifest/src/skill-validator.ts
    node scripts/skill-doc-gen.js
```

### CI/CD

```bash
# Pre-commit
npm run validate-skills

# Push
node scripts/skill-finder.js --autonomous --json
```

## Métricas de Autonomía

| Métrica | Target | Actual |
|---------|--------|--------|
| Skills con manifest.json | 100% | 16/16 ✅ |
| Skills con triggers | 100% | 16/16 ✅ |
| Skills con cross-refs | 100% | 16/16 ✅ |
| Avg triggers por skill | 5+ | 6.2 |
| Templates disponibles | 5 | 5 ✅ |

## Changelog

### v2.0 (2026-04-15)
- Sistema de autonomía completo
- 16 skills con manifest.json
- Fuzzy matching en búsqueda
- Templates reutilizables
- Validación automática
- Documentación auto-generada
- CLI completo

### v1.0 (2026-04-14)
- 15 skills básicos
- SKILL.md simples
