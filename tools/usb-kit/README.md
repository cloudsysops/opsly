# USB kit Opsly (herramienta de trabajo portátil)

Kit de scripts y documentación para llevar en un pendrive **junto con un clon completo del repo** (incluye `config/opsly.config.json`). No guardes secretos en el USB sin cifrado.

## Discos de referencia

| Identificador | Rol sugerido |
|---------------|----------------|
| **disk3** (macOS `diskutil`) | Instalador **Ubuntu booteable** — arranque e instalación en el Mac 2011 u otro equipo |
| Partición de datos en el mismo pen u otro USB | Clon del repo + estos scripts (opcional: ISO extra con [Ventoy](https://www.ventoy.net/)) |

En Linux el dispositivo será `/dev/sdX` o similar; ejecuta `./pen-hint-disks.sh` y revisa `lsblk` antes de formatear o montar.

## Requisitos en el equipo destino

- Ubuntu (o otra distro) con `bash`, `git`, `curl`, `jq`, `openssh-client`
- Opcional según tarea: `docker`, `doppler`, `gh`, `dig`

Comprobación rápida desde este directorio:

```bash
chmod +x pen-*.sh
./pen-check-tools.sh
./pen-check-tools.sh --strict   # falla si falta algo crítico o no hay repo
```

## Scripts

| Script | Descripción |
|--------|-------------|
| `pen-hint-disks.sh` | Lista discos (`diskutil` en macOS, `lsblk` en Linux) |
| `pen-check-tools.sh` | Verifica CLI útiles y que exista el repo |
| `pen-sync-repo.sh` | `git fetch` + `merge --ff-only` en la rama actual (o `--branch main`) |
| `pen-ssh-vps.sh` | SSH al VPS: lee `infrastructure.vps_*` de `opsly.config.json`, o `pen.local.json`, o `OPSLY_SSH_TARGET` |

Dry-run (no ejecuta cambios remotos salvo mostrar la orden):

```bash
DRY_RUN=true ./pen-sync-repo.sh
DRY_RUN=true ./pen-ssh-vps.sh -- -- whoami
```

## SSH sin repetir usuario@IP

1. Copia `pen.config.example.json` a `pen.local.json`
2. Pon en `ssh.target` el `Host` de tu `~/.ssh/config` (por ejemplo `vps-dragon`)

`pen.local.json` está en `.gitignore` del repo.

## Flujo recomendado después de instalar Ubuntu

1. Instalar Docker (según documentación oficial Ubuntu LTS)
2. Clonar o copiar el repo al disco interno; mantener copia en USB para rescate
3. Desde la raíz del repo: `./scripts/validate-config.sh` (cuando Doppler/SSH estén configurados en esa máquina)
4. En VPS: seguir `AGENTS.md` → `vps-bootstrap.sh`, login GHCR, `vps-first-run.sh`, health

## Aprendizaje

- **Infra fija** del proyecto: `AGENTS.md`, `VISION.md`, `docs/VPS-ARCHITECTURE.md`, `docs/DNS_SETUP.md`
- **Sin secretos en git**: Doppler `prd`; nunca subir `.env` reales al pendrive sin cifrar
