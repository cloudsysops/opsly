# Sistema de Conocimiento Opsly — NotebookLM + Obsidian

> **Última actualización:** 2026-05-10
> **Para agentes:** leer este doc primero para entender cómo Opsly gestiona conocimiento.

---

## 🌐 Visión general

Opsly usa **dos sistemas de conocimiento** complementarios:

| Sistema        | Propósito                                                                       | Cuándo usar                                    |
| -------------- | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| **NotebookLM** | Knowledge layer universal para agentes IA; genera podcasts, slides, résúmenes   | Queries operativas, contexto durante ejecución |
| **Obsidian**   | Documentación técnica local con graph/wiki-links; fuente de verdad para humanos | Desarrollo, arquitectura, decisiones           |

**Fuente de verdad para agentes:** `AGENTS.md` (raíz del repo) → publicado a GitHub → sincronizado con NotebookLM en cada commit.

---

## 📚 NotebookLM (Knowledge Layer)

### Configuración actual

```bash
# Variables en Doppler (prd)
NOTEBOOKLM_ENABLED=true        # Solo business+/enterprise
NOTEBOOKLM_NOTEBOOK_ID=<id>    # ID del notebook en notebooklm.google.com
```

### Flujo de sync (ADR-025)

1. **Post-commit:** `.githooks/post-commit` → `scripts/index-knowledge.sh` → regenera `config/knowledge-index.json`
2. **Query startup:** cada sesión Claude/agent debe preguntar: `"¿Cuál es el estado actual de Opsly?"` → NotebookLM retorna contexto resumido
3. **Routing LLM Gateway:** si detecta keywords operativas (`deploy`, `error`, `vps`, `tenant`), consulta NotebookLM antes de proceder

### Scripts disponibles

```bash
# Regenerar índice de conocimiento
npm run update-state
node scripts/index-knowledge.sh

# Sync a NotebookLM (requiere NOTEBOOKLM_NOTEBOOK_ID)
npm run notebooklm:sync

# Query al notebook
node scripts/query-notebooklm.mjs "¿Cuál es el estado actual de Opsly?"
```

### Casos de uso

- **Reporte mensual tenant:** PDF → podcast + slides (workflow `report-to-podcast.py`)
- **Resumen operativo:** AGENTS.md + system_state.json → podcast para revisión
- **Investigación:** URLs/docs → fuentes en notebook → quiz, chat

---

## 📓 Obsidian (Documentación local)

### Estructura del vault

Mapa completo (todas las carpetas y hubs): [`index.md`](../index.md).
Política de ubicación: [`STRUCTURE-GUARDRAILS.md`](../STRUCTURE-GUARDRAILS.md).
Inventario regenerable de todos los `.md`: `npm run obsidian:file-index`.

### Graph view (obsidian://graph)

- **Nodos:** archivos `.md` en `docs/`
- **Links:** `[[nombre]]` para wiki-links internos
- **Tags:** `#tag` para categorización

### Plugins recomendados

```json
// .obsidian/workspace.json (ya en repo)
{
  "plugin": ["graph", "backlinks", "daily-notes", "templates"]
}
```

### Reglas de documentación

1. **Cada decisión = un ADR** en `docs/adr/`
2. **Cada runbook = un archivo** en `docs/runbooks/`
3. **Sin duplicados:** si algo ya está en AGENTS.md, referenciar en lugar de copiar
4. **Tags al final:** `#ops #ia #infra` para filtrar en graph

---

## 🔄 Flujo de trabajo agente

```mermaid
flowchart TD
    A[Agente inicia sesión] --> B[Lee AGENTS.md raw]
    B --> C{Existen cambios en docs?}
    C -->|Sí| D[Ejecuta index-knowledge.sh]
    C -->|No| E[Consulta NotebookLM]
    E --> F[Query: estado operativo]
    F --> G[Ejecuta tarea]
    G --> H[Actualiza docs si aplica]
    H --> I[Commit + push]
    I --> J[Sincroniza espejos .github/]
```

---

## ⚡ Quick reference para agentes

```bash
# 1.获取 contexto
https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md

# 2. Regenerar índice conocimiento
npm run update-state

# 3. Query NotebookLM
node scripts/query-notebooklm.mjs "<pregunta>"

# 4. Ver documentación
docs/README.md  ← índice principal
docs/QUICK-REFERENCE.md  ← comandos rápidos
```

---

## 📋 Checklist para nuevos docs

- [ ] ¿Ya existe en AGENTS.md? → referenciar
- [ ] ¿Es una decisión? → crear ADR en `docs/adr/`
- [ ] ¿Es un runbook? → crear en `docs/runbooks/`
- [ ] ¿Tiene tags al final? → `#ops #ia #infra`
- [ ] ¿Tiene links a otros docs? → `[[nombre]]`
- [ ] ¿Actualiza README.md índice?

---

## Triada wiki (Obsidian + índice + Graphyfi)

| Pieza | Función |
| --- | --- |
| **Obsidian** | Wiki local: MOC [`index.md`](../index.md), wikilinks, graph view. |
| **`config/knowledge-index.json`** | Inventario para agentes / Context Builder / NotebookLM (fuentes repo-first). |
| **Graphyfi** | Nodos `doc:<slug>` y relación `documents` hacia módulos; tool MCP `graphyfi`. |

Orden tras entregar código **y** pruebas: documentar → `npm run index-knowledge` → `npm run obsidian:file-index`. Detalle y Definition of Done: [`docs/01-development/DOCUMENTATION-LIFECYCLE.md`](../01-development/DOCUMENTATION-LIFECYCLE.md).

### Qué suele faltar (revisar periódicamente)

- Grafo de módulos (`config/github-module-graph.json`) alineado al monorepo.
- Notas en `docs/brain/modules/` para apps con mucho tráfico de cambios.
- Sync de índice tras oleadas de commits solo de código sin regen de `knowledge-index.json`.

---

## 🔗 Enlaces relacionados

- [`AGENTS.md`](../AGENTS.md) — estado operativo
- [`VISION.md`](../VISION.md) — norte del producto
- [`ROADMAP.md`](../ROADMAP.md) — plan semanal
- [`docs/adr/ADR-025-notebooklm-knowledge-layer.md`](adr/ADR-025-notebooklm-knowledge-layer.md)
- [`skills/user/opsly-notebooklm/SKILL.md`](../skills/user/opsly-notebooklm/SKILL.md)
- [`docs/01-development/DOCUMENTATION-LIFECYCLE.md`](../01-development/DOCUMENTATION-LIFECYCLE.md)
