# ADR-010: LLM Gateway con Cache Redis

## Estado: ACEPTADO | Fecha: 2026-04-07

## Contexto

OpenClaw llama a Claude API directamente sin control de costos,
sin cache y sin fallback. Con múltiples tenants esto escala mal.

## Decisión

Crear `apps/llm-gateway/` como proxy interno entre cualquier
servicio Opsly y los proveedores LLM.

## Responsabilidades

- Cache lookup en Redis antes de llamar al modelo
- Logging de tokens por tenant
- Routing: Claude Sonnet (default) -> Claude Haiku (fallback barato)
- Estimación de costo por request

## Consecuencias

- Todo el código que llame a Anthropic API pasa por el gateway
- `apps/ml/` y `apps/mcp/` dejan de llamar Anthropic directamente
- Redis key: `tenant:{slug}:llm:cache:{hash_del_prompt}`
- TTL cache: 1 hora para respuestas determinísticas

## NO hacer

- No implementar OpenAI todavía (complejidad innecesaria)
- No hacer gateway externo (HTTP extra hop)
- No cachear respuestas con temperatura > 0
