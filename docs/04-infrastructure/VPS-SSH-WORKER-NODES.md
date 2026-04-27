# SSH desde el VPS hacia otros nodos (workers)

> **Objetivo:** que el usuario del VPS (p. ej. `vps-dragon`) pueda abrir sesiones SSH **sin contraseña** hacia workers (Mac 2011, laptops, etc.) usando **clave pública**, solo por **Tailscale** (`100.64.0.0/10` o nombres MagicDNS).  
> **No sustituye** el acceso humano desde `opsly-admin`: sigue siendo válido `ssh opsly-worker` desde la Mac principal. Esto documenta el caso **VPS → nodo** para scripts, healthchecks o despliegues.

**Usuarios por máquina (agentes):** tabla canónica en [`SSH-USERS-FOR-AGENTS.md`](SSH-USERS-FOR-AGENTS.md).

## Convención desplegada en VPS (referencia)

En el VPS real puede existir el par **`~/.ssh/vps_to_nodes`** / **`vps_to_nodes.pub`** (en lugar del nombre de ejemplo `id_ed25519_opsly_nodes`). La **pública** debe estar en `~opslyquantum/.ssh/authorized_keys` del worker.

Ejemplo de prueba:

```bash
ssh -i ~/.ssh/vps_to_nodes -o IdentitiesOnly=yes \
  opslyquantum@100.80.41.29 "hostname"
```

Opcional en `~/.ssh/config` del VPS: host **`opsly-mac2011-ip`** → `HostName 100.80.41.29`, `User opslyquantum`, `IdentityFile ~/.ssh/vps_to_nodes`.

Los pasos siguientes usan el nombre **`id_ed25519_opsly_nodes`** como plantilla para **nuevas** instalaciones; si ya tenéis `vps_to_nodes`, **no** dupliquéis claves: reutilizad el mismo par.

## Principio

Linux/OpenSSH no «da permisos desde el VPS» de forma mágica: en **cada nodo destino** hay que añadir la **clave pública** del VPS a `~/.ssh/authorized_keys` del usuario que recibirá la conexión (p. ej. `opslyquantum`).

- **Nunca** subir la clave **privada** al repo ni a Doppler.
- **Nunca** habilitar SSH del VPS por **IP pública** hacia workers; usar **solo Tailscale** (alineado a `AGENTS.md`).

## 1. En el VPS: generar un par dedicado (recomendado)

Conecta por Tailscale:

```bash
ssh vps-dragon@100.120.151.91
```

Crea una clave solo para salidas hacia workers (nombre sugerido):

```bash
install -d -m 700 ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_opsly_nodes -N "" -C "vps-dragon@opsly-nodes"
chmod 600 ~/.ssh/id_ed25519_opsly_nodes
```

Muestra la **pública** (esta es la que van a pegar en los workers):

```bash
cat ~/.ssh/id_ed25519_opsly_nodes.pub
```

## 2. En cada nodo worker (una vez por máquina)

Entra al worker por consola, por la Mac admin, o por SSH ya existente. Como el usuario destino (ej. `opslyquantum`):

```bash
install -d -m 700 ~/.ssh
chmod 700 ~/.ssh
# Pega UNA línea: el contenido completo de id_ed25519_opsly_nodes.pub
nano ~/.ssh/authorized_keys   # o: echo 'ssh-ed25519 AAAA...comment' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Comprueba que `sshd` acepta claves (por defecto sí):

```bash
grep -E '^(PubkeyAuthentication|AuthorizedKeysFile)' /etc/ssh/sshd_config
# Si cambiaste algo, sudo systemctl reload ssh
```

## 3. Probar desde el VPS

Sustituye `USUARIO` e `IP_TAILSCALE` (o FQDN MagicDNS del worker):

```bash
ssh -i ~/.ssh/id_ed25519_opsly_nodes -o IdentitiesOnly=yes \
  USUARIO@IP_TAILSCALE "hostname && uptime"
```

Ejemplo con IP típica de worker (ver `docs/TAILSCALE-NOMENCLATURA.md`):

```bash
ssh -i ~/.ssh/id_ed25519_opsly_nodes -o IdentitiesOnly=yes \
  opslyquantum@100.80.41.29 "hostname"
```

## 4. Config SSH en el VPS (opcional)

`~/.ssh/config` en el VPS:

```sshconfig
Host opsly-worker
    HostName 100.80.41.29
    User opslyquantum
    IdentityFile ~/.ssh/id_ed25519_opsly_nodes
    IdentitiesOnly yes
```

Entonces:

```bash
ssh opsly-worker "uptime"
```

## 5. Primera vez: si el worker aún no tiene la clave del VPS

No puedes usar `ssh-copy-id` desde el VPS si aún no hay trust. Orden habitual:

1. Desde **opsly-admin** (Mac), si ya tienes acceso al worker:  
   `ssh-copy-id -i ~/.ssh/id_ed25519.pub opslyquantum@opsly-worker....`  
   y luego **en el worker** añade también la pública del VPS (paso 2).
2. O pega la pública del VPS **a mano** en el worker (consola física / panel cloud).

## 6. Endurecimiento opcional en el worker

- **UFW:** permitir `22/tcp` solo desde la subred Tailscale, p. ej. `100.64.0.0/10` (ver `docs/SECURITY-MITIGATIONS-2026-04-09.md`).
- **`authorized_keys`:** prefijos `from="100.120.151.91"` o `from="100.64.0.0/10"` delante de la clave para limitar origen (sintaxis OpenSSH).
- **Revocar:** borrar la línea de esa clave en `~/.ssh/authorized_keys` en el worker.

## Referencias

- `docs/TAILSCALE-NOMENCLATURA.md` — nombres `vps-dragon`, `opsly-worker`, IPs `100.x`
- `docs/WORKER-SETUP-MAC2011.md` — prerrequisitos en el worker Ubuntu
- `docs/ARCHITECTURE-DISTRIBUTED.md` — Redis y roles `queue-only` / `worker-enabled`
