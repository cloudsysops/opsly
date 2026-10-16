---
status: active
owner: operations
last_review: 2026-09-22
type: infrastructure
tags:
  - opsly/infrastructure
  - opsly/security
  - opsly/worker
---

# SSH al PC smdqcia (Windows + WSL) por Tailscale

Acceso SSH al nodo **`smdqcia-pc`** (host Windows `DESKTOP-SMDQCIA` + WSL2 Ubuntu, usuario `opsly`)
usando **Tailscale + MagicDNS**, con causes raíz y comandos de verificación documentados.

## Resumen de estado (2026-10-05, reconciliado)

- ✅ **Dueño de `:22` = Windows OpenSSH** (servicio `sshd`), no `ssh.socket` de WSL.
- ✅ Shell por defecto: `DefaultShell=C:\Opsly\bin\opsly-agent-shell.exe` → `wsl.exe -e bash` (WSL; executable, not `.cmd`).
- ✅ Windows PowerShell desde Mac: `ssh opsly@smdqcia-pc "powershell.exe -NoProfile -Command '...'"`
- ✅ Firewall inbound TCP/22 **scoped a Tailscale CGNAT** `100.64.0.0/10` (regla `Opsly-SSH-Tailscale-22`).
- ✅ Reparación idempotente (Admin): `scripts/ops/ensure-smdqcia-agent-access.ps1` — **no** hacer `portproxy reset` global; solo borra proxies en `:22`.
- ✅ Plantilla Mac: `cboteros/opsly-bootstrap` → `ssh/config.mac` + `mac-apply-ssh-config.sh`
- ⚠️ WSL `ssh.socket` / `ssh` deben quedar **stopped+disabled** para no pelear el bind.
- ⚠️ `smdqcia-wsl` / `100.115.197.109` es phantom en inventario — **no** usarlo como destino canónico de agentes.
- ⚠️ No usar el nodo Tailscale legacy `pc-gamer` (`DESKTOP-P06TD4R`) para `home-gpu-01`.
- ⚠️ Tras cambiar el host key de OpenSSH, en el Mac: `ssh-keygen -R smdqcia-pc`.

## Arquitectura

```text
            Tailscale (100.64.0.0/10) solo
                  │
  Mac (opsly-quantum) ──────► smdqcia-pc:<22>  Windows OpenSSH (recomendado)
       ssh -p 2222 ─────────► smdqcia-pc:<2222> túnel inverso (fallback legacy)
                                  │
                          Firewall: allow TCP/22 RemoteAddress=100.64.0.0/10
                                  │
                          DefaultShell → opsly-agent-shell.cmd → wsl.exe -e bash
                                  │
                          WSL2 Ubuntu (repo ~/opsly, worker home-gpu-01)
                          WSL ssh.socket: DISABLED (no bind :22)
```

- `.wslconfig` del host: `networkingMode=mirrored` + `dnsTunneling=true`.
- Tailscale de **Windows** publica el nodo canónico `smdqcia-pc`. Tailscale dentro de WSL es opcional y **no** es inventario canónico.

| Nodo / dato               | Valor                                         |
| ------------------------- | --------------------------------------------- |
| Windows host              | `DESKTOP-SMDQCIA`                             |
| MagicDNS (canónico)       | `smdqcia-pc` / `smdqcia-pc.<suffix>.ts.net`   |
| IP tailnet                | dinámico (`tailscale ip -4`); no hardcodear   |
| Usuario (Windows + WSL)   | `opsly`                                       |
| `sshd` dueño de `:22`     | **Windows** OpenSSH                           |
| Shell default             | WSL vía `opsly-agent-shell.cmd`               |

El suffix sale de `tailscale dns status` (línea `suffix = …`), p. ej. `taile4fe40.ts.net`.

## Causa raíz: portproxy residual de Windows

Los tanteos reportaban "CERRADO" porque el puerto no respondía:

1. Un **portproxy residual** de Windows (`netsh interface portproxy` con `0.0.0.0:22 → 127.0.0.1:22`,
   proceso svchost/iphlpsvc) **ocupaba el 22** e impedía el bind de `ssh.socket` de WSL
   (error en logs: `Address already in use`).
2. Por eso además `systemctl start ssh.socket` fallaba "activo" sin listener y el sshd nunca arrancaba bien.

**Fix (canónico):** `ensure-smdqcia-agent-access.ps1` borra **solo** reglas `listenport=22` (nunca `portproxy reset` global).
**Regla:** si vuelve el síntoma "listener 22 raro / bind conflict", revisar `netsh interface portproxy show all`
y volver a correr el ensure script.

### Los "CERRADO" anteriores eran FALSOS

Desde el Mac se probó con `timeout 5 bash -c "</dev/tcp/..."` — **`timeout` no existe en el zsh del Mac**,
así que el comando fallaba antes de probar el puerto. Usar siempre `nc` o SSH real:

