---
status: active
owner: operations
last_review: 2026-05-23
---

# Validación de URLs y dashboards (agentes / Claude en Chrome)

Guía para que un agente con navegador revise **URLs públicas** y **dashboards autenticados** sin inventar credenciales ni pegar secretos en el chat.

## Usuario recomendado (plataforma + Peskids)

| Campo | Valor |
| ----- | ----- |
| **Email** | `cboteros1@gmail.com` |
| **Contraseña** | **Solo la conoce el operador.** No está en el repo ni en Doppler con nombre estándar. |

### Metadata actual en Supabase (verificado)

- `tenant_slug`: `peskids`
- `role`: `owner`
- `is_superuser`: `true`
- Email confirmado

**Con ese usuario puedes:**

| Superficie | URL login | ¿Acceso esperado? |
| ---------- | --------- | ----------------- |
| **Opsly Admin** | https://admin.op-sly.com/login | Sí (super admin / sesión Supabase) |
| **Peskids panel** | https://peskids.op-sly.com/admin/login | Sí (staff Peskids) |
| **Opsly Portal** | https://portal.op-sly.com/login | **No** con esta cuenta: el portal excluye superuser y staff Peskids |

Para **portal por tenant** (smiletripcare, intcloudsysops, etc.) hace falta un usuario **invitado** con `tenant_slug` del cliente y sin rol staff Peskids — p. ej. flujo `POST /api/invitations` + activación, o otro email en Supabase.

## Cómo obtener / resetear la contraseña (humano)

1. En el login correspondiente → **«Olvidé mi contraseña»** (Peskids, portal y admin lo tienen en la rama de recuperación desplegada).
2. O en [Supabase Dashboard](https://supabase.com/dashboard) → proyecto `jkwykpldnitavhmtuzmo` → Authentication → Users → `cboteros1@gmail.com` → **Send password recovery** (no compartir el enlace en Slack público).

**No** pegues la contraseña en Cursor, Discord ni en issues de GitHub.

### Opcional: secreto solo en tu máquina (Doppler)

```bash
# Una sola vez, desde tu Mac (no commitear)
doppler secrets set AGENT_VALIDATOR_EMAIL=cboteros1@gmail.com \
  --project ops-intcloudsysops --config prd

doppler secrets set AGENT_VALIDATOR_PASSWORD='tu-contraseña-segura' \
  --project ops-intcloudsysops --config prd
```

Para leerla **solo en terminal local** (para pegarla tú en Chrome):

```bash
doppler secrets get AGENT_VALIDATOR_PASSWORD --project ops-intcloudsysops --config prd --plain
```

## Credenciales n8n por tenant (no son Supabase)

En Doppler `ops-intcloudsysops` / `prd`:

| Tenant | Usuario (nombre clave) | Contraseña (nombre clave) |
| ------ | ---------------------- | ------------------------- |
| peskids | `TENANT_PESKIDS_N8N_USER` | `TENANT_PESKIDS_N8N_PASS` |
| otros | convención `TENANT_<SLUG>_N8N_*` si existe | idem |

```bash
doppler secrets get TENANT_PESKIDS_N8N_USER TENANT_PESKIDS_N8N_PASS \
  --project ops-intcloudsysops --config prd --plain
```

URLs: `https://n8n-<slug>.op-sly.com` (lista en [`config/agent-url-audit.json`](../../config/agent-url-audit.json)).

## Prompt sugerido para Claude en Chrome

Copia esto y **sustituye `[CONTRASEÑA]` localmente** (no en un canal público):

```text
Eres auditor de URLs Opsly. Usa el navegador con sesión limpia o perfil de prueba.

Credenciales Supabase (solo donde pida email/contraseña):
- Email: cboteros1@gmail.com
- Contraseña: [CONTRASEÑA]

Orden:
1. Público sin login: api /api/health, peskids.op-sly.com/, peskids /familias
2. https://admin.op-sly.com/login → dashboard, /tenants, /costs — anota 404/500/CORS
3. https://peskids.op-sly.com/admin/login → /admin — leads, mensajes, formularios
4. Portal: NO uses cboteros1; indica "requiere usuario tenant invitado" salvo que te den otro email
5. Por cada tenant en config/agent-url-audit.json: HEAD o GET a n8n y uptime (login n8n aparte)

Entregable: tabla URL | HTTP | login OK | notas
```

## Scripts en el repo

| Script | Uso |
| ------ | --- |
| [`scripts/agent-url-audit.sh`](../../scripts/agent-url-audit.sh) | Smoke HTTP de URLs públicas (sin contraseña) |
| [`scripts/agent-validator-check-user.sh`](../../scripts/agent-validator-check-user.sh) | Comprueba metadata Supabase del email (sin password) |
| [`scripts/validate-production-urls.sh`](../../scripts/validate-production-urls.sh) | Doppler/VPS sin localhost en URLs cliente |

## Admin en modo demo (sin contraseña)

Si en el VPS está `ADMIN_PUBLIC_DEMO_READ=true` y build con `NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=true`, **admin** permite ver dashboards en lectura **sin** login. No sustituye probar portal ni Peskids autenticado.

## Tenants desacoplados (VPS del cliente)

Opsly **no** debe asumir que todo cliente usa `portal.op-sly.com`.

| Modo | Dónde vive el producto | Cómo revisar desde Admin |
| ---- | ----------------------- | ------------------------ |
| **incubado** | Piloto en infra Opsly + app propia opcional (ej. `peskids.op-sly.com`) | Enlace **App / panel tenant** + opcional Portal Opsly (solo con usuario invitado al tenant) |
| **dedicado** | VPS y dominio del cliente | `metadata.client_base_url`, `staff_app_url`, `portal_app_url` en `platform.tenants.metadata` |

Ejemplo de metadata tras extracción:

```json
{
  "deployment_mode": "dedicated",
  "client_base_url": "https://app.cliente.com",
  "staff_app_url": "https://app.cliente.com/admin",
  "portal_app_url": "https://portal.cliente.com"
}
```

El admin Opsly resuelve enlaces con `apps/admin/lib/tenant-surfaces.ts` (ficha tenant → **Revisar producto cliente**).

## Referencias

- Plantilla incubación → extracción: [`docs/blueprints/opsly-operational-blueprint/CLIENT-INCUBATION-TEMPLATE.md`](../blueprints/opsly-operational-blueprint/CLIENT-INCUBATION-TEMPLATE.md)
- Inventario tenants: [`docs/tenants/production/TENANT-PRODUCTION-BASELINE.md`](../tenants/production/TENANT-PRODUCTION-BASELINE.md)
- Demo Peskids: [`docs/tenants/peskids/CLIENT-DEMO-CHECKLIST.md`](../tenants/peskids/CLIENT-DEMO-CHECKLIST.md)
- Recuperación contraseña: rama `feat/auth-recovery-forgot-password` / PR #406
