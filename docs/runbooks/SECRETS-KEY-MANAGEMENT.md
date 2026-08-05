---
status: canon
owner: operations
last_review: 2026-08-05
type: runbook
tags:
  - opsly/runbook
  - secrets
---

# Gestión de keys / secretos — inventario, rotación y avisos

Objetivo: saber **dónde vive cada key operativa**, **cómo rotarla sin pegar valores en chat**, y recibir **avisos con tiempo** (Discord) antes de que caduque o toque revisión.

## Fuente de verdad (fechas, no valores)

| Artefacto | Rol |
|-----------|-----|
| [`config/secrets-lifecycle.json`](../../config/secrets-lifecycle.json) | Inventario: nombre, stores, `expires_on` / `review_every_days`, `warn_days` |
| Este runbook | Procedimiento de rotación por key |
| [`SECRET-ROTATION-AFTER-EXPOSURE.md`](SECRET-ROTATION-AFTER-EXPOSURE.md) | Incidente: key filtrada en chat/logs |
| [`DEPLOY-GITHUB-ACTIONS.md`](DEPLOY-GITHUB-ACTIONS.md) | Tailscale + SSH en Actions |

**Nunca** guardar el valor del secreto en git, issues, Discord ni este JSON. Solo metadatos (fechas, impacto, runbook).

## Avisos anticipados

### Local / operador

```bash
# Ver qué saldría sin enviar
./scripts/ops/check-secrets-expiry.sh --dry-run

# Enviar a Discord (usa DISCORD_WEBHOOK_URL vía Doppler o env)
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/check-secrets-expiry.sh
```

Umbrales por defecto en el inventario: **30 / 14 / 7 / 1** días antes de `expires_on` (o de la fecha de revisión calculada).

### Automático (GitHub Actions)

Workflow **`Secrets expiry check`** (`.github/workflows/secrets-expiry-check.yml`):

- Cron semanal (lunes 14:00 UTC ≈ 09:00 Bogotá).
- `workflow_dispatch` manual.
- Llama al script; notifica Discord si hay hallazgos.
- Con `--strict` falla el job si hay key **ya expirada** (no si solo está en ventana de aviso).

Tras crear o rotar una key: **actualizar** `created_on` / `expires_on` / `last_reviewed_on` en `config/secrets-lifecycle.json` en el mismo PR.

## Principios de rotación

1. Generar la key nueva en el proveedor (Tailscale, GitHub, Doppler, …).
2. Escribir el secreto por **stdin** (`gh secret set …`, `doppler secrets set … < file` o pipe) — no en argv ni chat.
3. Actualizar **todos** los stores listados en el inventario (repo + environment `production` + Doppler `prd` + VPS si aplica).
4. Smoke del flujo afectado (p. ej. Deploy Peskids → Tailscale).
5. Revocar la key antigua en el proveedor.
6. Actualizar fechas en `config/secrets-lifecycle.json` + PR.

Si la key se pegó en chat: tratar como exposición → [`SECRET-ROTATION-AFTER-EXPOSURE.md`](SECRET-ROTATION-AFTER-EXPOSURE.md).

---

## Procedimientos por key

### Tailscale authkey {#tailscale-authkey}

**Stores:** GitHub Actions secret `TAILSCALE_AUTHKEY` (repo **y** environment `production`).

1. [Tailscale Admin → Keys](https://login.tailscale.com/admin/settings/keys): crear auth key (reusable + ephemeral recomendado para GHA). Anotar fecha de expiración de la UI.
2. Repo:
   ```bash
   printf '%s' 'tskey-…' | gh secret set TAILSCALE_AUTHKEY --repo cloudsysops/opsly
   printf '%s' 'tskey-…' | gh secret set TAILSCALE_AUTHKEY --repo cloudsysops/opsly --env production
   ```
3. Smoke: Actions → **Deploy Peskids** → Run workflow (`force_daytime` solo si emergencias de día).
4. Revocar la key anterior en Tailscale.
5. En `config/secrets-lifecycle.json` (entrada `tailscale-authkey-gha`): poner `created_on`, `expires_on` reales.

Síntoma de caducidad: `backend error: invalid key: API key does not exist` en el job `Connect Tailscale for SSH`.

### GHCR token {#ghcr-token}

**Stores:** Doppler `prd` → `GHCR_TOKEN` (+ `GHCR_USER`).

1. Crear PAT GitHub con `read:packages` (y `write:packages` solo si hace falta push fuera de `GITHUB_TOKEN`).
2. `doppler secrets set GHCR_TOKEN --project ops-intcloudsysops --config prd` (stdin).
3. En VPS: `cd /opt/opsly &&` login ghcr con Doppler (ver bootstrap).
4. Actualizar `last_reviewed_on` en el inventario.

### Doppler service token (VPS) {#doppler-service-token}

1. Doppler → Access → Service Tokens → crear token scoped al proyecto/`prd`.
2. En VPS: `doppler configure set token … --scope /opt/opsly` (no loguear el valor).
3. Probar: `cd /opt/opsly && doppler secrets --only-names`.
4. Revocar token anterior; actualizar inventario.

### GitHub PAT operativo {#github-pat}

Rotar en Doppler las claves que usen scripts/n8n (`GITHUB_TOKEN`, `TOKEN_GH_OSPSLY`, etc.). No confundir con `GITHUB_TOKEN` efímero de Actions.

### Discord webhook {#discord-webhook}

1. Discord → canal ops → Integrations → Webhooks → New / Reset.
2. `doppler secrets set DISCORD_WEBHOOK_URL …` (stdin).
3. `./scripts/notify-discord.sh "test" "secrets lifecycle" "info"`.
4. Sin este webhook, el chequeo de caducidad **no puede avisar**.

### Resend {#resend}

Dashboard Resend → API Keys → create → Doppler `RESEND_API_KEY`. Verificar remitente/dominio.

### Cloudflare DNS API {#cloudflare}

Ver [`SECRET-ROTATION-AFTER-EXPOSURE.md`](SECRET-ROTATION-AFTER-EXPOSURE.md) y docs Cloudflare Traefik.

---

## Checklist al onboardear una key nueva

- [ ] Entrada en `config/secrets-lifecycle.json` (id, stores, impacto, `warn_days`)
- [ ] `expires_on` **o** `review_every_days` + `last_reviewed_on`
- [ ] Runbook section o enlace
- [ ] Stores duplicados documentados (repo vs `production` vs Doppler vs VPS)
- [ ] `--dry-run` del checker pasa / lista el aviso esperado cerca de la fecha

## Relacionado

- Deploy Tailscale: [`DEPLOY-GITHUB-ACTIONS.md`](DEPLOY-GITHUB-ACTIONS.md)
- Doppler vars: [`../04-infrastructure/DOPPLER-VARS.md`](../04-infrastructure/DOPPLER-VARS.md)
- Capacidad VPS (no confundir): [`CAPACITY-ALERT-NOTIFICATIONS.md`](CAPACITY-ALERT-NOTIFICATIONS.md)

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
