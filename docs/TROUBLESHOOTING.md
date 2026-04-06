# Troubleshooting — Opsly

Guía rápida sin depender de acceso humano a Doppler/VPS (salvo donde se indica).

## API no responde o 5xx

1. **Health:** `curl -sf https://api.<PLATFORM_DOMAIN>/api/health | jq .`
   - `checks.supabase: degraded` o `error`: URL o red hacia Supabase; desde fuera del contenedor el endpoint `/auth/v1/health` puede comportarse distinto.
   - `checks.redis: skipped`: falta `REDIS_URL` (esperado en algunos entornos).
2. **Logs del contenedor `app`:** `docker compose -f infra/docker-compose.platform.yml logs -f app --tail=200`
3. **Traefik:** si solo fallan hostnames, revisar routers TLS y DNS `*.ops.<dominio>`.

## 401 / 403 en rutas admin

- Header `Authorization: Bearer <PLATFORM_ADMIN_TOKEN>` en mutaciones.
- En demo, **GET** puede estar abiertos con `ADMIN_PUBLIC_DEMO_READ=true`; **POST/PATCH/DELETE** siguen exigiendo token.

## 404 en `/api/...` tras deploy

- Confirmar que el job de Deploy subió imagen GHCR y el VPS hizo `pull` + `up`.
- Traefik debe enrutar `Host(api.<PLATFORM_DOMAIN>)` al servicio API.

## 404 en `portal.<PLATFORM_DOMAIN>` (texto plano desde Traefik)

- Suele indicar que **`opsly_portal` no está en estado `Up`** (contenedor en `Created` o caído) o hay **réplicas huérfanas** del servicio `app` con `deploy.replicas: 2`.
- En el VPS: `docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml ps -a` y revisar `opsly_portal`, `opsly_admin`, `infra-app-*`.
- Recuperación: `cd /opt/opsly/infra && docker compose ... stop app admin portal`, eliminar contenedores `Created` del proyecto y ejecutar `docker compose ... up -d app admin portal`.
- El workflow **Deploy** usa `up -d --force-recreate` para traefik, app, admin y portal y reduce este estado en el siguiente push.

## Onboarding de tenant atascado

- Estado en DB: `platform.tenants.status` (`provisioning`, `failed`, etc.).
- Colas Redis/BullMQ y logs del orquestador en API.
- Pull GHCR: si ves `denied`, falta `docker login ghcr.io` en el VPS.

## Stripe webhooks

- `STRIPE_WEBHOOK_SECRET` debe coincidir con el endpoint en Stripe Dashboard.
- La ruta responde `200 { received: true }` incluso ante fallos de verificación (diseño defensivo); revisar logs si los eventos no aplican cambios.

## Terraform

- `terraform plan` propone crear droplet si no hay `terraform import` del existente — ver `infra/terraform/README.md`.
- Token DO inválido → error de API en plan/apply.

## Referencias

- [Runbook incidente](runbooks/incident.md)
- [AGENTS.md](../AGENTS.md) — estado operativo
- [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)
