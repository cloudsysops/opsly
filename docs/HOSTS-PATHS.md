# Hosts and Project Paths

Fecha de verificación: 2026-04-13

## Resumen operativo

Estado general: sistema ordenado y consistente para operación multi-host.

- Rutas de proyecto validadas por host.
- Roles de host claros (`opsly-admin`, `opsly-worker`, `vps-dragon`).
- Base lista para automatizar setup de usuario/grupo compartido.

## Inventario de hosts

| Host lógico | Acceso | Ruta proyecto | Estado |
|---|---|---|---|
| `opsly-admin` | local (`dragon`) | `/Users/dragon/cboteros/proyectos/intcloudsysops` | ✅ |
| `opsly-worker` | `opslyquantum@opsly-mac2011` | `/home/opslyquantum/opsly` | ✅ |
| `vps-dragon` | `vps-dragon@vps-dragon` | `/opt/opsly` | ✅ |
| `vps-dragon` (workspace adicional) | `vps-dragon@vps-dragon` | `/home/vps-dragon/dev/cloudsysops` | ✅ |

## Estándar de identidad de sistema

- Usuario aplicación: `cloudsysops`
- Grupo aplicación: `cloudsysops`
- UID: `1001`
- GID: `1001`

## Script de bootstrap multi-host

Script canónico:

- `scripts/setup-cloudsysops-user-all-hosts.sh`

Acciones:

1. Crea/valida grupo `cloudsysops` (`gid=1001`)
2. Crea/valida usuario `cloudsysops` (`uid=1001`)
3. Asegura home y shell
4. Verifica resultado por host

Comandos:

```bash
chmod +x scripts/setup-cloudsysops-user-all-hosts.sh
./scripts/setup-cloudsysops-user-all-hosts.sh
```

Modo simulación:

```bash
./scripts/setup-cloudsysops-user-all-hosts.sh --dry-run
```
