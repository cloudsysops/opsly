# =============================================================================
# outputs.tf — Valores útiles tras apply (IPs, etc.)
# =============================================================================
# Sirven para: copiar IP al portapapeles, enlazar con scripts, documentar en CI,
# o alimentar otros sistemas. No sustituyen a config/opsly.config.json para la app;
# son la “verdad” de Terraform en el momento del último apply.
# =============================================================================

output "production_ip" {
  description = "IPv4 pública del droplet de producción (VPS Opsly)."
  value       = digitalocean_droplet.production.ipv4_address
}

output "staging_ip" {
  description = "IPv4 del droplet de staging si create_staging = true; null si no existe."
  value       = var.create_staging ? digitalocean_droplet.staging[0].ipv4_address : null
}

output "production_droplet_id" {
  description = "ID numérico del droplet de producción en DigitalOcean (útil para import y soporte)."
  value       = digitalocean_droplet.production.id
}
