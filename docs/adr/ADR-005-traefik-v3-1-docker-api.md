# ADR-005 — Traefik v3.1 en lugar de v3.0

**Fecha:** 2026-04-05  
**Estado:** Aceptada

## Contexto

Traefik **v3.0.4** presenta un bug conocido: al hablar con el Docker daemon por `/var/run/docker.sock` negocia una **API version 1.24** que el engine actual rechaza (*client version 1.24 is too old. Minimum supported API version is 1.40*). La variable de entorno `DOCKER_API_VERSION` **no** corrige el comportamiento en esa línea de versiones.

## Decisión

Usar imagen **`traefik:v3.1`** como mínimo en `infra/docker-compose.platform.yml` (y alinear documentación/entornos locales cuando aplique). No depender de `DOCKER_API_VERSION` para este problema.

## Consecuencias

- El **autodescubrimiento** de contenedores vía provider Docker vuelve a funcionar con daemons Docker recientes.
- Hay que **volver a desplegar** el servicio Traefik en el VPS (`docker compose … up -d traefik`) para cargar la nueva imagen.
- El montaje del socket puede permanecer **`:ro`**; la corrección es de versión de Traefik, no de permisos de escritura en el socket por este bug.

## Relación con otras ADR

- **ADR-002:** sigue vigente la elección de Traefik v3 como proxy; esta ADR acota la **línea menor** mínima por compatibilidad con Docker API.
