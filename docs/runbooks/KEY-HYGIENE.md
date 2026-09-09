---
status: canon
owner: operations
last_review: 2026-09-08
type: runbook
tags:
  - opsly/runbook
---

# Higiene de claves (Tailscale + avisos)

Objetivo: que **pc-gamer, VPS y workers** no se apaguen otra vez porque expiró la *node key* de Tailscale, y avisar cuando un teléfono o un secreto de GitHub Actions se está envejeciendo.

Esto **no** rota valores en Doppler ni en GitHub. Rotar `PLATFORM_ADMIN_TOKEN`, SA de GCP o tokens expuestos sigue siendo humano. Ver [`SECRET-ROTATION-AFTER-EXPOSURE.md`](./SECRET-ROTATION-AFTER-EXPOSURE.md).

## Qué hace el job automático

Workflow: [`.github/workflows/key-hygiene.yml`](../../.github/workflows/key-hygiene.yml) — cron diario `15 13 * * *` UTC (día, no es deploy de Peskids).

1. Lista dispositivos Tailscale (`TAILSCALE_API_KEY` vía Doppler `prd`, sin imprimir).
2. En servidores del allowlist (`config/tailscale-key-hygiene.json`) con expiry aún activa: `POST /api/v2/device/{id}/key` `{ "keyExpiryDisabled": true }`.
3. En teléfonos / laptops personales que vencen en ≤14 días: **solo aviso** Discord. Nunca desactiva expiry en un iPhone.
4. Ignora runners de GitHub (`github-runner`, `opsly-gha-`).
5. Segundo paso: edad de secretos de Actions (`TAILSCALE_AUTHKEY`, `DOPPLER_TOKEN_*`). Si tienen >75 días, warning. **No** los reescribe.

## Servidores cubiertos

| Match (substring) | Rol |
| --- | --- |
| `pc-gamer` | Worker Windows / WSL |
| `vps-dragon` | Control plane |
| `opsly-worker` / `opsly-admin` / `opslyquantum` / `opsly-quantum` | Workers / admin |

Añadir un host: editar `config/tailscale-key-hygiene.json` → `servers`.

## Manual

```bash
# Solo plan (no cambia Tailscale)
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/ensure-tailscale-key-hygiene.sh --dry-run

# Aplicar disable-expiry en servidores + Discord si hay warn/apply
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/ensure-tailscale-key-hygiene.sh --apply --notify
```

Tests del planner (sin API):

```bash
python3 scripts/ops/__tests__/test_tailscale_key_hygiene.py
```

Edad de secretos de GitHub (requiere `gh` autenticado; no imprime valores):

```bash
python3 scripts/utils/check-secret-rotation.py \
  --repo cloudsysops/opsly \
  --secrets TAILSCALE_AUTHKEY DOPPLER_TOKEN_PRD DOPPLER_TOKEN_STG
```

Rotación **humana** de valores (zona roja — no automatizar):

- GCP SA → `./scripts/rotate-keys.sh --gcp-json-path …`
- Admin token → `./scripts/rotate-admin-token.sh`
- Tras fuga en chat → [`SECRET-ROTATION-AFTER-EXPOSURE.md`](./SECRET-ROTATION-AFTER-EXPOSURE.md)

## Requisitos

- Doppler `prd`: `TAILSCALE_API_KEY` (API access key de Tailscale, no auth key de dispositivo).
- GitHub Actions: `DOPPLER_TOKEN_PRD` (ya usado por `validate-doppler.yml`).
- Discord opcional: `DISCORD_WEBHOOK_URL` en Doppler o env. Sin webhook, el job sigue y solo loguea.

## Qué no hace

- No hace `doppler secrets set`.
- No rota `TAILSCALE_AUTHKEY` de GitHub Actions.
- No toca Stripe, Supabase ni n8n.
- No deploya Peskids ni el VPS.

---

## Enlaces relacionados

- [[runbooks/SECRET-ROTATION-AFTER-EXPOSURE|SECRET-ROTATION-AFTER-EXPOSURE]]
- [[runbooks/README|runbooks]]
