# ADR-004 — Supabase con schema por tenant

**Fecha:** 2026-04-04
**Estado:** Aceptada

## Decisión

- Schema `platform` para datos de la plataforma
- Schema `tenant_{slug}` para datos de cada tenant
- RLS en todas las tablas

## Razones

- Aislamiento de datos sin múltiples instancias DB
- Un solo Supabase project para toda la plataforma
- Migraciones centralizadas

## Consecuencias

- Slug del tenant = nombre del schema
- Onboarding crea el schema automáticamente
- Backup por tenant = dump del schema correspondiente
