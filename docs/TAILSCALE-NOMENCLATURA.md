# Tailscale — nombres de máquinas (Opsly)

Tres conceptos distintos: **hostname del SO** (`/etc/hostname`), **nombre en Tailscale** (admin / MagicDNS) y **alias SSH** (`Host` en `~/.ssh/config`). En Opsly solo usamos **dos nombres MagicDNS** para equipos de trabajo y **un** `Host` SSH por cada uno (sin alias duplicados).

## Nombres fijos (tailnet)

| Rol | Nombre en Tailscale = base MagicDNS | IP 100.x (referencia) | SSH (usuario remoto) |
|-----|--------------------------------------|------------------------|-------------------------|
| Mac principal (Cursor, repo) | **`opsly-admin`** | `100.89.38.3` | `ssh opsly-admin` → usuario local típico **`cboteros`** (ver plantilla abajo) |
| Worker Ubuntu (orchestrator, etc.) | **`opsly-worker`** | `100.80.41.29` | `ssh opsly-worker` → **`opslyquantum`** |
| VPS Opsly | `vps-dragon` | `100.120.151.91` | `ssh vps-dragon` → **`vps-dragon`** |

**Qué usuario usar en cada `ssh` (agentes):** [`SSH-USERS-FOR-AGENTS.md`](SSH-USERS-FOR-AGENTS.md) — no hace falta cambiar el usuario de la Mac; sí usar el usuario remoto correcto en el comando.

FQDN típico: **`<nombre>.<suffix>.ts.net`** — el **suffix** sale de `tailscale dns status` (línea `suffix = …`).

**Git en cada host:** antes de cambios locales, sincronizar el repo Opsly (`./scripts/git-sync-repo.sh` o `git pull --ff-only`). Detalle: **`docs/SESSION-GIT-SYNC.md`** (opsly-admin, opsly-worker, VPS).

Usuario Linux en el worker: **`opslyquantum`** (o el que tengas creado). El **skill** del repo `opsly-quantum` (`skills/user/opsly-quantum/`) es solo el nombre del procedimiento maestro; **no** es el hostname del worker.

---

## MagicDNS — comprobar

```bash
ping -c1 opsly-admin.<tu-suffix>.ts.net
ping -c1 opsly-worker.<tu-suffix>.ts.net
tailscale ping opsly-worker
```

**Smoke:** `scripts/verify-platform-smoke.sh` usa por defecto `opslyquantum@opsly-worker.<suffix>.ts.net`. Overrides: `WORKER_TAILSCALE_NAME`, `WORKER_USER`, `WORKER_SSH`, `OPSLY_WORKER_HOSTNAME`, o `config/worker-tailscale.env` (plantilla: `config/worker-tailscale.env.example`).

En **`~/.ssh/config`**, **`HostName`** debe ser el **FQDN** MagicDNS, no la IP `100.x`, para que no quede obsoleto si Tailscale reasigna.

---

## Renombrar en Tailscale (admin)

1. [Machines](https://login.tailscale.com/admin/machines) → nodo → **⋯** → **Edit machine name** → **`opsly-admin`** o **`opsly-worker`**.
2. O en la máquina: `sudo tailscale up --hostname=opsly-admin` / `sudo tailscale up --hostname=opsly-worker`.

Comprueba: `tailscale status`, `tailscale ip -4`.

---

## `~/.ssh/config` — plantilla Opsly

Un **`Host` por rol**; sustituye `<suffix>` por el de `tailscale dns status` y usuarios si difieren:

```sshconfig
Host opsly-admin
    HostName opsly-admin.<suffix>.ts.net
    User cboteros
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60

Host opsly-worker
    HostName opsly-worker.<suffix>.ts.net
    User opslyquantum
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

```bash
ssh opsly-admin "hostname"
ssh opsly-worker "hostname && uname -a"
```

---

## Repo

- Worker remoto: **`docs/WORKER-SETUP-MAC2011.md`**.
- Scripts con flag `--mac2011-ip`: es la **IP LAN / Tailscale del worker** (`100.80.41.29` típico), no la de la Mac principal.

---

## Aviso `client != tailscaled`

Si aparece advertencia de versión entre cliente y `tailscaled`, alinea versiones (`brew upgrade tailscale`, actualizar app). Suele ser cosmético si todo funciona.
