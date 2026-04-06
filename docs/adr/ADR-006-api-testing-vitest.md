# ADR-006 — Tests de API con Vitest (Node)

**Fecha:** 2026-04-06  
**Estado:** Aceptada

## Decisión

Los tests unitarios y de integración ligera del paquete `apps/api` se ejecutan con **Vitest** en entorno **Node**, incluyendo tests de helpers (`lib/`) y route handlers con dependencias mockeadas (Supabase, orquestador, `fetch`).

## Razones

- Misma stack TypeScript que el código de producción; sin navegador para lógica de API
- Mocks explícitos evitan llamadas reales a Docker, Supabase o red en CI
- Encaja con `npm run test` vía Turbo en el monorepo

## Consecuencias

- Nuevos módulos con IO deben exponer puntos testables o inyección vía mocks en `vi.mock`
- No sustituye E2E contra VPS; validación de despliegue sigue en health checks y pruebas manuales acotadas
