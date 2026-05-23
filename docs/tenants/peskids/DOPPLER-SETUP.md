# Peskids — Doppler (`ops-intcloudsysops` / `prd`)

## Automático (recomendado)

```bash
./scripts/doppler-configure-peskids-prd.sh          # idempotente
./scripts/doppler-configure-peskids-prd.sh --dry-run # solo plan
./scripts/doppler-configure-peskids-prd.sh --force   # regenera secretos generados
```

El script **no imprime valores**. Reutiliza Supabase ya presente en `prd` y genera `DASHBOARD_ADMIN_SECRET` y `JELOU_WEBHOOK_SECRET` si faltan.

## Variables en `prd`

| Variable | Origen / valor |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL` | Plataforma (ya en Doppler) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Plataforma |
| `NEXT_PUBLIC_TENANT_ID`, `PESKIDS_TENANT_ID` | `peskids` |
| `OPSLY_API_BASE_URL` | `https://api.op-sly.com` |
| `OPSLY_EVENT_BUS_URL` | `http://orchestrator:3011/events` (red Docker VPS) |
| `NEXT_PUBLIC_OPSLY_EVENT_BUS_URL` | `http://orchestrator:3011` (rutas que añaden `/events`) |
| `N8N_WEBHOOK_BASE_URL` | `https://n8n-peskids.op-sly.com/webhook` |
| `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD` | Copiados de `TENANT_PESKIDS_N8N_*` si existen |
| `DASHBOARD_ADMIN_SECRET` | Generado (`openssl rand -hex 32`) |
| `JELOU_WEBHOOK_SECRET` | Generado; configurar el mismo valor en Jelou al activar webhooks |
| `NEXT_PUBLIC_JELOU_*` | `placeholder` hasta tener IDs reales de Jelou |

## Después de Doppler

1. **Supabase SQL Editor** (proyecto `jkwykpldnitavhmtuzmo`): ejecutar en orden:
   - `apps/peskids/migrations/001_create_peskids_schema.sql`
   - `apps/peskids/migrations/002_add_messages_table.sql`
2. **VPS**: `ssh vps-dragon@100.120.151.91` → `cd /opt/opsly && ./scripts/vps-bootstrap.sh`
3. **GitHub Actions (producción en VPS)** — flujo canónico tras merge a `main`:
   - La PR debe pasar el workflow **CI** (incluye `type-check` + `build` de `apps/peskids`).
   - Al terminar CI en verde en `main`, corre **Deploy Peskids** (`.github/workflows/deploy-peskids.yml`): build GHCR + `./scripts/peskids-deploy-vps.sh` en el VPS.
   - Manual: Actions → **Deploy Peskids** → Run workflow.
   - Emergencia sin GHCR: `./scripts/peskids-rebuild-vps.sh` (build en el VPS).

### Secretos GitHub (mismo valor que Doppler `prd`)

Para el build de la imagen (wa.me en el cliente):

| Secret GitHub | Doppler `prd` |
|---------------|---------------|
| `NEXT_PUBLIC_PESKIDS_WHATSAPP_E164` | `NEXT_PUBLIC_PESKIDS_WHATSAPP_E164` |
| `NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY` | `NEXT_PUBLIC_PESKIDS_WHATSAPP_DISPLAY` |
| `NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL` | `NEXT_PUBLIC_PESKIDS_WHATSAPP_PREFILL` |

Más SSH/Tailscale: ver `docs/runbooks/DEPLOY-GITHUB-ACTIONS.md` (`VPS_*`, `TAILSCALE_AUTHKEY`).

**Sincronizar sin pegar valores en chat** (en tu Mac, con Doppler + `gh`):

```bash
./scripts/sync-peskids-whatsapp-secrets-to-github.sh --dry-run
./scripts/sync-peskids-whatsapp-secrets-to-github.sh
```

Si faltan claves en Doppler: `./scripts/doppler-configure-peskids-prd.sh` o `./scripts/peskids-promote-whatsapp-doppler.sh`.

## Admin dashboard

Obtén el token **solo en tu terminal** (no pegar en chat):

```bash
doppler secrets get DASHBOARD_ADMIN_SECRET --project ops-intcloudsysops --config prd --plain
```

Úsalo como Bearer o cookie según `apps/peskids/middleware.ts` al acceder a `/admin`.

## Jelou (fase 2)

Cuando tengas workspace y form IDs:

```bash
doppler secrets set NEXT_PUBLIC_JELOU_WORKSPACE_ID="<id>" --project ops-intcloudsysops --config prd
doppler secrets set NEXT_PUBLIC_JELOU_FORM_LEAD_ID="<id>" --project ops-intcloudsysops --config prd
doppler secrets set NEXT_PUBLIC_JELOU_FORM_FEEDBACK_ID="<id>" --project ops-intcloudsysops --config prd
```

El `JELOU_WEBHOOK_SECRET` en Jelou debe coincidir con el de Doppler.
