---
tenant_slug: local-services
status: active
owner: producto / field
purpose: piloto limpieza de equipos + upgrade + pruebas de automatización
---

# Tenant piloto — Local Services (`local-services`)

**Tratar como tenant Opsly completo**, no como “solo una app”: fila en `platform.tenants`, schema tenant, stack n8n + Uptime (según `onboard-tenant.sh`), portal con `tenant_slug` en JWT, mismas reglas Zero-Trust que el resto.

## Identidad del negocio (contexto producto)

- **Oferta:** limpieza de equipos + upgrade (servicio local / campo).
- **Objetivo Opsly:** aprestar servicio y **validar automatizaciones** (n8n, webhooks, colas, prompts) en un tenant aislado antes de escalar a más clientes.

## Config en repo

- `config/tenants/local-services.json` — metadata; **sin** secretos ni emails reales.

## Onboarding (humano / Doppler; no pegar tokens en chat)

```bash
# Ejemplo — ajustar email y plan; SSH/Tailscale según runbooks del repo
./scripts/onboard-tenant.sh \
  --slug local-services \
  --email "<OWNER_EMAIL>" \
  --plan startup \
  --name "Local Services (piloto)" \
  --yes
```

Tras onboard: invitación portal, DNS/Traefik según `PLATFORM_DOMAIN` en Doppler.

## Prompts y Agent Cursor

- Plataforma + Week 1 técnico: `@.cursor/prompts/local-services-tech-builder.md`
- Este archivo: **solo** contexto de negocio y recordatorio “es tenant real”.

## Cuidados

- No mezclar datos de otros tenants en pruebas (usar siempre `local-services` en URLs y metadata).
- Automatizaciones: probar primero en **dry-run** o entorno staging si el script lo soporta.
