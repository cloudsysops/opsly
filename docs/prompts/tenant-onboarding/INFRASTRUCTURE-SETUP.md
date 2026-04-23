# Opsly — Infraestructura compartida (capa platform)

## Alcance

Esta guía cubre lo **compartido** entre tenants (control plane), no el detalle de un tenant individual.

## Componentes típicos

- Traefik v3 (TLS + routers)
- API (`apps/api`)
- Admin (`apps/admin`)
- Portal (`apps/portal`)
- Redis/BullMQ (colas)
- Supabase (schema `platform` + schemas por tenant)

## Checklist mínimo (staging/prod)

1. Variables Doppler `prd` consistentes con `config/opsly.config.json`.
2. `docker compose` con `--env-file` correcto en VPS (Traefik + servicios).
3. SSH administrativo por Tailscale (no exponer SSH público).
4. Cloudflare Proxy ON (si aplica) + UFW mínimo.

## Notas de seguridad

- Sin secretos en repo.
- Tokens con rotación y alcance mínimo (GHCR, Supabase, etc.).
