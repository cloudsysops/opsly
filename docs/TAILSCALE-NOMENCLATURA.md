# Tailscale — nombres de máquinas (Opsly)

Evita confusiones entre **hostname del sistema**, **nombre en Tailscale** y **alias SSH** (`Host` en `~/.ssh/config`).

## Nomenclatura recomendada (abril 2026)

| Rol real | Nombre en Tailscale (admin) | IP Tailscale (100.x) | Alias SSH (`~/.ssh/config`) |
|----------|-----------------------------|----------------------|-----------------------------|
| Mac 2020 — dev principal (Cursor, repo) | `mac2020` o `opsly-dev` | `100.89.38.3` | `Host mac2020` |
| **Worker** — hardware Mac 2011, **Ubuntu** (orchestrator, Node) | **`opsly-mac2011`** | **`100.80.41.29`** | **`Host opsly-mac2011`** |
| VPS Opsly | `vps-dragon` | `100.120.151.91` | `Host vps-dragon` |

> Si la Mac 2020 apareció antes con un nombre equivocado en Tailscale, **renómbrala** en el admin o por CLI (abajo). El worker **sí** es `opsly-mac2011` (Linux). El **usuario Linux** en el worker puede ser `cboteros`, **`opslyquantum`**, etc.: en `~/.ssh/config` usa `User` con el que realmente entras (`ssh opslyquantum@100.80.41.29`).

---

## Cómo cambiar el nombre en Tailscale

### Opción A — Consola web (recomendada)

1. Abre [Tailscale admin — Machines](https://login.tailscale.com/admin/machines).
2. Elige la máquina (p. ej. la que antes decía `mac2011`).
3. Menú **⋯** → **Edit machine name** → por ejemplo `mac2020` o `opsly-dev`.
4. Guarda. En unos segundos `tailscale status` en otros nodos mostrará el nombre nuevo.

### Opción B — CLI en la propia máquina

En la Mac donde quieres fijar el nombre (con Tailscale instalado):

```bash
sudo tailscale up --hostname=mac2020
```

> En macOS suele bastar la **opción A**; si el CLI falla o no admite `--hostname`, no uses `--reset` (puede deshacer ajustes). Reinicia la **app Tailscale** tras cambiar el nombre.

Comprueba:

```bash
tailscale status
tailscale ip -4
```

---

## `~/.ssh/config` (Mac 2020 — ejemplo)

Sustituye usuario si no es `cboteros`:

```sshconfig
# Mac 2020 — desarrollo principal (IP Tailscale actual)
Host mac2020
    HostName 100.89.38.3
    User cboteros
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
```

Prueba:

```bash
ssh mac2020 "hostname && scutil --get ComputerName 2>/dev/null || hostname"
```

### Worker Ubuntu (`opsly-mac2011`)

Desde la Mac 2020 (ajusta **`User`** y clave SSH si usas otra):

```sshconfig
Host opsly-mac2011
    HostName 100.80.41.29
    User opslyquantum
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Opcional: segundo alias si prefieres entrar con el nombre de usuario:

```sshconfig
Host opslyquantum
    HostName 100.80.41.29
    User opslyquantum
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

```bash
ssh opsly-mac2011 "hostname && uname -a"
```

---

## Coherencia en el repo

- Guías de worker remoto: `docs/WORKER-SETUP-MAC2011.md` (Ubuntu worker), no confundir con la Mac 2020.
- Scripts legacy que mencionan `mac2011` en flags (`scripts/tunnel-access.sh --mac2011-ip`): el parámetro es la **IP LAN del worker** (en Tailscale suele ser **`100.80.41.29`** para `opsly-mac2011`), no la IP de la Mac 2020.

---

## Aviso de versiones `client != tailscaled`

Si ves:

```text
Warning: client version "..." != tailscaled server version "..."
```

Actualiza **CLI y app** alineados (`brew upgrade tailscale` y/o actualizar la app desde la web/App Store). Suele ser cosmético si todo funciona.
