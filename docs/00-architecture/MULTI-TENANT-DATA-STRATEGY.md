---
status: accepted_for_next_prs
owner: platform
last_review: 2026-08-02
---

# Multi-Tenant Data Strategy

## Decisión de esta fase

Los módulos funcionales nuevos usarán tablas compartidas con `tenant_id`, RLS
y autorización backend obligatoria. No se implementarán schemas separados por
tenant en este programa inicial.

## Requisitos obligatorios

1. `tenant_id` no nullable en toda entidad funcional.
2. Foreign key a la entidad tenant cuando el modelo lo permita.
3. RLS explícito y tests positivos/negativos de aislamiento. Hoy esto existe
   solo de forma ad-hoc por feature (ej. `apps/peskids/app/api/admin/leads/[id]/__tests__/route.test.ts`),
   no como un harness sistemático — cada PR de este programa que cree una
   tabla nueva debe aportar sus propios tests de aislamiento, no asumir que
   hay uno compartido que los cubre.
4. Constraints de unicidad con `tenant_id` incluido.
5. Índices que empiecen por `tenant_id` para consultas scoped.
6. Repositorios que reciban contexto tenant, no solo un slug de UI.
7. Cache keys con tenant incluido.
8. Jobs, envelopes y eventos con `tenant_slug` y correlation/request IDs.
9. Paths de archivos prefijados por tenant y clasificación documental.
10. Logs sanitizados y sin PII innecesaria.

## Relación con la arquitectura existente

`platform.tenants`, tenant context, Postgres/pgvector y RLS ya ofrecen parte de
la base. La existencia histórica de provisioning por schema no se elimina en
PR0; se mantiene para compatibilidad mientras la nueva capa funcional define
sus tablas compartidas. La migración de consumidores requerirá PR y rollback
propios.

## Excepción futura

Un cliente enterprise podría requerir aislamiento contractual o regulatorio
adicional. Eso exigirá un ADR nuevo, medición operativa, plan de backup/restore
y un adapter explícito; no se habilita por defecto.
