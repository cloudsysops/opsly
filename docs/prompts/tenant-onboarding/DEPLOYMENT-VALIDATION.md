# Opsly — Validación post-deploy (reusable por tenant)

## Objetivo

Confirmar que el **control plane** y el **tenant** quedaron en un estado consistente, con señales objetivas (HTTP + DB + colas).

## Checks HTTP (mínimos)

- `GET /api/health` en API pública (según dominio)
- Portal: `/login` responde sin 5xx
- Admin: dashboard base responde sin 5xx

## Checks por tenant (ajustar hosts)

- n8n tenant URL responde (302/200 según auth)
- Uptime Kuma tenant URL responde

## Checks de datos

- `platform.tenants`: fila existe y `status` coherente
- Schema tenant: tablas críticas existen (según migraciones)

## Checks operativos

- Redis: conectividad desde servicios que encolan jobs
- Orchestrator: health si está habilitado en el entorno

## Registro de evidencia

Guardar salidas (curl/httpie) en `EXECUTIONS/<tenant_slug>/` como markdown/texto.
