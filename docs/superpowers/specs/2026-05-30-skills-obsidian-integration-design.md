# Skills → Obsidian Integration Design

**Date:** 2026-05-30
**Branch:** fix/prompt-injection-guards
**Author:** cboteros
**Status:** approved

---

## Problema

63 skills viven en `packages/skills/user/` y `skills/index.json` pero son invisibles desde el vault Obsidian (`docs/brain/`). Un agente nuevo arranca leyendo el brain (tenants, agents, sessions) pero no sabe qué skills cargar para un contexto dado. `docs/brain/sessions/` está vacío. No hay puente entre skills y el graph de Obsidian.

---

## Objetivo

- Skills navegables como notas enlazadas en el graph de Obsidian
- Un agente nuevo puede identificar en segundos qué skills cargar para su sesión
- `opsly-peskids` como piloto completamente enriquecido
- Zero mantenimiento manual — sincronización automática desde `manifest.json`

---

## Enfoque elegido: Híbrido generado + frontmatter enriquecido

El script `sync-skills-to-brain.ts` genera notas Obsidian desde `manifest.json`. Los campos editoriales opcionales (`session_context`, `subagents`, `when_not`) viven en el frontmatter de `SKILL.md` y el script los incluye si existen. `opsly-peskids` es el piloto completo.

---

## Estructura de archivos

```
docs/brain/
  skills/
    README.md                  ← MOC: skills por categoría + tabla arranque rápido
    opsly-peskids.md           ← piloto enriquecido
    opsly-api.md               ← generado desde manifest
    opsly-frontend.md
    ... (63 notas total)

packages/skills/user/
  opsly-peskids/
    SKILL.md                   ← se agrega frontmatter: session_context, subagents, when_not
    manifest.json              ← sin cambios

scripts/
  sync-skills-to-brain.ts      ← script de sincronización

docs/brain/skills/README.md    ← MOC principal con tabla por contexto
```

---

## Formato de nota de skill en Obsidian

```markdown
---
name: opsly-peskids
version: 1.0.0
category: operations
priority: high
triggers: [peskids, familias, teacher, admin, landing]
cross_refs: [opsly-tenant, opsly-frontend, opsly-api, opsly-supabase]
session_context: "trabajo en peskids — landing, auth, familias, teacher, admin"
subagents: [opsly-frontend, opsly-api, opsly-qa]
when_not: "cambios que aplican a todos los tenants → usar opsly-tenant"
tags: [opsly/skill, opsly/tenant, operations]
---

# opsly-peskids

> {description desde manifest}

## Cuándo cargar
{session_context}

## Subagentes recomendados
- [[opsly-frontend]]
- [[opsly-api]]
- [[opsly-qa]]

## Cuándo NO
{when_not}

## Cross-refs
[[opsly-tenant]] · [[opsly-supabase]] · [[opsly-infra]]

## Links
- [SKILL.md](../../../packages/skills/user/opsly-peskids/SKILL.md)
- [[brain/tenants/peskids|Tenant: peskids]]
```

Para skills sin frontmatter enriquecido, `Cuándo cargar`, `Subagentes` y `Cuándo NO` se omiten de la nota.

---

## Script: sync-skills-to-brain.ts

**Entradas:**
- `skills/index.json` — lista base (name, category, priority, description, path)
- `packages/skills/user/{name}/manifest.json` — triggers, crossRefs
- `packages/skills/user/{name}/SKILL.md` — frontmatter opcional: `session_context`, `subagents`, `when_not`

**Salidas:**
- `docs/brain/skills/{name}.md` — una nota por skill
- `docs/brain/skills/README.md` — MOC regenerado

**Comando:**
```bash
npx ts-node scripts/sync-skills-to-brain.ts
```

**Comportamiento:**
- Sobreescribe notas existentes (las notas son derivadas, no editoriales)
- Nunca sobreescribe `SKILL.md` ni `manifest.json`
- Si un skill está en `skills/index.json` pero no tiene carpeta en `packages/skills/user/`, genera nota mínima de stub
- Imprime resumen: `✅ 63 notas generadas, 1 enriquecida (opsly-peskids)`

---

## README.md (MOC) — estructura

```markdown
# Skills Brain MOC

## Arranque rápido por contexto

| Contexto de sesión        | Skills a cargar                                    |
|---------------------------|----------------------------------------------------|
| trabajo en peskids        | opsly-peskids, opsly-frontend, opsly-api, opsly-qa |
| nueva ruta API            | opsly-api, opsly-supabase                          |
| deploy / infra            | opsly-infra, opsly-qa                              |
| billing / Stripe          | opsly-billing, opsly-stripe-marketplace            |
| diagnóstico monorepo      | opsly-quantum, opsly-context                       |
| crear/editar skill        | opsly-skill-creator                                |
| LLM Gateway               | opsly-llm                                          |
| orchestrator / BullMQ     | opsly-orchestrator                                 |

## Skills por categoría

### bootstrap (critical)
- [[opsly-context]]
- [[opsly-quantum]]
- [[opsly-autonomous]]
...

### development (high)
- [[opsly-api]]
- [[opsly-frontend]]
...

### operations (high)
- [[opsly-peskids]] ← piloto enriquecido
- [[opsly-tenant]]
- [[opsly-infra]]
...
```

---

## Enriquecimiento de opsly-peskids/SKILL.md

Se agrega este bloque al frontmatter existente de `SKILL.md`:

```yaml
session_context: "trabajo en peskids — landing, auth, familias, teacher, admin, deploy"
subagents:
  - opsly-frontend
  - opsly-api
  - opsly-qa
  - opsly-supabase
when_not: "Si el cambio aplica a todos los tenants, usa opsly-tenant en vez de este skill. No usar para cambios globales de arquitectura."
```

---

## Integración con session startup

Se agrega al final de `scripts/git-session-brief.sh`:

```bash
echo ""
echo "📚 Skills:"
echo "   → node scripts/skill-finder.js \"<tema>\" para cadena de skills"
echo "   → docs/brain/skills/README.md para mapa completo en Obsidian"
```

---

## Criterios de éxito

- [ ] `docs/brain/skills/` contiene 63 notas generadas
- [ ] `opsly-peskids.md` tiene todos los campos enriquecidos (session_context, subagents, when_not, backlink a tenant)
- [ ] `docs/brain/skills/README.md` tiene tabla de arranque rápido con al menos 8 contextos
- [ ] El script corre sin errores: `npx ts-node scripts/sync-skills-to-brain.ts`
- [ ] Graph de Obsidian muestra nodos de skills enlazados a tenants y módulos
- [ ] `git-session-brief.sh` imprime referencia a brain/skills al arrancar

---

## Lo que NO incluye este diseño

- No modifica `skills/index.json` ni manifests (solo los lee)
- No genera notas de sesión individuales (eso es scope futuro)
- No agrega el script al CI/CD (puede hacerse después si se quiere garantizar sync)
- No migra skills de `vendor/agent-skills/` a Obsidian (son de terceros)
