# =============================================================================
# dns.tf — Registros DNS en DigitalOcean (zona gestionada)
# =============================================================================
# Registro tipo A: asocia un nombre de host a una IPv4. Aquí apuntan subdominios
# de Opsly hacia la IP del droplet de producción (y staging cuando aplica).
#
# Wildcard (*.ops.smiletripcare.com): un solo registro A con nombre "*.ops" bajo la
# zona `smiletripcare.com` hace que cualquier subdominio de tercer nivel bajo ops
# resuelva a la misma IP (útil para tenants *.ops...). Verifica en el panel DO que
# la zona `dns_managed_zone` esté delegada a los nameservers de DigitalOcean.
# =============================================================================

# API pública de Opsly → IP del droplet de producción
resource "digitalocean_record" "api_ops" {
  domain = var.dns_managed_zone
  type   = "A"
  name   = "api.ops"
  value  = digitalocean_droplet.production.ipv4_address
  ttl    = 300
}

# Comodín para subdominios bajo *.ops.smiletripcare.com
resource "digitalocean_record" "wildcard_ops" {
  domain = var.dns_managed_zone
  type   = "A"
  name   = "*.ops"
  value  = digitalocean_droplet.production.ipv4_address
  ttl    = 300
}

# Staging solo si el droplet de staging existe (misma condición que count del droplet)
resource "digitalocean_record" "staging_ops" {
  count = var.create_staging ? 1 : 0

  domain = var.dns_managed_zone
  type   = "A"
  name   = "staging.ops"
  value  = digitalocean_droplet.staging[0].ipv4_address
  ttl    = 300
}
