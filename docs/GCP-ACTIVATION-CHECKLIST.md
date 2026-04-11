# Checklist — activación failover GCP (`opslyquantum`)

## Prerrequisitos

- [ ] Proyecto GCP **opslyquantum** accesible con tu cuenta (`gcloud projects describe opslyquantum`)
- [ ] **Facturación** enlazada al proyecto (Compute lo requiere)
- [ ] **Compute Engine API** habilitada
- [ ] `gcloud` instalado y `gcloud auth login` hecho

## Configuración en repo

- [ ] `cp config/gcp-opslyquantum.env config/gcp.env`
- [ ] Rellenar en `config/gcp.env`: Tailscale auth key (efímera), Cloudflare (`CF_API_TOKEN`, `CF_ACCOUNT_ID` / `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_POOL_ID`), orígenes `PRIMARY_ORIGIN_ADDRESS` / `FAILOVER_ORIGIN_ADDRESS`
- [ ] Definir `SYNC_SSH_PRIMARY` y `SYNC_SSH_GCP` para `scripts/sync-to-gcp.sh`
- [ ] Opcional: `DISCORD_WEBHOOK_URL`, `HEALTH_URL`

## Verificación

- [ ] `./scripts/verify-gcp-setup.sh`
- [ ] `./infra/provision-gcp-failover.sh --dry-run`
- [ ] `./infra/provision-gcp-failover.sh`
- [ ] Comprobar VM en [consola GCP](https://console.cloud.google.com/compute/instances?project=opslyquantum)

## Tailscale (VM standby)

- [ ] `gcloud compute ssh "$GCP_INSTANCE_NAME" --zone="$GCP_ZONE" --project=opslyquantum`
- [ ] `sudo tailscale up --authkey=...` (clave desde admin Tailscale)
- [ ] Nodo visible en [Tailscale admin](https://login.tailscale.com/admin/machines)

## Sincronización y LB

- [ ] `./scripts/sync-to-gcp.sh --dry-run`
- [ ] `./scripts/sync-to-gcp.sh`
- [ ] `./scripts/configure-cloudflare-lb.sh --dry-run`
- [ ] `./scripts/configure-cloudflare-lb.sh`

## Pruebas

- [ ] `curl -sf "https://api.<tu-dominio>/api/health/lightweight"`
- [ ] Failover manual documentado en [`FAILOVER-RUNBOOK.md`](FAILOVER-RUNBOOK.md) / `scripts/trigger-failover-manual.sh`

## Notas

- **Free tier / créditos:** condiciones según cuenta y región; no asumir coste $0 permanente — ver [precios](https://cloud.google.com/compute/pricing).
- **Coste post-promoción:** orden de magnitud variable (no fijar en checklist; revisar factura GCP).
- **Región por defecto en scripts:** `us-central1-a` (ajustar `GCP_ZONE` si aplica).
