# =============================================================================
# backend.tf — Backend de estado y versión de Terraform
# =============================================================================
# Qué es el estado (terraform.tfstate): mapa de recursos reales ↔ recursos en .tf.
#   Sin él, Terraform no sabe qué crear, actualizar o destruir de forma incremental.
# Por qué NO va al repo: contiene IDs, a veces datos sensibles; además dos personas
#   con estados distintos provocan drift y desastres. Por eso terraform.tfstate y
#   .terraform/ están en .gitignore.
#
# Backend "local": el archivo terraform.tfstate vive en este directorio (disco local).
# Para equipo o CI, en Fase 2 migrar a backend remoto (p. ej. bucket en DigitalOcean
# Spaces con locking) y documentar el comando `terraform init -migrate-state`.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }

  # Estado local (no commitear). Ruta relativa a infra/terraform/
  backend "local" {
    path = "terraform.tfstate"
  }
}
