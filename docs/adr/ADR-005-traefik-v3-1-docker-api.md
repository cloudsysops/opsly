# ADR-005 — Traefik v3.3+ frente a Docker Engine 29.x

**Fecha:** 2026-04-05  
**Estado:** Aceptada

## Contexto

Traefik **v3.0.x** y **v3.1** pueden negociar una **API version 1.24** con el daemon; **Docker Engine 29.x** puede rechazarla (_client version 1.24 is too old. Minimum supported API version is 1.40_). La variable de entorno `DOCKER_API_VERSION` en el contenedor Traefik **no** corrige el cliente Go embebido del provider Docker (solo afecta al CLI).

## Decisión

Usar imagen **`traefik:v3.3`** en `infra/docker-compose.platform.yml` (negociación de API compatible con Engine 29.x). El job de deploy debe incluir **`traefik`** en `docker compose up -d` para que el pin de imagen llegue al VPS. Opcional en el VPS: `vps-bootstrap.sh` paso `[j]` crea `/etc/docker/daemon.json` con `api-version-compat: true` solo si el archivo no existe; luego reinicio manual de `dockerd` si aplica. No depender de `DOCKER_API_VERSION` en compose para este problema.

## Consecuencias

- El **autodescubrimiento** de contenedores vía provider Docker funciona con daemons Docker 29.x.
- Hay que **volver a desplegar** el servicio Traefik en el VPS (`docker compose … up -d traefik`) cuando cambie la imagen en compose.
- El montaje del socket puede permanecer **`:ro`**; la corrección principal es la versión de Traefik (y opcionalmente `daemon.json` en el host).

## Relación con otras ADR

- **ADR-002:** sigue vigente la elección de Traefik v3 como proxy; esta ADR acota la **línea menor** mínima por compatibilidad con Docker API.
