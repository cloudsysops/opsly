# ADR-026: Estrategia de contexto multi-tenant (Postgres nativo)

**Estado:** Aceptada

**Fecha:** 2026-04-15

## Contexto

Los agentes de **OpenClaw** deben operar con contexto profundo por tenant (stack, estándares, decisiones) sin duplicar infraestructura. Ya existe `platform.tenants` en Supabase y soporte **pgvector** (ver ADR-018). Introducir Qdrant o Langfuse por tenant implicaría coste operativo y mantenimiento no justificado en esta fase.

## Decisión

Estrategia de **contexto nativo en base de datos**:

1. **Identity store:** Columnas en `platform.tenants` para `tech_stack` (JSONB), `coding_standards` (texto) y `vector_namespace` (texto lógico para filtrar embeddings). Los valores pueden convivir con `metadata` JSONB; el **Context Pack** prioriza columnas cuando están definidas.
2. **Vector store:** Seguir usando **pgvector** en Postgres; el aislamiento es por `tenant_id` y/o `vector_namespace` en consultas de similitud, no por instancias separadas.
3. **Inyección de contexto:** `apps/context-builder` enriquece el context pack leyendo estas columnas al armar `POST /v1/internal/opsly/context-pack`.
4. **Futuro:** Si el volumen o la latencia de pgvector se convierten en cuello de botella, evaluar Qdrant u otro store dedicado (ADR futuro). **Langfuse** solo para trazas detalladas post-MVP, si aplica.

## Consecuencias

- **Positivas:** Sin infraestructura adicional; consistencia fuerte en Postgres; menor superficie de ataque y operación unificada con migraciones Supabase existentes.
- **Negativas:** pgvector puede ser más lento que motores especializados a volúmenes muy altos; conviene vigilar tamaño de índices y backups.

## Checklist de implementación

- [x] Migración `0031_tenant_context_profile.sql` — columnas `tech_stack`, `coding_standards`, `vector_namespace` en `platform.tenants`
- [x] `apps/context-builder/src/tenant-profile.ts` — `resolveTenantIdentity()`, `buildIdentityPromptBlock()`
- [x] `apps/context-builder/src/context-pack-builder.ts` — integración con tenant profile
- [x] Tests context-builder: **8 passed**
- [x] Type-check context-builder: ✅

## Referencias

- Migración: `supabase/migrations/0031_tenant_context_profile.sql`
- Implementación: `apps/context-builder/src/tenant-profile.ts`, `context-pack-builder.ts`
