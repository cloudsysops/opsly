# Terraform — DigitalOcean (Opsly)

**Importante:** el droplet de **producción** ya existe. Ejecutá `terraform import digitalocean_droplet.production <id>` **antes** del primer `terraform apply` que gestione producción; si no, Terraform intentará **crear** otro droplet de producción.

Infraestructura como código para el droplet de **producción** (importado, no recreado por defecto) y un droplet de **staging** opcional (`create_staging = false` por defecto). Token DO y fingerprint SSH **solo** vía Doppler / `TF_VAR_*`, nunca en archivos `.tf` del repo.

## Requisitos

- **Terraform** >= 1.5 (`terraform version`)
- Cuenta **DigitalOcean** con dominio DNS gestionado en DO para `dns_managed_zone` (p. ej. `smiletripcare.com`)
- **Token** API en Doppler (o variable de entorno `TF_VAR_do_token`)
- **Fingerprint** de la clave SSH ya cargada en DO (`TF_VAR_ssh_fingerprint`)

## Comandos básicos

| Comando             | Qué hace                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terraform init`    | Descarga el proveedor `digitalocean` y prepara el backend local (`.terraform/`). **Ejecútalo una vez** por máquina/clon.                            |
| `terraform plan`    | Muestra el plan de cambios **sin aplicar**; revisa siempre antes de `apply`.                                                                        |
| `terraform apply`   | Aplica los cambios aprobados (crea/modifica/destruye según el plan).                                                                                |
| `terraform destroy` | **Elimina todos** los recursos gestionados por este directorio. Peligroso en producción: revisa el plan y usa `-target` solo si sabes lo que haces. |

## Importar el VPS de producción existente

El droplet ya creado en el panel DO debe incorporarse al estado sin recrearlo:

1. Obtén el **ID numérico** del droplet: panel DO o `doctl compute droplet list`.
2. Desde `infra/terraform/` (con `TF_VAR_*` exportados):

```bash
terraform import digitalocean_droplet.production <ID_NUMÉRICO>
```

3. Ejecuta `terraform plan`. Si hay **drift** (nombre, tamaño, imagen), alinea el código o el recurso en DO; para imagen en producción se usa `lifecycle { ignore_changes = [image] }` para reducir riesgo de recreación accidental.

## Flujo: servidor de staging de pruebas

**Crear** droplet + registro DNS `staging.ops`:

```bash
cd infra/terraform
export TF_VAR_do_token="$(doppler secrets get DO_TOKEN --plain --project ops-intcloudsysops --config prd)"
export TF_VAR_ssh_fingerprint="$(doppler secrets get DO_SSH_FINGERPRINT --plain --project ops-intcloudsysops --config prd)"
terraform init
terraform apply -var="create_staging=true"
```

(Ajusta los nombres de secretos en Doppler a los que uses realmente, p. ej. `DIGITALOCEAN_TOKEN`.)

**Destruir** staging (sin tocar producción):

```bash
terraform apply -var="create_staging=false"
```

Eso pone `count = 0` en el droplet y el registro DNS de staging; Terraform los elimina. Alternativa puntual:

```bash
terraform destroy -target=digitalocean_droplet.staging[0] -target=digitalocean_record.staging_ops[0]
```

## Qué ignorar en git (`.gitignore` en la raíz del repo)

| Patrón                           | Motivo                                                           |
| -------------------------------- | ---------------------------------------------------------------- |
| `.terraform/`                    | Plugins y caché del proveedor; regenerable con `init`.           |
| `terraform.tfstate` / `*.backup` | Estado con mapeo real ↔ código; sensible y personal por entorno. |
| `*.tfvars`                       | Suelen contener secretos si alguien los usa localmente.          |

**`.terraform.lock.hcl`**: conviene **versionarlo** en git para fijar versiones del proveedor; no está ignorado.

## Archivos en este directorio

- `backend.tf` — versión mínima de Terraform, proveedor `digitalocean` ~> 2.0, backend local.
- `main.tf` — droplets producción y staging (count).
- `dns.tf` — registros A para `api.ops`, `*.ops`, y `staging.ops` condicional.
- `variables.tf` — entradas sensibles y de configuración.
- `outputs.tf` — IPs y ID de producción.
- `terraform.tfvars.example` — **placeholders** para `do_token` y `ssh_fingerprint`; copiar a `terraform.tfvars` (gitignored) o usar `TF_VAR_*`.

## Plan sin apply (verificación local)

Ejemplo con variables placeholder (sin guardar secretos en disco):

```bash
cd infra/terraform
export TF_VAR_do_token="REPLACE_WITH_DIGITALOCEAN_API_TOKEN"
export TF_VAR_ssh_fingerprint="REPLACE_WITH_DO_SSH_KEY_FINGERPRINT"
terraform plan -input=false
```

En un clon **sin estado/import** del droplet de producción, un `plan` puede proponer recursos nuevos (p. ej. DNS). Tras `terraform import` del droplet existente, el diff debe alinearse con la realidad. **Última corrida de referencia (2026-04-06):** `Plan: 3 to add, 0 to change, 0 to destroy` con tokens placeholder y estado local del entorno de desarrollo — no usar como verdad de producción.

## TODO (Fase 2)

- Migrar el **backend** de `local` a **DigitalOcean Spaces** (u otro remoto con locking) y documentar `terraform init -migrate-state` para trabajo en equipo.
