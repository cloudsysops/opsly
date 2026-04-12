# Worker Opsly — Mac 2011 (Ubuntu) controlado desde la Mac principal (opsly-admin)

> **Antes de cualquier cambio en `~/opsly`:** `git pull --ff-only` en la rama activa o `./scripts/git-sync-repo.sh` (igual que en **opsly-admin** y en el **VPS**). Ver **`docs/SESSION-GIT-SYNC.md`**. El servicio systemd ejecuta sincronización al **inicio** vía `run-worker-with-nvm.sh` (salvo `OPSLY_SKIP_GIT_PULL=1`).

Guía para usar un equipo **Ubuntu** (p. ej. Mac 2011 con Linux) como **worker** remoto: Tailscale, SSH, VS Code/Cursor Remote, y orchestrator.

## Nomenclatura (no mezclar equipos)

- **Mac principal** = Cursor, repo. En Tailscale: **`opsly-admin`** (MagicDNS) / IP `100.89.38.3`; SSH: **`ssh opsly-admin`**. Detalle: **`docs/TAILSCALE-NOMENCLATURA.md`**.
- **Worker** = hardware **Mac 2011** con **Ubuntu**; en Tailscale el **nombre de máquina** (admin) debe ser **`opsly-worker`**: es el que **MagicDNS** convierte en **`opsly-worker.<tailnet>.ts.net`**. IP **`100.80.41.29`**. Cuenta Linux recomendada: **`opslyquantum`** (no uses usuario `dragon` ni nombres obsoletos tipo `dragon-1`). El `hostname` del SO puede diferir; lo que importa para DNS/SSH es el nombre en **Tailscale admin** o `sudo tailscale up --hostname=opsly-worker`. Los ejemplos SSH usan el alias **`opsly-worker`**; en `~/.ssh/config` pon **`User opslyquantum`** (o la cuenta real).

> **Seguridad:** no publiques `REDIS_URL` con contraseña en chats ni en repos. Usa Doppler o un `.env` local **gitignored**. El VPS en Opsly usa Redis con autenticación; el worker debe usar la misma URL que en `prd` (no una IP Tailscale “a pelo” salvo que Redis escuche solo en Tailscale y con ACL).

---

## Especificaciones (referencia Opsly)

| Equipo | Rol | Tailscale |
|--------|-----|-----------|
| Mac principal | Cursor, clon del repo | **`opsly-admin`** → p. ej. `100.89.38.3` |
| Mac 2011 + Ubuntu | Worker: Docker opcional, Node, orchestrator | **`opsly-worker`** → `100.80.41.29` |

Ajusta rutas: el repo puede llamarse `intcloudsysops` o `opsly` según dónde clones.

---

## Fase 1 — Tailscale y SSH

### 1.1 Ver nodos (desde la Mac principal)

```bash
tailscale status
# Debe aparecer opsly-worker (linux) con IP 100.80.41.29; no confundir con la Mac principal (opsly-admin / 100.89.38.3)
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

## Fase 2 — `~/.ssh/config` en la Mac principal

Ejemplo (worker real: `opsly-worker`):

```sshconfig
Host opsly-worker
    HostName 100.80.41.29
    User opslyquantum
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Prueba:

```bash
ssh opsly-worker "uptime"
```

> `StrictHostKeyChecking no` solo si entiendes el riesgo; en equipos propios suele usarse temporalmente.

---

## Fase 3 — Prerrequisitos en Ubuntu (worker)

```bash
ssh opsly-worker "which docker node git curl || true"
```

