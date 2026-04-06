# ADR-008 — Terraform en DigitalOcean (plan sin apply automático)

**Fecha:** 2026-04-06  
**Estado:** Aceptada

## Decisión

El código Terraform bajo `infra/terraform/` modela droplets y DNS en **DigitalOcean**. Los secretos `do_token` y `ssh_fingerprint` se pasan solo por **`TF_VAR_*`**, Doppler o un `terraform.tfvars` local **gitignored**; el archivo **`terraform.tfvars.example`** del repo contiene **placeholders** documentados.

Toda ejecución en producción requiere **`terraform plan`** revisado por un humano antes de cualquier **`apply`**; no hay apply automático desde CI para este módulo en la fase actual.

## Razones

- Alineado con ADR-003 (secretos fuera del repo)
- El droplet de producción puede requerir **`terraform import`** previo (ver README del módulo)
- Reduce riesgo de recreación accidental o borrado DNS

## Consecuencias

- `terraform plan` con tokens inválidos falla en autenticación con DO; es esperado en entornos de plantilla
- Estado local (`.tfstate`) no se commitea; para equipos grandes valorar backend remoto en fases posteriores
