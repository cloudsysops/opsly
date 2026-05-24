---
status: draft
owner: operations
last_review: 2026-05-24
type: guide
tags:
  - opsly/development
---

# Nombres de agentes — Opsly vs binarios externos

## Regla

- **Identificador Opsly (canónico):** `local_<slug>` — claves en `config/agent-services.json` bajo `services`, tipo de job BullMQ (`local_cursor`, …), y respuestas API que refieren al **servicio bridge** registrado en Opsly. **No reutilizar** estos strings como nombre del binario del proveedor.
- **Nombre externo (binario / producto del vendor):** va en el campo opcional **`external_cli`** en cada entrada de `services`, y en documentación o runbooks cuando hablés del programa instalado (`cursor`, `claude`, `codex`, …).

## Entrada humana (alias)

En `POST /api/local/prompt-submit`, frontmatter `agent:` y similares **aceptan** el nombre externo corto (`cursor`) o el id Opsly (`local_cursor`); el runtime normaliza siempre al id Opsly antes de encolar.

**PID / estado local (`scripts/opsly-agent-cli.ts`):** los archivos bajo `.cursor/agent-processes/` usan el id Opsly (p. ej. `local_cursor.json`). Si tenías `cursor.json` de una versión anterior, renombralo o volvé a `start` con el id nuevo.

## Referencias

- `docs/01-development/OPENCLAW-TERMINOLOGY.md` — OpenClaw CLI vs Orquestador Opsly.
- `docs/03-agents/LOCAL-AGENT-EXECUTION.md` — flujo local y cola `local-agents`.

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
