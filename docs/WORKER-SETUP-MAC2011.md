# Worker Opsly — Mac 2011 (Ubuntu) controlado desde Mac 2020

Guía para usar un equipo **Ubuntu** (p. ej. Mac 2011 con Linux) como **worker** remoto: Tailscale, SSH, VS Code/Cursor Remote, y orchestrator.

## Nomenclatura (no mezclar equipos)

- **Mac 2020** = máquina principal (Cursor, repo). En Tailscale: p. ej. **`mac2020`** / IP `100.89.38.3`. Detalle: **`docs/TAILSCALE-NOMENCLATURA.md`**.
- **Worker** = hardware **Mac 2011** con **Ubuntu**; en Tailscale: **`opsly-mac2011`**, IP **`100.80.41.29`**. El **usuario Linux** en el equipo puede ser **`cboteros`**, **`opslyquantum`**, etc. (hostname del sistema puede ser p. ej. `opsly-Mac2011`). Los ejemplos SSH usan el alias **`opsly-mac2011`**; en `~/.ssh/config` pon **`User`** = tu usuario real.

> **Seguridad:** no publiques `REDIS_URL` con contraseña en chats ni en repos. Usa Doppler o un `.env` local **gitignored**. El VPS en Opsly usa Redis con autenticación; el worker debe usar la misma URL que en `prd` (no una IP Tailscale “a pelo” salvo que Redis escuche solo en Tailscale y con ACL).

---

## Especificaciones (referencia Opsly)

| Equipo | Rol | Tailscale |
|--------|-----|-----------|
| Mac 2020 | Principal: Cursor, clon del repo | p. ej. `100.89.38.3` |
| Mac 2011 + Ubuntu | Worker: Docker opcional, Node, orchestrator | **`opsly-mac2011`** → `100.80.41.29` |

Ajusta rutas: el repo puede llamarse `intcloudsysops` o `opsly` según dónde clones.

---

## Fase 1 — Tailscale y SSH

### 1.1 Ver nodos (desde Mac 2020)

```bash
tailscale status
# Debe aparecer opsly-mac2011 (linux) con IP 100.80.41.29; no confundir con la Mac 2020
```

### 1.2 Probar SSH por IP Tailscale

Ejemplo (sustituye `USUARIO` por tu usuario Linux, p. ej. `opslyquantum`):

```bash
ssh -o ConnectTimeout=10 USUARIO@100.80.41.29 "hostname && uname -a"
```

### 1.3 Si SSH falla (en Mac 2011 Ubuntu)

```bash
sudo systemctl status ssh
sudo systemctl enable --now ssh
```

Firewall: permitir 22 solo donde toque (idealmente solo Tailscale/ LAN).

---

## Fase 2 — `~/.ssh/config` en Mac 2020

Ejemplo (worker real: `opsly-mac2011`):

