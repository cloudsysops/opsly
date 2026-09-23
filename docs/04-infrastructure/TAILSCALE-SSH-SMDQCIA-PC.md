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

## Resumen de estado (2026-09-22)

- ✅ **Acceso directo por tailnet FUNCIONA.** `ssh opsly@smdqcia-pc.<suffix>.ts.net` (puerto 22)
  responde con `hostname` = `DESKTOP-SMDQCIA`.
- ✅ `sshd` de WSL escucha en `0.0.0.0:22` y `[::]:22` (OpenSSH de Windows **no** está instalado; el SSH vive en WSL).
- ✅ Causa raíz de semanas de "CERRADO": **portproxy residual de Windows** ocupando el 22 (resuelto, ver abajo).
- ✅ Firewall Windows activo: 3 perfiles `Enabled=True`, `DefaultInboundAction=Block`, con reglas allow explícitas.
- ✅ Llave para **iPhone** creada y autorizada (ver sección iPhone; **referir por ruta, no pegar llaves**).
- ⚠️ Node fantasma `desktop-smdqcia` (Linux) aún visible en la tailnet (cosmético; retirar en admin).

## Arquitectura

```text
            Tailscale (100.64.0.0/10) solo
                  │
  Mac (opsly-quantum) ──────► smdqcia-pc:<22>  SSH directo (recomendado)
       ssh -p 2222 ─────────► smdqcia-pc:<2222> túnel inverso (fallback)
                                  │
                          Windows Firewall (Block + allow 22 Tailscale / WSL)
                                  │
                           WSL2 Ubuntu sshd :22 (eth0 = IP tailscale espejada)
```

- `.wslconfig` del host: `networkingMode=mirrored` + `dnsTunneling=true`.
  Gracias a mirrored, el `eth0` de WSL (100.117.5.102) es la misma IP tailnet del nodo, y las
  rutas tailnet directas se ven desde dentro de WSL.
- `tailscaled` **dentro** de WSL está deshabilitado; la app Tailscale de Windows gestiona el nodo único `smdqcia-pc`.

| Nodo / dato               | Valor                                |
| ------------------------- | ------------------------------------ |
| Windows host              | `DESKTOP-SMDQCIA`                    |
| IP tailnet                | `100.117.5.102`                      |
| MagicDNS                  | `smdqcia-pc.<suffix>.ts.net`         |
| Usuario (Windows + WSL)   | `opsly`                              |
| `sshd`                    | WSL, `0.0.0.0:22` + `[::]:22`        |

El suffix sale de `tailscale dns status` (línea `suffix = …`), p. ej. `taile4fe40.ts.net`.

## Causa raíz: portproxy residual de Windows

Los tanteos reportaban "CERRADO" porque el puerto no respondía:

1. Un **portproxy residual** de Windows (`netsh interface portproxy` con `0.0.0.0:22 → 127.0.0.1:22`,
   proceso svchost/iphlpsvc) **ocupaba el 22** e impedía el bind de `ssh.socket` de WSL
   (error en logs: `Address already in use`).
2. Por eso además `systemctl start ssh.socket` fallaba "activo" sin listener y el sshd nunca arrancaba bien.

**Fix (ya aplicado):** se eliminó ese portproxy (`netsh interface portproxy delete v4tov4 listenport=22 …`),
quedó el portproxy vacío y sin listener 22 en Windows. **Regla:** si vuelve el síntoma
"listener 22 en Windows / ssh.socket no puede bindear", revisar primero `netsh interface portproxy show all`.

### Los "CERRADO" anteriores eran FALSOS

Desde el Mac se probó con `timeout 5 bash -c "</dev/tcp/..."` — **`timeout` no existe en el zsh del Mac**,
así que el comando fallaba antes de probar el puerto. Usar siempre `nc` o SSH real:

```bash
nc -vz 100.117.5.102 22                    # succeeded
nc -vz -6 fd7a:115c:a1e0::43a:568 22       # succeeded (IPv6 tailnet)
ssh -o BatchMode=yes -o ConnectTimeout=10 opsly@smdqcia-pc.<suffix>.ts.net "hostname"  # DESKTOP-SMDQCIA
```

## Restablecer sshd tras un WSL shutdown / reboot

`wsl --shutdown` o un reboot deja el `ssh.socket` sin arrancar. Como `sudo` interactivo **no** está
disponible, el restablecimiento canónico (desde el host Windows, no requiere UAC si WSL está elevado):

```bash
powershell.exe wsl -u root -e bash -lc 'systemctl start ssh.socket'
```

Verificar dentro de WSL:

```bash
systemctl is-active ssh.socket   # active
ss -tlnp | grep ':22 '           # sshd en 0.0.0.0:22 y [::]:22
```

## Firewall Windows (estado 2026-09-22)

Los 3 perfiles están `Enabled=True` con `DefaultInboundAction=Block`. Se mantienen **dos** reglas allow
("dejala" según operador):

| Regla                        | Parámetros                                                        |
| ---------------------------- | ----------------------------------------------------------------- |
| `OpenSSH-Tailscale-22`       | Inbound / Allow / TCP 22 / Profile Any                            |
| Hyper-V `WSL-In-TCP-22`      | Inbound / Allow / 22 con `VMCreatorId` `{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}` |

La interfaz Tailscale está en perfil **Private**, Ethernet en **Public**. No abrir 22 al público (regla de
PC-gamer): SSH **solo** por tailnet.

## Camino recomendado: SSH directo por tailnet (puerto 22)

El acceso **directo** (`smdqcia-pc:22`, llaves del Mac u otras autorizadas) está validado y es el camino
principal. Es el puerto estándar, no depende de un servicio de túnel ni de que el Mac esté encendido.

```bash
ssh opsly@smdqcia-pc.<suffix>.ts.net        # usa llaves en ~/.ssh
ssh -o ConnectTimeout=10 opsly@100.117.5.102
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