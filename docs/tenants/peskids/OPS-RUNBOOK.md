---
status: draft
owner: operations
last_review: 2026-05-18
tenant_slug: peskids
---

# Peskids — runbook operativo (solo lectura)

**SSH:** solo Tailscale `100.120.151.91` (usuario `vps-dragon`). Sin comandos destructivos en este documento.

## Checklist rápido de estado

- [ ] `platform.tenants` tiene fila `peskids`, `status` activo, owner correcto
- [ ] `curl` health n8n responde (ver abajo)
- [ ] `curl` uptime responde
- [ ] Contenedores `n8n_peskids` y uptime en `docker ps` (VPS)
- [x] API MVP Peskids (smoke 2026-05-21): `API_BASE=https://api.op-sly.com ./scripts/peskids-mvp-smoke.sh` — detalle [DEPLOYMENT-2026-05-21.md](./DEPLOYMENT-2026-05-21.md)
- [ ] Owner confirma recepción de alerta de prueba (manual)
- [ ] Docs incubación [INCUBATION-CHECKLIST.md](./INCUBATION-CHECKLIST.md) al día

## Health URLs (desde tu red)

Sustituir dominio si el tenant usa otro `PLATFORM_DOMAIN` en Doppler.

```bash
# n8n health (ajustar path si la instancia usa otro endpoint)
curl -sfk "https://n8n-peskids.op-sly.com/healthz" | head -c 200
echo

# Uptime Kuma (página principal)
curl -sfk -o /dev/null -w "%{http_code}\n" "https://uptime-peskids.op-sly.com/"
```

Códigos esperados: HTTP 200 o respuesta JSON `ok` según versión n8n.

## VPS — inspección (solo lectura)

```bash
ssh -o BatchMode=yes -o ConnectTimeout=15 vps-dragon@100.120.151.91 \
  "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'peskids|NAMES'"
```

```bash
ssh vps-dragon@100.120.151.91 \
  "docker compose --project-name tenant_peskids ps 2>/dev/null || echo 'compose project not found or path differs'"
```

> **No ejecutar** `docker compose down`, `prune`, `--force-recreate`, ni editar workflows en prod desde este runbook.

## API Opsly (tenant listado — admin)

Requiere token admin de sesión o entorno local con Doppler (sin volcar secretos):

```bash
# Ejemplo genérico — ajustar URL y auth según entorno
curl -sfk "https://api.op-sly.com/api/tenants" \
  -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>" \
  | jq '.tenants[] | select(.slug=="peskids")'
```

Validar contra Supabase si la API y DB divergen.

## CRM workflows (referencia)

Listar en VPS solo si hay acceso a contenedor n8n UI — **no** automatizar desde aquí.

Documentación plantillas repo:

- `.n8n/1-workflows/crm/`
- `scripts/install-crm-workflows.sh --tenant peskids --dry-run`

## Escalación

| Síntoma | Acción |
|---------|--------|
| n8n 502/504 | Ver Traefik + logs contenedor (operador humano) |
| Tenant no en API | [TENANT-ONBOARDING-TRIAGE](../runbooks/TENANT-ONBOARDING-TRIAGE.md) |
| Lead no notifica | Revisar webhook URL en Doppler (nombres, no valores en chat) |

## Enlaces

- Baseline prod: [`../production/TENANT-PRODUCTION-BASELINE.md`](../production/TENANT-PRODUCTION-BASELINE.md)
- Arquitectura: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Workflows diseño: [WORKFLOWS.md](./WORKFLOWS.md)
