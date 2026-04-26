# Runbook — Incidentes (Opsly)

**Objetivo:** restaurar servicio y acotar impacto con pasos repetibles.

## Clasificación rápida

| Síntoma             | Comprobar primero                                                     |
| ------------------- | --------------------------------------------------------------------- |
| API 5xx / timeout   | Salud del contenedor `app`, Redis, logs `docker compose logs`         |
| 404 en subdominios  | Traefik, reglas, certificados, DNS `*.ops.<dominio>`                  |
| Onboarding atascado | Colas BullMQ, logs API, estado tenant en DB `provisioning` / `failed` |
| Pull GHCR fallido   | `docker login ghcr.io` en VPS; secretos `GHCR_*` en Doppler           |

## Orden de diagnóstico

1. **Edge:** `curl` a `/api/health` (TLS/DNS)
2. **VPS:** servicios Traefik, Redis, app, admin en `infra/docker-compose.platform.yml`
3. **Datos:** Supabase (plataforma + schemas tenant)
4. **CI:** último deploy y publicación de imágenes en GHCR

## Comunicación

- Anotar tiempo de detección, impacto (tenants afectados), hipótesis y acciones en el hilo interno acordado
- Tras recuperación: entrada breve en postmortem (causa raíz, follow-up)

## Rollback de aplicación

- Volver a una imagen etiquetada anterior en GHCR y `docker compose pull` + `up -d` en VPS (según política de versionado)
- No ejecutar `terraform destroy` en producción sin ventana y aprobación explícita

## Contactos y secretos

- Secretos solo vía Doppler; no pegar tokens en tickets públicos