- **Docker** (opcional si solo corres el orchestrator con Node): [https://get.docker.com](https://get.docker.com) + `sudo usermod -aG docker $USER` (cerrar sesión después).
- **Node 20 LTS** (alineado al monorepo): NodeSource o `nvm install 20`.
- **Herramientas:** `sudo apt install -y htop tmux jq build-essential`

---

## Fase 4 — Repo Opsly

Ruta típica: `~/proyectos/intcloudsysops` o `~/opsly`.

```bash
ssh opsly-worker "ls -la ~/proyectos/intcloudsysops ~/opsly 2>/dev/null || true"
```

Si no existe:

```bash
ssh opsly-worker 'git clone https://github.com/cloudsysops/opsly.git ~/opsly && cd ~/opsly && npm ci'
```

Variables: copia desde tu Mac principal (`opsly-admin`) solo **plantillas** (`.env.local.example`), no secretos en claro en documentación. Rellena `.env` en el worker con Doppler o archivo local privado.

```bash
# Ejemplo: NO subas .env real al repo (ajusta ruta si el home no es el mismo usuario en la Mac principal)
scp .env.local opsly-worker:~/opsly/.env.local
```

---

## Fase 5 — Orchestrator como worker (comandos reales del monorepo)

En este repo **no** existe `npm run start:worker` en la raíz. El orchestrator usa:

| Paso | Comando |
|------|---------|
| Build | `npm run build --workspace=@intcloudsysops/orchestrator` |
| Arranque | `npm run start --workspace=@intcloudsysops/orchestrator` |

**Script recomendado (carga `.env.local` si existe):**

```bash
cd ~/opsly
./scripts/start-worker.sh
```

**Alias Mac 2011 / worker remoto** (carga opcional `.env.worker` y `config/gcp.env`; mismo arranque que arriba):

```bash
./scripts/start-workers-mac2011.sh
./scripts/start-workers-mac2011.sh --dry-run
```

Implementación: `scripts/start-worker.sh` → `scripts/run-orchestrator-worker.sh`. Plantilla de variables (sin secretos): `docs/worker-env.local.example`. Compose opcional: `infra/docker-compose.workers.yml`.

Variables típicas (ver `apps/orchestrator` y tu `.env`):

- `REDIS_URL` — **obligatorio** para BullMQ (incluye contraseña si aplica). Debe coincidir con **Doppler** `prd` (`ops-intcloudsysops`), no inventar `redis://100.120.151.91:6379` sin auth si Redis no está expuesto así.
- `REDIS_PASSWORD` — si tu URL no la lleva embebida.
- Resto: Supabase, LLM, etc., según lo que ejecute tu build.

Comprueba API pública (sin secretos):

```bash
ssh opsly-worker "curl -sf --max-time 10 https://api.ops.smiletripcare.com/api/health"
```

**Redis desde el worker:** debe ser alcanzable por red (Tailscale al VPS, túnel, o Redis dedicado). Un `redis-cli ping` solo funciona si el puerto Redis está expuesto a esa ruta y con credenciales correctas; en producción suele ser **solo red interna/VPN**.

**Seguridad:** no extraigas `SUPABASE_SERVICE_ROLE_KEY` del VPS con scripts que impriman valores; usa **Doppler** o copia local privada a `~/.opsly/` o `.env.local` en el worker.

---

## Fase 6 — Seguir trabajando con la pantalla apagada (tmux, sin sudo)

Tras configurar **`REDIS_URL`** en `~/opsly/.env.local`:

```bash
cd ~/opsly
./scripts/keep-worker-in-tmux.sh
```

- Ver proceso: `tmux attach -t opsly-orchestrator` (salir sin matar: `Ctrl+b` luego `d`)
- Listar: `tmux ls`
- Parar: `tmux kill-session -t opsly-orchestrator`

Los scripts **`scripts/run-worker-with-nvm.sh`** y **`scripts/keep-worker-in-tmux.sh`** cargan **nvm** (Node no viene en PATH en servicios crudos).

## Fase 6b — systemd (opcional, requiere sudo)

Guía completa: **`docs/WORKER-SERVICE-MAC2011.md`**. Unidad: **`infra/systemd/opsly-worker.service`** + **`scripts/install-opsly-worker-systemd.sh`**.

```bash
cd ~/opsly && git pull && chmod +x scripts/install-opsly-worker-systemd.sh
sudo ./scripts/install-opsly-worker-systemd.sh
```

---

## Fase 7 — Cursor / VS Code Remote

Extensiones recomendadas (Remote SSH): ya están sugeridas en `.vscode/extensions.json`; añade en el host local **Remote - SSH**.

Workspace multi-carpeta (ejemplo en la Mac principal `~/opsly-remote.code-workspace`):

```json
{
  "folders": [
    {
      "name": "Opsly (remoto Mac 2011)",
      "uri": "vscode-remote://ssh-remote+opsly-worker/home/opslyquantum/opsly"
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
ssh opsly-worker "
  echo '=== uptime ===' && uptime
  echo '=== git ===' && cd ~/opsly 2>/dev/null && git rev-parse --short HEAD
  echo '=== type-check (puede tardar) ===' && cd ~/opsly && npm run type-check 2>&1 | tail -5
"
```

---

## Checklist de estado (rellenar tú)

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿IP Tailscale de `opsly-worker` (100.80.41.29)? | |
| 2 | ¿SSH OK desde la Mac principal (`opsly-admin`)? | |
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
