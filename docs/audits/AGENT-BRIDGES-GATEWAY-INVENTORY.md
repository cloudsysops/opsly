# Inventario — bridges CLI vs LLM Gateway

**Fecha:** 2026-08-09  
**Rama:** `feat/opsly-reusable-core`  
**Alcance:** documentación (sin forzar Gateway en runtime todavía)  
**Relacionado:** `docs/00-architecture/AGENT-ROUTING.md`, ADR-010, ADR-048

## Objetivo

Mapear qué bridges locales (puertos 5001–5011) pueden llamar modelos **fuera** del LLM Gateway, y definir el orden de endurecimiento sin big-bang.

## Inventario (config)

Fuente: `config/agent-services.json`

| Bridge | Puerto default | CLI | `llmFallback` | Path canónico Opsly |
|---|---|---|---|---|
| `local_cursor` | 5001 | cursor | `deepseek_v4` | Orchestrator → HTTP bridge |
| `local_claude` | 5002 | claude | `claude_haiku` | idem |
| `local_copilot` | 5003 | copilot | — | idem |
| `local_opencode` | 5004 | opencode | — | idem |
| `local_codex` | 5005 | codex | — | idem |
| `local_openai` | 5006 | openai | — | idem |
| `local_hermes` | 5007 | hermes | — | idem |
| `local_decepticon` | 5008 | decepticon | — | idem |
| `local_aider` | 5009 | aider | — | idem |
| `local_goose` | 5010 | goose | — | idem |
| `local_playwright` | 5011 | playwright | — | QA / browser |
| `llm_gateway` | 3010 | — | n/a | **Único borde de modelo** (política) |

Scripts de arranque: `scripts/cli-agent-service.ts`, `scripts/opsly-agent-cli.ts`, `scripts/cursor-agent-service.ts`.

## Clasificación de riesgo

| Clase | Significado | Ejemplos |
|---|---|---|
| **A — IDE/CLI con LLM propio** | El binario habla con su proveedor; Opsly no ve tokens | cursor, claude, copilot, codex, opencode |
| **B — Bridge thin HTTP** | Solo recibe prompt y delega; puede o no pasar por Gateway | openai bridge, hermes local |
| **C — Local model** | Ollama / llama vía Gateway o directo | ADR-024 path `enqueue-ollama` |
| **D — Sin LLM** | Browser/QA tooling | playwright |

## Estado actual (honesto)

1. **AgentTaskEnvelopeV1** + `agent-task-core` rutean y encolan a bridges; **no** interceptan llamadas LLM del CLI.
2. El Gateway sigue siendo obligatorio para tráfico de **apps** (orchestrator workers, ml, api) que usen `llmCall` / `/v1/*`.
3. Forzar Gateway dentro de Cursor/Claude/Codex CLIs **no** es viable sin wrappers/proxy; la política realista es:
   - documentar excepción clase A,
   - exigir Gateway en clase B/C cuando el bridge haga fetch a providers,
   - metering aproximado vía envelope `budget` + logs de enqueue.

## Plan incremental (PRs siguientes)

| PR | Cambio | Criterio de hecho |
|---|---|---|
| G1 (este doc) | Inventario + clasificación | Merge docs only |
| G2 | Auditar `scripts/cli-agent-service.ts` + bridges que hagan `fetch` a APIs de modelo | Lista de call sites + issue |
| G3 | Para clase B: env `OPSLY_BRIDGE_LLM_VIA_GATEWAY=true` default off → on en CI local | Tests unitarios del wrapper |
| G4 | Clase C: todo Ollama vía Gateway health daemon (ya ADR-024) | Smoke `/v1/text` |
| G5 | Clase A: solo observabilidad (envelope + Discord opcional); no proxy del IDE | Doc + métrica enqueue |

## No hacer

- Matar bridges IDE “porque no pasan por Gateway”.
- Segundo Gateway o proxy MITM de Anthropic/OpenAI.
- Deploy de día / tocar Peskids por este endurecimiento.

## Verificación rápida

```bash
# dry-run del core (no LLM)
npm run agent:assign-task -- --task "revisar gateway inventory" --tenant academy-demo
./node_modules/.bin/tsx scripts/smoke-agent-task-core.ts
```
