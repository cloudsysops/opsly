# ADR-001 — Docker Compose por tenant

**Fecha:** 2026-04-04
**Estado:** Aceptada

## Decisión

Cada tenant tiene su propio docker-compose aislado.

## Razones

- Simplicidad operativa sobre escala teórica
- Fallo de un tenant no afecta a otros
- Deploy, suspend y backup independientes por tenant
- Sin overhead de orquestación compleja

## Alternativas rechazadas

- Kubernetes: complejidad innecesaria en fase actual
- Docker Swarm: misma complejidad, menos soporte

## Consecuencias

- Escalar = más VPS, no más complejidad
- Cada tenant: red Docker aislada, volúmenes propios
- Template: `infra/templates/docker-compose.tenant.yml.tpl`
