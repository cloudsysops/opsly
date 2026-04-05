# =============================================================================
# variables.tf — Entradas del módulo (sin secretos en archivos del repo)
# =============================================================================
# Cómo pasar valores sin exponerlos en git:
# - Exporta TF_VAR_do_token y TF_VAR_ssh_fingerprint desde tu shell (o desde Doppler:
#   `export TF_VAR_do_token="$(doppler secrets get DO_TOKEN --plain ...)"`).
# - Nunca commitees terraform.tfvars con secretos; *.tfvars está en .gitignore.
# - En CI, usa secretos del proveedor (GitHub Actions secrets, etc.) como env TF_VAR_*.
# =============================================================================

variable "do_token" {
  description = "Token de API de DigitalOcean (Personal Access Token). Preferir variable de entorno TF_VAR_do_token poblada desde Doppler."
  type        = string
  sensitive   = true
}

variable "ssh_fingerprint" {
  description = "Fingerprint de la clave SSH ya registrada en la cuenta DigitalOcean (formato MD5 o SHA256 según panel/doctl). Se usa en ssh_keys del droplet; no sube la clave privada."
  type        = string
  sensitive   = true
}

variable "region" {
  description = "Región del datacenter DigitalOcean (slug, ej. nyc3)."
  type        = string
  default     = "nyc3"
}

variable "droplet_size" {
  description = "Slug del tamaño del droplet (ej. s-1vcpu-2gb)."
  type        = string
  default     = "s-1vcpu-2gb"
}

variable "create_staging" {
  description = "Si es true, crea el droplet de staging y el registro DNS staging.ops; si es false, count = 0 (no se crea ni se cobra)."
  type        = bool
  default     = false
}

variable "project_name" {
  description = "Prefijo de etiquetas y nombres lógicos para identificar recursos Opsly."
  type        = string
  default     = "opsly"
}

variable "dns_managed_zone" {
  description = "Dominio raíz gestionado en DigitalOcean DNS (donde viven los registros A). Debe existir en el panel DO y usar los NS de DigitalOcean."
  type        = string
  default     = "smiletripcare.com"
}

variable "production_droplet_name" {
  description = "Nombre del droplet de producción en DO (debe coincidir con el existente antes de import)."
  type        = string
  default     = "opsly-production"
}

variable "staging_droplet_name" {
  description = "Nombre del droplet de staging cuando create_staging = true."
  type        = string
  default     = "opsly-staging"
}
