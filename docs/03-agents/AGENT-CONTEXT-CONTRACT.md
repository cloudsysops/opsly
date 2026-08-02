---
status: canon
owner: operations
type: runbook
---

# Contrato común de contexto y consumo

Todos los agentes de Opsly —Codex, Claude, Cursor, Copilot, OpenCode, Hermes y
workers— usan [`config/agent-context-contract.json`](../../config/agent-context-contract.json).

## Política efectiva

- El arranque carga solo `opsly-context` y `opsly-bootstrap`.
- La tarea selecciona como máximo un skill de dominio y uno de verificación.
- El contexto inicial está limitado a 12.000 tokens y la salida normal a 1.600.
- La investigación profunda usa `brain:research`; búsquedas de código se hacen localmente.
- Todo tráfico de modelo pasa por `OpenClaw -> apps/llm-gateway`.
- Cada llamada conserva agente, proveedor, modelo, `request_id`, tokens de entrada/salida y coste.
- El handoff mínimo es: `changed`, `validated`, `risks`, `next_step`.

## Cómo arrancar un agente

```bash
npm run validate-agent-contract
npm run agent:brief -- --agent codex --task "describir la tarea aquí"
```

El brief es provider-neutral y puede inyectarse en cualquier suscripción o CLI.
El launcher debe rechazar el arranque si falla la validación.

## Qué no significa

El repositorio no puede controlar una suscripción externa que se ejecute fuera de
este launcher/gateway. Para que la política sea obligatoria, cada integración debe
entrar por el launcher común o por `apps/llm-gateway`; CI valida que el contrato no
se degrade.

## Verificación

```bash
npm run validate-agent-contract
npm run test-agent-contract
```
