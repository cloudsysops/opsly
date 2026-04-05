# ADR-002 — Traefik v3 como reverse proxy

**Fecha:** 2026-04-04
**Estado:** Aceptada

## Decisión

Traefik v3 como único reverse proxy y gestor de SSL.

## Razones

- SSL automático via Let's Encrypt sin configuración manual
- Autodescubrimiento de contenedores Docker
- Dashboard en traefik.ops.smiletripcare.com
- Labels en docker-compose = configuración como código

## Alternativas rechazadas

- nginx: SSL manual, sin autodescubrimiento
- Caddy: menos ecosistema para multi-tenant dinámico

## Consecuencias

- Todo nuevo servicio se expone con labels Traefik
- Dashboard reservado en `traefik.${PLATFORM_DOMAIN}`
- `admin.*` reservado para dashboard Opsly