```sshconfig
Host opsly-mac2011
    HostName 100.80.41.29
    User opslyquantum
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Prueba:

```bash
ssh opsly-mac2011 "uptime"
```

> `StrictHostKeyChecking no` solo si entiendes el riesgo; en equipos propios suele usarse temporalmente.

---

## Fase 3 — Prerrequisitos en Ubuntu (worker)

```bash
ssh opsly-mac2011 "which docker node git curl || true"
```

- **Docker** (opcional si solo corres el orchestrator con Node): [https://get.docker.com](https://get.docker.com) + `sudo usermod -aG docker $USER` (cerrar sesión después).
- **Node 20 LTS** (alineado al monorepo): NodeSource o `nvm install 20`.
- **Herramientas:** `sudo apt install -y htop tmux jq build-essential`

---

## Fase 4 — Repo Opsly

Ruta típica: `~/proyectos/intcloudsysops` o `~/opsly`.

```bash
ssh opsly-mac2011 "ls -la ~/proyectos/intcloudsysops ~/opsly 2>/dev/null || true"
```

Si no existe:

```bash
ssh opsly-mac2011 'git clone https://github.com/cloudsysops/opsly.git ~/opsly && cd ~/opsly && npm ci'
```

Variables: copia desde tu Mac 2020 solo **plantillas** (`.env.local.example`), no secretos en claro en documentación. Rellena `.env` en el worker con Doppler o archivo local privado.

```bash
# Ejemplo: NO subas .env real al repo (ajusta ruta si el home no es el mismo usuario en Mac 2020)
scp .env.local opsly-mac2011:~/opsly/.env.local
```

---

## Fase 5 — Orchestrator como worker (comandos reales del monorepo)

En este repo **no** existe `npm run start:worker` en la raíz. El orchestrator usa:

| Paso | Comando |
|------|---------|
| Build | `npm run build --workspace=@intcloudsysops/orchestrator` |
| Arranque | `npm run start --workspace=@intcloudsysops/orchestrator` |

Variables típicas (ver `apps/orchestrator` y tu `.env`):

- `REDIS_URL` — **obligatorio** para BullMQ (incluye contraseña si aplica).
- `REDIS_PASSWORD` — si tu URL no la lleva embebida.
- Resto: Supabase, LLM, etc., según lo que ejecute tu build.

Comprueba API pública (sin secretos):

```bash
ssh opsly-mac2011 "curl -sf --max-time 10 https://api.ops.smiletripcare.com/api/health"
```

**Redis desde el worker:** debe ser alcanzable por red (Tailscale al VPS, túnel, o Redis dedicado). Un `redis-cli ping` solo funciona si el puerto Redis está expuesto a esa ruta y con credenciales correctas; en producción suele ser **solo red interna/VPN**.

Se incluye script auxiliar en el repo: `scripts/run-orchestrator-worker.sh` (ver cabecera del script).

---

## Fase 6 — systemd (opcional)

Plantilla (sustituye `USUARIO` y ruta del repo):

```ini
[Unit]
Description=Opsly Orchestrator Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=USUARIO
WorkingDirectory=/home/USUARIO/opsly
EnvironmentFile=-/home/USUARIO/opsly/.env
ExecStart=/home/USUARIO/opsly/scripts/run-orchestrator-worker.sh
Restart=on-failure
RestartSec=15

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now opsly-orchestrator-worker.service
```

---

## Fase 7 — Cursor / VS Code Remote

Extensiones recomendadas (Remote SSH): ya están sugeridas en `.vscode/extensions.json`; añade en el host local **Remote - SSH**.

Workspace multi-carpeta (ejemplo en Mac 2020 `~/opsly-remote.code-workspace`):

```json
{
  "folders": [
    {
      "name": "Opsly (remoto Mac 2011)",
      "uri": "vscode-remote://ssh-remote+opsly-mac2011/home/opslyquantum/opsly"
    }
  ],
  "settings": {
    "terminal.integrated.defaultProfile.linux": "bash"
  }
}
```

En **Cursor**, “Remote SSH” funciona de forma análoga a VS Code.

---

## Fase 8 — Verificación rápida

```bash
ssh opsly-mac2011 "
  echo '=== uptime ===' && uptime
  echo '=== git ===' && cd ~/opsly 2>/dev/null && git rev-parse --short HEAD
  echo '=== type-check (puede tardar) ===' && cd ~/opsly && npm run type-check 2>&1 | tail -5
"
```

---

## Checklist de estado (rellenar tú)

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿IP Tailscale de `opsly-mac2011` (100.80.41.29)? | |
| 2 | ¿SSH OK desde Mac 2020? | |
| 3 | ¿Docker instalado (si lo necesitas)? | |
| 4 | ¿Repo clonado y `npm ci` hecho? | |
| 5 | ¿`.env` con `REDIS_URL` válido para el worker? | |
| 6 | ¿Orchestrator arranca (`build` + `start` workspace)? | |
| 7 | ¿systemd activo (opcional)? | |
| 8 | ¿Remote SSH abre el repo? | |

---

## Mantenimiento

- Logs orchestrator: según cómo arranques (systemd `journalctl -u opsly-orchestrator-worker -f` o archivo si rediriges en el script).
- Actualizar código: `git pull` en `~/opsly`, `npm ci` si cambian dependencias, `npm run build --workspace=@intcloudsysops/orchestrator`, reiniciar servicio.

---

## Referencias en repo

- Orchestrator: `apps/orchestrator/`, `docs/ORCHESTRATOR.md`
- Cola BullMQ / Redis: misma URL que en entorno de plataforma; no duplicar lógica sin revisar `REDIS_URL` en Doppler `prd`.
