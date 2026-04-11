# Worker como servicio persistente (systemd) — Mac 2011 Ubuntu

## Requisitos

- Repo en `~/opsly`, `REDIS_URL` en `~/opsly/.env.local` (misma URL que Doppler `prd` / VPS).
- Con arquitectura distribuida, `run-orchestrator-worker.sh` fija **`OPSLY_ORCHESTRATOR_ROLE=worker`** por defecto; el VPS puede usar `control`. Ver **`docs/ARCHITECTURE-DISTRIBUTED.md`**.
- Scripts ejecutables: `scripts/run-worker-with-nvm.sh`, `scripts/start-worker.sh`.
- **sudo** para instalar la unidad (una vez).

## Instalar (en el worker)

```bash
cd ~/opsly
git pull origin main
mkdir -p ~/opsly/logs
chmod +x scripts/install-opsly-worker-systemd.sh scripts/manage-worker.sh
sudo ./scripts/install-opsly-worker-systemd.sh
```

La unidad está en **`infra/systemd/opsly-worker.service`**: usa **`ExecStart=.../run-worker-with-nvm.sh`** (carga nvm + `.env.local`), no líneas frágiles con `source` en `ExecStart` sueltas.

## Gestión

```bash
./scripts/manage-worker.sh status
./scripts/manage-worker.sh restart
./scripts/manage-worker.sh logs          # worker.log
./scripts/manage-worker.sh logs-error    # worker-error.log
./scripts/manage-worker.sh journal       # journalctl -u
```

Equivalente systemd:

```bash
sudo systemctl status opsly-worker
sudo systemctl restart opsly-worker
sudo journalctl -u opsly-worker -f
```

## Tras `git pull` / `npm ci`

```bash
cd ~/opsly && git pull && npm ci
sudo systemctl restart opsly-worker
```

## Rotación de logs (opcional)

```bash
sudo tee /etc/logrotate.d/opsly-worker >/dev/null <<'EOF'
/home/opslyquantum/opsly/logs/*.log {
    weekly
    missingok
    rotate 8
    compress
    delaycompress
    notifempty
    create 0640 opslyquantum opslyquantum
}
EOF
```

(No hace falta `reload` del servicio tras rotar; systemd sigue escribiendo en el mismo inode según configuración.)

## Troubleshooting

- **Failed to start:** `journalctl -u opsly-worker -n 80 --no-pager`
- **REDIS:** `grep '^REDIS_URL=' ~/opsly/.env.local | wc -c` (debe ser > 10)
- **Red:** `ping -c2 100.120.151.91`

## Alternativa sin sudo

`./scripts/keep-worker-in-tmux.sh` — ver `docs/WORKER-SETUP-MAC2011.md`.
