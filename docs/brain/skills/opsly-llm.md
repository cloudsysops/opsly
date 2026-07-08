---
name: opsly-llm
version: 1.1.0
category: ai
priority: high
triggers:
  - llm
  - anthropic
  - openai
  - modelo
  - cache
  - ai
  - llmcall
  - gemini
  - fable
  - fable5
  - opus
  - sonnet
  - routing
cross_refs:
  - opsly-feedback-ml
  - opsly-quantum
tags:
  - opsly/skill
  - opsly/ai
---

# opsly-llm

> LLM Gateway: llmCall, proveedores, caché, routing. Cualquier llamada a LLM vía @intcloudsysops/llm-gateway

## Modelos Anthropic activos

| Alias de routing | Modelo | Tier |
|---|---|---|
| `fable` | `claude-fable-5` | Top — razonamiento máximo |
| `opus` | `claude-opus-4-8` | Alto |
| `sonnet` | `claude-sonnet-4-6` | Medio-alto (producción) |
| `haiku` | `claude-haiku-4-5-20251001` | Bajo / fast |

Para usar Fable 5 desde cualquier agente u otro LLM:

```ts
// vía @intcloudsysops/llm-gateway
const result = await llmCall({
  prompt: '...',
  model: 'fable',           // o 'claude-fable-5' explícito
  tenant_slug: 'peskids',
  request_id: crypto.randomUUID(),
});
```

```http
POST /v1/chat
x-llm-model: fable
x-tenant-slug: peskids
```

Complejidad 3 (automática) también resuelve a Fable 5.

## Cross-refs
[[opsly-feedback-ml]] · [[opsly-quantum]] · [[brain/modules/llm-gateway]] · [[fable5-manual]] · [[fable5-agent-instructions]]

## Links
- [SKILL.md](../../../packages/skills/user/opsly-llm/SKILL.md)
- [Módulo brain](../modules/llm-gateway.md)
