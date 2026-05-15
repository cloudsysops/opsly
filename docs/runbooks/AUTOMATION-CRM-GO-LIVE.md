# Opsly Automation CRM — Go-Live Runbook

Este runbook convierte el runtime actual de Opsly en la primera oferta vendible para
PYMES locales: tenant n8n + Uptime Kuma + workflows CRM + portal cliente + monitoreo.

## Oferta v1

| Paquete | Precio base | Setup | Incluye |
| --- | ---: | ---: | --- |
| Starter | $149/mes | $500 | n8n + Uptime, CRM starter workflows, portal cliente, reporte basico |
| Pro | $299/mes | $950 | Starter + email/forms, seguimiento semanal, hasta 10 workflows gestionados |
| Agency | desde $699/mes | $1,500+ | Multi-tenant, workflows clonables, uptime por cuenta, roadmap mensual |

La promesa comercial es gestionada: Opsly opera el stack y vende resultados
operativos, no acceso crudo a servidores.

## Activos que ya existen

- Portal publico: `https://portal.op-sly.com/login`.
- Tenants de referencia documentados: `smiletripcare`, `localrank`, `legalvial`,
  `jkboterolabs`, `intcloudsysops`.
- Runtime tenant: n8n + Uptime Kuma por slug.
- Workflows CRM importados segun `AGENTS.md`.
- OpenClaw/MCP como operacion interna para acelerar implementacion y soporte.

## Bloqueantes antes de cobrar

1. `https://api.op-sly.com/api/health` debe devolver `200`.
2. `https://admin.op-sly.com` debe devolver `200` o redirect/login esperado.
3. Los contenedores API/Admin deben estar healthy en Docker.
4. El tenant demo debe tener n8n + Uptime accesibles y documentados.
5. No exponer MCP, terminales de agentes ni endpoints admin como producto publico.

## Smoke de produccion

Ejecutar desde la maquina local:

```bash
curl -ksS -o /dev/null -w '%{http_code}\n' https://portal.op-sly.com/login
curl -ksS -o /dev/null -w '%{http_code}\n' https://api.op-sly.com/api/health
curl -ksS -o /dev/null -w '%{http_code}\n' https://admin.op-sly.com
```

Ejecutar por Tailscale en el VPS:

```bash
ssh vps-dragon@100.120.151.91 \
  'cd /opt/opsly && docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml ps'
```

Validar tenant demo:

```bash
ssh vps-dragon@100.120.151.91 \
  'docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "n8n_|uptime_"'
```

## Demo comercial

1. Abrir `https://op-sly.com/automation-crm` o la URL equivalente del deploy web.
2. Mostrar paquete Starter/Pro y explicar setup + mensualidad.
3. Mostrar portal cliente.
4. Abrir n8n del tenant demo y ensenar los workflows CRM.
5. Abrir Uptime Kuma del tenant demo y ensenar monitoreo.
6. Crear una reserva/lead demo si el tenant tiene formulario disponible.
7. Confirmar que el workflow registra/alerta/reporta.

## API publica permitida para la oferta

Solo exponer endpoints de bajo riesgo y con limites claros:

- `GET /api/portal/health`
- `GET /api/public/tenants/status`
- `POST /api/local-services/public/tenants/{slug}/bookings`
- Webhooks de booking/reportes bajo `/api/local-services/webhooks/*`

Mantener protegidos:

- `/api/admin/*`
- `/api/tenants/*`
- `/api/admin/agents/*`
- `/api/portal/tenant/{slug}/agents/*`
- MCP execute / terminal execution / local agent bridges

## Criterio de listo para cobrar

- Los tres health checks publicos pasan.
- El tenant demo tiene n8n y Uptime funcionando.
- Hay al menos 4 workflows CRM visibles o documentados.
- El primer piloto tiene alcance cerrado, precio de setup, mensualidad y owner email.
- La demo no depende de acceso SSH ni de herramientas locales para verse.
