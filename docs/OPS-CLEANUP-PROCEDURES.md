# Procedimientos de limpieza — Opsly

## Requisitos

- Scripts en el VPS bajo `/opt/opsly` (tras `git pull`).
- Docker: usuario en grupo `docker` o ejecutar como `root`.
- Para logs en `/var/log` y `journalctl`: `sudo` si no eres root.

## Limpieza manual

### Estándar (recomendado)

```bash
sudo /opt/opsly/scripts/vps-cleanup-robust.sh
```

### Ligera (solo Docker, rápida)

```bash
sudo /opt/opsly/scripts/vps-cleanup-robust.sh --light
```

### Agresiva (incluye `docker volume prune`)

```bash
sudo /opt/opsly/scripts/vps-cleanup-robust.sh --aggressive
```

**Antes de agresivo:** confirma que no hay volúmenes huérfanos que necesites.

### Vista previa

```bash
sudo /opt/opsly/scripts/vps-cleanup-robust.sh --dry-run
```

## Limpieza automática (cron)

El archivo de ejemplo `infra/cron/opsly-cleanup` define:

| Cuándo | Qué |
|--------|-----|
| Cada 6 h | `--light` |
| Diario 03:00 | Limpieza completa |
| Domingo 04:00 | `--aggressive` |
| Cada 5 min | `disk-alert.sh` |

Instalación en el VPS (como root):

```bash
sudo cp /opt/opsly/infra/cron/opsly-cleanup /etc/cron.d/opsly-cleanup
sudo chmod 644 /etc/cron.d/opsly-cleanup
sudo mkdir -p /opt/opsly/logs
sudo cp /opt/opsly/infra/cron/logrotate-opsly-cleanup.conf /etc/logrotate.d/opsly-cleanup
```

O usar el instalador: `sudo bash /opt/opsly/scripts/install-vps-cleanup.sh`.

## Alertas de disco

```bash
# Tras cargar .env (DISCORD_WEBHOOK_URL opcional)
sudo -E bash /opt/opsly/scripts/disk-alert.sh
```

Logs: `/opt/opsly/logs/opsly-disk-alerts.log`, `/opt/opsly/logs/opsly-disk-monitor.log`.

## Systemd (opcional)

Unidades de ejemplo: `infra/systemd/opsly-cleanup.service` y `opsly-cleanup.timer`. **No las actives si ya usas la entrada diaria en cron** (evitas doble ejecución a las 03:00).

```bash
sudo cp /opt/opsly/infra/systemd/opsly-cleanup.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
# solo si NO tienes cron diario equivalente:
sudo systemctl enable --now opsly-cleanup.timer
```

## Qué limpia el script

- Docker: imágenes no usadas (filtro 7 días), contenedores parados, build cache, redes no usadas; volúmenes solo con `--aggressive`.
- Sistema: logs viejos en `/var/log`, vacuum journal 3 días.
- Cachés: npm en contenedores indicados, pip root, apt.
- `/tmp` y `/var/tmp`: ficheros +7 días.

## Emergencia (disco casi lleno)

1. `sudo /opt/opsly/scripts/vps-cleanup-robust.sh --aggressive`
2. `sudo du -xh /var/lib/docker /opt /var/log 2>/dev/null | sort -h | tail -25`
3. Valorar ampliar volumen en el proveedor cloud.

## Contacto

Discord opcional vía `DISCORD_WEBHOOK_URL` y `scripts/notify-discord.sh`.
