# ADR-003 — Doppler como gestor de secrets

**Fecha:** 2026-04-04
**Estado:** Aceptada

## Decisión

Todos los secrets van a Doppler. Nunca en repo ni en `.env` commiteado.

## Razones

- Un solo lugar para rotar secrets
- Audit trail de accesos
- Integración nativa con CI/CD y VPS

## Configuración

- Proyecto: ops-intcloudsysops
- Config: prd
- Acceso VPS: service token en `/etc/doppler/token`

## Consecuencias

- `.env.local.example` solo tiene placeholders
- Scripts usan: `doppler run -- comando`
- `config/doppler-ready.json` se borra tras importar
