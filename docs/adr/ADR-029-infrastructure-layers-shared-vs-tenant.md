# ADR-029 — Capas de infraestructura: plataforma compartida vs runtime por tenant

## Estado

Aceptado (2026-04-23)

## Contexto

Opsly combina un **control plane** compartido (API/admin/portal/orchestrator/Redis/Traefik) con **stacks por tenant** (n8n/uptime, etc.). Los prompts de onboarding deben reflejar esta separación para evitar mezclar responsabilidades.

## Decisión

Definir explícitamente dos capas:

1. **Plataforma (compartida)**: servicios centrales, migraciones `platform`, routing, observabilidad base, políticas Zero-Trust.
2. **Tenant (dedicada)**: compose project `tenant_<slug>`, URLs por tenant, credenciales aisladas, límites por plan.

Los playbooks de onboarding deben:

- Apuntar a cambios **tenant-local** cuando el alcance es “subcliente dentro de un tenant padre” (p.ej. LegalVial bajo `localrank`), sin re-arquitectar el control plane salvo ADR nuevo.

## Consecuencias

- Reduce riesgo de prompts “monolíticos” que intenten redesplegar toda la plataforma por cada cliente.
- Fuerza claridad en PRs: ¿esto toca `apps/api`/`infra/docker-compose.platform.yml` o solo `tenants/<slug>/`?
