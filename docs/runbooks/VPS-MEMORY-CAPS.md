---
status: canon
owner: operations
last_review: 2026-07-28
---

# VPS memory caps — bridge hasta upgrade Peskids

## Contexto

El droplet actual (~**4 GiB / 2 vCPU**) corre plataforma + Twenty×2 + n8n×5 + Peskids. Swap llegó a ~95% y SSH/Tailscale murieron bajo `apt`.

**Decisión de etapa:** limitar consumo por servicio **ahora** (sin subir DO aún). Hablar con Peskids: cuota mensual de capacidad → resize a **8 GiB / 4 vCPU (~$48/mes)** antes de abrir profesores/clientes a escala.

## Caps (compose + `docker update`)

| Contenedor | Límite |
|------------|--------|
| `twenty_peskids` / `twenty_icso` | 640M |
| `twenty_*_worker` | 384M |
| `twenty_*_db` | 256M |
| `twenty_*_redis` | 64M (+ Redis `maxmemory 48mb`) |
| `n8n_peskids` / `n8n_localrank` | 384M |
| otros `n8n_*` | 256M |
| `uptime_*` | 128M |
| `peskids` app | 256M |

Fuentes en repo:

- `infra/docker-compose.twenty.yml`
- `infra/docker-compose.twenty-icso.yml`
- `infra/templates/docker-compose.tenant.yml.tpl`
- Script live (sin recreate): `scripts/ops/apply-vps-memory-caps.sh`

## Apply (noche, Peskids live)

```bash
# Dry-run
./scripts/ops/apply-vps-memory-caps.sh --dry-run --ssh-host 100.120.151.91

# Execute (America/Bogota 22:00–06:00)
./scripts/ops/apply-vps-memory-caps.sh --execute --ssh-host 100.120.151.91
```

Tras merge de compose: en VPS `git pull` y `docker compose … up -d` de Twenty (noche). Caps live vía `docker update` ya protegen sin recreate completo.

**No** correr `apt upgrade` de día con swap alta; preferir reboot + upgrade kernel en la misma ventana nocturna.

## Mensaje a Peskids (comercial / capacidad)

Usar tono claro, sin alarmismo técnico excesivo:

> Estamos terminando el acoplamiento de la plataforma (CRM Twenty, operación diaria, sin abrir aún el módulo de profesores/familias a escala).
> El servidor compartido ya está al límite de memoria: para mantener estabilidad y crecer con docentes y clientes necesitamos **aumentar capacidad de la máquina**.
> Propuesta: **pago mensual de hosting/capacidad** (cubre el upgrade DigitalOcean a 8 GB RAM). Mientras se confirma, aplicamos **límites por servicio** para proteger Peskids en producción.
> Sin ese upgrade no recomendamos lanzar profesores/clientes en volumen.

Orden sugerido:

1. Alinear cuota mensual con Peskids (humano).
2. Aplicar caps en VPS (noche).
3. Al primer pago / OK comercial → resize DO 8G + reboot.
4. Recién entonces escalar features profesores/clientes.

## Qué no hacer

- No subir a 16G “por si acaso” sin uso medido.
- No quitar caps en Twenty sin el upgrade de droplet.
- No merge/deploy de día que recree todos los n8n bajo carga.

## Notificaciones (Peskids / Opsly / email / Cursor)

Avisos claros multi-canal: [`CAPACITY-ALERT-NOTIFICATIONS.md`](./CAPACITY-ALERT-NOTIFICATIONS.md).

```bash
./scripts/ops/notify-capacity-alert.sh --dry-run --to "tu@email.com"
# real:
# doppler run --project ops-intcloudsysops --config prd -- \
#   ./scripts/ops/notify-capacity-alert.sh --send --to "tu@email.com"
```

Fuente de copy: `lib/capacity-alert/alert.json`. Estado para agentes: `docs/ops/ACTIVE-CAPACITY-ALERT.md`.
