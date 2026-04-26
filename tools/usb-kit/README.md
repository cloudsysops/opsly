# USB kit Opsly (herramienta de trabajo portátil)

Kit de scripts y documentación para llevar en un pendrive **junto con un clon completo del repo** (incluye `config/opsly.config.json` e `infra/terraform/`). No guardes secretos en claro en el USB: usá **`pen-secrets.sh`** con [age](https://github.com/FiloSottile/age).

## Contenido del USB (estructura sugerida)

Ejemplo con **disk3** = instalador Ubuntu booteable y **disk4** (o partición de datos) = trabajo:

```text
USB (disk4 o partición datos)/
├── opsly/                          # clon completo del repo (cloudsysops/opsly)
│   ├── apps/
│   ├── config/
│   ├── infra/
│   │   └── terraform/              # recrear droplet en DigitalOcean si aplica
│   ├── scripts/
│   └── tools/
│       └── usb-kit/
│           ├── pen-*.sh
│           ├── lib/
│           └── secrets/            # solo .age — NO commitear (gitignored)
│               ├── emergency.env.age
│               ├── vps-dragon_ssh.age
│               └── github_pat.age
└── (opcional) ISO / Ventoy en otro volumen
```

| Identificador                | Rol sugerido                                  |
| ---------------------------- | --------------------------------------------- |
| **disk3** (macOS `diskutil`) | Instalador **Ubuntu booteable**               |
| **disk4** o partición datos  | Clon del repo + `tools/usb-kit/secrets/*.age` |

En Linux: `lsblk` para identificar el dispositivo (`/dev/sdX`).

## Secrets cifrados (age)

- **Contraseña de volumen:** si el USB viaja físicamente, usá cifrado de disco (FileVault en Mac, LUKS en Linux) además de age.
- **Passphrase de age:** es la última línea de defensa si alguien copia los `.age`; elegí una fuerte y no la guardes en el mismo USB en claro.
- **Después de cualquier `restore`:** rotá PAT, claves SSH si hubo exposición, y secretos en **Doppler** (`ops-intcloudsysops` / `prd`) según política del equipo.
- **Supervisión:** no dejes el USB conectado sin vigilancia en máquinas que no controlás.

Comandos:

```bash
./pen-secrets.sh save      # crea tools/usb-kit/secrets/*.age (interactivo)
./pen-secrets.sh restore   # descifra a /tmp/opsly-restore/ (permisos 600)
./pen-secrets.sh verify    # comprueba que los .age existen y la passphrase descifra
./pen-secrets.sh --dry-run save   # solo muestra qué haría
```

Instalación de **age**: macOS `brew install age`; Debian/Ubuntu `sudo apt install age`.

La passphrase **solo** con `read -s` en el script; nunca como argumento en la línea de comandos. El PAT de GitHub tampoco se pasa por argv.

## Flujos de recuperación

| Escenario                     | Script / acción               | Tiempo aprox.        | Qué necesitás del USB                                          |
| ----------------------------- | ----------------------------- | -------------------- | -------------------------------------------------------------- |
| Mac nueva sin herramientas    | `./pen-recover.sh` → opción 1 | 45–90 min            | Clon del repo; opcional `secrets/*.age`                        |
| VPS reseteado (misma máquina) | `./pen-recover.sh` → opción 2 | 30–60 min            | Acceso SSH al servidor; red para `git clone`                   |
| Sin Doppler                   | `./pen-recover.sh` → opción 3 | 15–30 min + rotación | `secrets/*.age` + passphrase age                               |
| VPS destruido (Terraform)     | `./pen-recover.sh` → opción 4 | 30–120 min           | Repo con `infra/terraform/`; token DO vía Doppler (`TF_VAR_*`) |
| Peor caso (todo)              | `./pen-recover.sh` → opción 5 | Varios pasos         | Clon completo + secrets cifrados + documentación               |

`pen-recover.sh` **no ejecuta** comandos: solo muestra texto listo para copiar y pegar.

## Terraform desde el USB

Si el droplet de producción en DigitalOcean se perdió y el DNS/state están bajo control:

1. En una máquina de confianza con Terraform y red:
   - `cd opsly/infra/terraform`
   - Exportá `TF_VAR_do_token` y `TF_VAR_ssh_fingerprint` desde **Doppler** (nunca en `.tf` ni en el repo).
   - `terraform init && terraform plan && terraform apply`
2. Revisá `infra/terraform/README.md` en el repo: import del droplet de **producción** existente vs crear **staging** con `create_staging = true`.
3. Cuando el nuevo servidor tenga IP y DNS, repetí bootstrap en el VPS (`./scripts/vps-bootstrap.sh`, `vps-first-run.sh`, health).

El token de DigitalOcean no forma parte de `pen-secrets` por defecto: mantenelo en Doppler o gestioná un backup cifrado aparte si lo necesitás offline.

## Discos de referencia (resumen)

| Identificador                  | Rol sugerido                         |
| ------------------------------ | ------------------------------------ |
| **disk3** (macOS `diskutil`)   | Instalador **Ubuntu booteable**      |
| Partición de datos / **disk4** | Clon del repo + scripts + `secrets/` |

Ejecutá `./pen-hint-disks.sh` antes de particionar o montar.

## Requisitos en el equipo destino

- Ubuntu (u otro Linux) o macOS con `bash`, `git`, `curl`, `jq`, `openssh-client`
- Opcional según tarea: `docker`, `doppler`, `gh`, `dig`, `age`, `terraform`

```bash
chmod +x pen-*.sh
./pen-check-tools.sh
./pen-check-tools.sh --strict
```

## Scripts

| Script               | Descripción                                                  |
| -------------------- | ------------------------------------------------------------ |
| `pen-hint-disks.sh`  | Lista discos (`diskutil` / `lsblk`)                          |
| `pen-check-tools.sh` | Verifica CLI útiles y que exista el repo                     |
| `pen-sync-repo.sh`   | `git fetch` + `merge --ff-only`                              |
| `pen-ssh-vps.sh`     | SSH al VPS vía `opsly.config.json` o `pen.local.json`        |
| `pen-secrets.sh`     | Cifrado age de .env emergencia, clave SSH y PAT → `secrets/` |
| `pen-recover.sh`     | Menú de escenarios de recuperación (solo texto)              |

Dry-run:

```bash
DRY_RUN=true ./pen-sync-repo.sh
./pen-secrets.sh --dry-run save
```

## SSH sin repetir usuario@IP

1. Copiá `pen.config.example.json` a `pen.local.json`
2. Poné en `ssh.target` el `Host` de `~/.ssh/config` (ej. `vps-dragon`)

`pen.local.json` está en `.gitignore` del repo.

## Flujo recomendado después de instalar Ubuntu

1. Instalar Docker (documentación oficial Ubuntu LTS)
2. Clonar o copiar el repo al disco interno; mantener copia en USB
3. `./scripts/validate-config.sh` cuando Doppler/SSH estén configurados
4. En VPS: `AGENTS.md` → `vps-bootstrap.sh`, login GHCR, `vps-first-run.sh`, health

## Aprendizaje

- **Contexto fijo:** `AGENTS.md`, `VISION.md`, `docs/VPS-ARCHITECTURE.md`, `docs/DNS_SETUP.md`, `infra/terraform/README.md`
- **Sin secretos en git:** Doppler `prd`; `tools/usb-kit/secrets/` siempre ignorado por git
