---
status: active
owner: ai-platform
last_review: 2026-07-08
type: module
layer: ai-control
repo_path: apps/llm-gateway
runtime: Node.js service
tags:
  - opsly/module
  - opsly/llm
related_docs:
  - docs/00-architecture/LLM-GATEWAY.md
  - docs/adr/ADR-010-llm-gateway.md
---

# LLM Gateway

Punto unico para llamadas LLM, routing, cache, usage y costos. Ningun modulo debe
llamar proveedores LLM directo fuera de OpenClaw / gateway.

## Consumidores

- [[brain/modules/orchestrator|Orchestrator]]
- [[brain/modules/api|API Control Plane]]
- Syra/social content
- Hermes metering

## Contratos

- `llmCall`
- `logUsage`
- routing bias: `cost`, `balanced`, `quality`
- `tenant_slug` + `request_id` obligatorios para trazabilidad

## Modelos disponibles (2026-07-08)

| ProviderId | Modelo | Tier | Uso recomendado |
|---|---|---|---|
| `claude_fable` | `claude-fable-5` | Top | Razonamiento máximo, tareas complejas, análisis profundo |
| `claude_opus` | `claude-opus-4-8` | Alto | Fallback de Fable, tareas de alta calidad |
| `claude_sonnet` | `claude-sonnet-4-6` | Medio-alto | Producción general, balance calidad/costo |
| `claude_haiku` | `claude-haiku-4-5-20251001` | Bajo | Tareas rápidas, clasificación, respuestas cortas |
| `deepseek_chat` | deepseek-v4-flash | Medio | Razonamiento económico, alternativa a sonnet |
| `deepseek_v4` | deepseek-v4 | Medio-alto | Tareas complejas económicas |
| `gpt4o` | gpt-4o | Medio-alto | Fallback OpenAI |
| `gpt4o_mini` | gpt-4o-mini | Bajo | Fallback OpenAI económico |
| `gemini_flash` | gemini-2.0-flash | Bajo | Intent, transcripción |
| `groq_chat` | llama-3.3-70b-versatile | Bajo | Velocidad máxima |
| `llama_local` | nemotron-3-nano:4b | Gratis | Offline, sin costo |

## Routing preferences

Pasadas como `model` en `LLMRequest` o via header `x-llm-model`:

| Preference | Cadena | Cuándo usar |
|---|---|---|
| `fable` | fable → opus → sonnet | Máxima capacidad, reasoning complejo |
| `opus` | opus → fable → sonnet | Alta calidad con fallback a fable |
| `sonnet` | sonnet → gpt4o → haiku | Producción estándar |
| `balanced` | deepseek_v4 → sonnet → ... | Costo/calidad equilibrado |
| `haiku` | haiku → groq → deepseek → llama | Operaciones rápidas y baratas |
| `cheap` | llama → groq → nvidia → haiku | Costo mínimo |
| `code` | codellama → gpt4o → deepseek | Generación de código |

**Complejidad automática** (sin `model` explícito):
- Nivel 3 → `fable`
- Nivel 2 → `balanced`
- Nivel 1 → `cheap`

