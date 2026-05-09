# LegalVial como subcliente de LocalRank — modelo operativo

**Audiencia:** operaciones, ingeniería, agentes.  
**Relacionado:** [`ADR-016`](../adr/ADR-016-legalvial-multitenant-model.md), [`config/tenants/legalvial.json`](../../config/tenants/legalvial.json).

## Objetivo

Operar **LegalVial** en producción como **subcliente lógico** de **LocalRank** sin romper el modelo Opsly de **un stack Docker Compose por `tenant_slug`** en la plataforma. LocalRank sigue siendo el tenant “padre” comercial/contractual; LegalVial tiene **identidad, datos y trazabilidad** acotados.

## Contrato `localrank → legalvial`

| Ámbito | Regla |
|--------|--------|
| **Identidad y acceso** | Usuarios del portal LegalVial pertenecen al tenant cuyo `tenant_slug` coincide con la fila en `platform.tenants` (p. ej. `legalvial`). Invitaciones y JWT deben resolver **solo** ese tenant; no mezclar sesiones con `localrank` salvo flujos explícitos documentados. |
| **Configuración** | Variables y webhooks específicos en **Doppler** / `.env` con **nombres estables** (ver [LEGALVIAL-CONFIG-ZERO-TRUST.md](./LEGALVIAL-CONFIG-ZERO-TRUST.md)). Branding y canales (Discord, email) separados por slug. |
| **Trazabilidad** | Todo job/evento que afecte a LegalVial debe llevar **`tenant_slug`** del stack (`legalvial`), **`request_id`** cuando aplique, y en **metadata** opcional `parent_tenant_slug` + `client_slug` para informes (ver `config/tenants/legalvial.json`). |
| **Red y DNS** | Misma convención que el resto de tenants: `n8n-{slug}.{TENANT_BASE_DOMAIN|PLATFORM_DOMAIN}`, `uptime-{slug}.…`. Sin rutas hardcodeadas en código; usar env de plataforma. |

## Matriz compartido vs dedicado

| Recurso | Compartido (plataforma) | Dedicado (por `legalvial`) |
|---------|-------------------------|----------------------------|
| Control plane (API, orchestrator, Redis, Traefik) | Sí | No (misma instancia; aislamiento lógico por slug/namespaces) |
| Stack Compose `tenant_legalvial` (n8n, Uptime) | No | Sí |
| Schema Postgres `tenant_legalvial` / filas `platform.tenants` | No | Sí (slug `legalvial`) |
| Credenciales n8n / webhooks terceros | No | Sí (secretos por tenant en Doppler) |
| Cola BullMQ | Compartida físicamente | Jobs **deben** discriminar por `tenant_slug` + metadata |
| LLM / usage metering | Gateway compartido | Agregación por `tenant_slug` |

## Límites de aislamiento (explícitos)

- **Kernel/host:** mismo VPS que otros tenants (riesgo aceptado salvo dedicación futura).
- **Redis:** claves y namespaces según política actual del orquestador; no reutilizar prefijos entre tenants.
- **Errores humanos:** un operador con acceso SSH puede afectar a todos los stacks; mitigar con runbooks, checklist y mínimo privilegio.

## Plataforma vs stack del tenant

- **`infra/docker-compose.platform.yml`:** control plane (API, admin, portal, Traefik, Redis, etc.). No incluye contenedores n8n/Uptime de un slug concreto.
- **Stack LegalVial:** proyecto Compose aparte (convención `docker-compose.<slug>.yml` bajo `TENANTS_PATH`, ver `scripts/opsly.sh` / `scripts/deploy/rollout-tenant.sh`).

## Archivos de referencia en repo

- `config/tenants/legalvial.json` — `parent_tenant_slug`, `client_slug`, notas de modelo híbrido.
- Runbooks: [GOLIVE](./LEGALVIAL-GOLIVE-CHECKLIST.md), [E2E / soft-launch](./LEGALVIAL-E2E-SOFTLAUNCH.md), [config / zero-trust](./LEGALVIAL-CONFIG-ZERO-TRUST.md).
- Plantilla genérica subclientes: [SUBCLIENT-ONBOARDING-TEMPLATE.md](./SUBCLIENT-ONBOARDING-TEMPLATE.md).

## Criterio de éxito (modelo)

- Matriz y contrato entendidos por el equipo.
- Toda automatización nueva que toque LegalVial incluye `tenant_slug` + trazabilidad acordada.
