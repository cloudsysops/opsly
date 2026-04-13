# Setup Sudoers Cloudsysops

Objetivo: permitir ejecución no interactiva del bootstrap de usuario/grupo
`cloudsysops` en hosts Opsly sin abrir permisos amplios de `sudo`.

## Alcance de permisos

Se habilita `NOPASSWD` **solo** para:

- `/usr/sbin/groupadd`
- `/usr/sbin/useradd`

Usuarios target:

- `dragon` (opsly-admin local)
- `opslyquantum` (opsly-worker / opsly-mac2011)
- `vps-dragon` (vps)

## Script recomendado

```bash
chmod +x scripts/setup-sudoers-cloudsysops.sh
./scripts/setup-sudoers-cloudsysops.sh --dry-run
./scripts/setup-sudoers-cloudsysops.sh
```

Luego:

```bash
./scripts/setup-cloudsysops-user-all-hosts.sh
```

## Contenido sudoers aplicado

```sudoers
# Managed by setup-sudoers-cloudsysops.sh
dragon ALL=(root) NOPASSWD: /usr/sbin/groupadd, /usr/sbin/useradd
opslyquantum ALL=(root) NOPASSWD: /usr/sbin/groupadd, /usr/sbin/useradd
vps-dragon ALL=(root) NOPASSWD: /usr/sbin/groupadd, /usr/sbin/useradd
```

Archivo destino:

- `/etc/sudoers.d/opsly-cloudsysops-bootstrap`

Validación:

- `sudo visudo -cf /etc/sudoers.d/opsly-cloudsysops-bootstrap`
- Permisos: `0440`

## Rollback

```bash
sudo rm -f /etc/sudoers.d/opsly-cloudsysops-bootstrap
```
