# ADR-011: Orchestrator Event-Driven con BullMQ

## Estado: ACEPTADO | Fecha: 2026-04-07

## Contexto

El orchestrator actual acepta intents y encola jobs pero
no tiene workers reales, persistencia de estado ni
ejecución paralela por tenant.

## Decisión

Completar `apps/orchestrator/` con workers BullMQ reales,
eventos y estado persistido en Redis.

## Estructura de eventos

Intent -> Event (Redis pub/sub) -> Queue (BullMQ) ->
Worker -> Result Event -> State Store -> Notify

## Workers paralelos por tenant

- startup: concurrency 2
- business: concurrency 5
- enterprise: concurrency unlimited

## Consecuencias

- Redis existente se usa para 3 cosas: sessions, cache LLM, queues
- Workers corren en el mismo proceso (monolito modular)
- Estado de jobs en Redis con TTL 24h
