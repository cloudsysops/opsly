# =============================================================================
# main.tf — Proveedor DigitalOcean y droplets producción / staging
# =============================================================================

provider "digitalocean" {
  token = var.do_token
}

# -----------------------------------------------------------------------------
# Sobre digitalocean_ssh_key vs ssh_keys en el droplet
# -----------------------------------------------------------------------------
# El recurso `digitalocean_ssh_key` del proveedor sirve para **crear** una entrada
# nueva en la cuenta a partir del texto de una clave **pública**. Como el token y
# el fingerprint viven en Doppler y no queremos public keys en .tf, **no** usamos
# ese recurso aquí: los droplets referencian directamente el fingerprint ya dado
# de alta en DigitalOcean mediante el atributo `ssh_keys` (la API acepta ID numérico
# o fingerprint). Así evitamos duplicar la clave y cumplimos “fingerprint desde Doppler”.
# -----------------------------------------------------------------------------

locals {
  # Lista de fingerprints/IDs de SSH para nuevos droplets (staging). Producción tras
  # import puede tener sido creada con otra config; si tras import hay drift en ssh_keys,
  # revisar lifecycle o alinear en el panel.
  droplet_ssh_keys = compact([var.ssh_fingerprint])
}

# Droplet de PRODUCCIÓN — corresponde al VPS ya existente (157.245.223.7).
# Flujo: definir este bloque, luego `terraform import digitalocean_droplet.production <ID>`.
# No ejecutar apply que “reemplace” sin revisar el plan: el objetivo es gestionar DNS
# y opcionalmente staging sin recrear producción.
resource "digitalocean_droplet" "production" {
  name     = var.production_droplet_name
  region   = var.region
  size     = var.droplet_size
  image    = "ubuntu-24-04-x64"
  ssh_keys = local.droplet_ssh_keys

  tags = [var.project_name, "production", "opsly"]

  # Evita que un apply accidental cambie la imagen del droplet importado (datacenter
  # real puede tener disk/backups distintos). Ajusta solo si migras de imagen a propósito.
  lifecycle {
    ignore_changes = [image]
  }
}

# Droplet de STAGING — count = 0 salvo create_staging = true (ahorro y menos superficie).
resource "digitalocean_droplet" "staging" {
  count = var.create_staging ? 1 : 0

  name     = var.staging_droplet_name
  region   = var.region
  size     = var.droplet_size
  image    = "ubuntu-24-04-x64"
  ssh_keys = local.droplet_ssh_keys

  tags = [var.project_name, "staging", "opsly"]
}