```bash
nc -vz smdqcia-pc 22
ssh -o BatchMode=yes -o ConnectTimeout=10 opsly@smdqcia-pc "hostname; uname -s"
```

## Restablecer SSH tras reboot / WSL shutdown

**No** arrancar `ssh.socket` de WSL — pelearía el puerto con Windows OpenSSH.

Desde PowerShell **Admin** en el PC:

```powershell
# Preferido: reparación completa idempotente
powershell -ExecutionPolicy Bypass -File $env:USERPROFILE\opsly\scripts\ops\ensure-smdqcia-agent-access.ps1

# Mínimo: solo servicio Windows
Restart-Service sshd -Force
Get-Service sshd   # Running
```

Verificar desde el Mac (MagicDNS, no IP fija):

```bash
nc -vz smdqcia-pc 22
ssh -o BatchMode=yes -o ConnectTimeout=10 opsly@smdqcia-pc 'uname -s; echo WSL_OK'
```

## Firewall Windows (estado 2026-10-05)

Los 3 perfiles están `Enabled=True` con `DefaultInboundAction=Block`. Canónico:

| Regla                     | Parámetros                                                         |
| ------------------------- | ------------------------------------------------------------------ |
| `Opsly-SSH-Tailscale-22`  | Inbound / Allow / TCP 22 / **RemoteAddress=`100.64.0.0/10`**     |

No abrir TCP/22 a `Any`/LAN/público. `ensure-smdqcia-agent-access.ps1` re-scopea reglas legacy OpenSSH/WSL a CGNAT Tailscale.

## Camino recomendado: SSH directo por tailnet (puerto 22)

El acceso **directo** (`smdqcia-pc:22`, llaves del Mac u otras autorizadas) está validado y es el camino
principal. Es el puerto estándar, no depende de un servicio de túnel ni de que el Mac esté encendido.

```bash
ssh opsly@smdqcia-pc                            # MagicDNS; llaves en ~/.ssh
ssh -o ConnectTimeout=10 opsly@smdqcia-pc
```

### Túnel inverso 2222 (fallback / legacy)

El túnel inverso Mac→PC existe como respaldo (`~/.config/systemd/user/opsly-macbook-tunnel.service`,
`RemoteForward 2222 127.0.0.1:22` en `~/.ssh/config`, Host `macbook`), pero **ya no es necesario** para
entrar a esta máquina:

```bash
ssh -p 2222 opsly@127.0.0.1              # vía túnel del Mac (solo cuando el Mac está up)
systemctl --user status opsly-macbook-tunnel   # active (running) en el Mac
```

**Gotcha:** si el túnel falla con `remote port forwarding failed for listen port 2222`, hay un listener
zombi en el Mac ocupando el 2222 local. Matar e reiniciar:

```bash
kill $(lsof -tiTCP:2222 -sTCP:LISTEN -P -n)
systemctl --user restart opsly-macbook-tunnel
```

## SSH desde el iPhone

Objetivo: entrar a esta máquina desde un iPhone usando la llave dedicada.

1. **Tailscale en el iPhone:** iniciar sesión en la cuenta `cboteros@` (nodo `iphone`); con la app activa,
   `smdqcia-pc.<suffix>.ts.net` resuelve por MagicDNS a `100.117.5.102`.
2. **App SSH** (p. ej. Termius, Blink o similar) e importar la **llave privada** desde este archivo:
   **`~/.ssh/iphone_key`** (par ed25519 sin passphrase, comentario `iphone-cboteros`).  
   **No copiar el contenido de la llave en chats/repos; referenciar por ruta.**
3. Conectar a: host `smdqcia-pc.<suffix>.ts.net`, puerto **22**, usuario `opsly`, llave `iphone_key`.
4. La llave pública ya está en `~/.ssh/authorized_keys` del usuario `opsly` (verificado:
   `hostname` → `DESKTOP-SMDQCIA`).

Para regenerar la llave del iPhone si se pierde (ed25519, sin passphrase):

```bash
ssh-keygen -t ed25519 -N "" -C iphone-cboteros -f ~/.ssh/iphone_key
cat ~/.ssh/iphone_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Repo / Nomenclatura

- Nombres y usuarios por rol: [`TAILSCALE-NOMENCLATURA.md`](TAILSCALE-NOMENCLATURA.md).
- Este PC es el worker efímero `home-gpu-01` (RTX 3060): [`PC-GAMER-WORKER.md`](PC-GAMER-WORKER.md)
  (regla: SSH solo Tailscale, sin abrir puerto 22 al router).
- Comandos SSH locales de referencia: [`SSH-COMMANDS-LOCALRANK.md`](SSH-COMMANDS-LOCALRANK.md).