# ADR-033: Migrar Llamadas IA Legacy a LLM Gateway

## Estado
**Propuesto** | 2026-05-17

## Contexto
Auditoría 2026-05-17 detectó 2 archivos en orchestrator con llamadas directas a OpenAI fuera del LLM Gateway:

1. `apps/orchestrator/src/memory/knowledge-base.ts` - `fetch('https://api.openai.com/v1/embeddings')`
2. `apps/orchestrator/src/runtime/adapters/supabase-memory-adapter.ts` - `@ai-sdk/openai` con API key directa

## Decisión
**Migrar** a usar el LLM Gateway existente para:
- Trazabilidad unificada (`request_id`, `tenant_slug`)
- Cacheo de embeddings
- Control de costos por tenant
- Métricas centralizadas

## Consecuencias

### Positivas
- Métricas unificadas en `platform.usage_events`
- Cache Redis para embeddings
- Rate limiting por tenant
- Observabilidad completa

### Negativas
- Cambios de código en 2 archivos
- Testing requerido
- Posible cambio de modelo de embedding (verificar compatibilidad)

## Plan de Migración

1. [ ] Crear función helper `getEmbeddingsFromGateway(text, tenant_slug)`
2. [ ] Actualizar `knowledge-base.ts` para usar gateway
3. [ ] Actualizar `supabase-memory-adapter.ts` para usar gateway
4. [ ] Tests de integración
5. [ ] Validar que embeddings still work (dimensiones, etc.)

## Notas
- LLM Gateway ya tiene endpoint `/v1/embeddings`
- Modelo actual: `text-embedding-3-small` (1536 dims)
- Gateway caching en Redis con TTL 7 días