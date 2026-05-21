---
status: canon
owner: infrastructure
last_review: 2026-05-21
---

# VPS Provisioning Standard

Standard de provisión para tenants extraídos de Opsly a infraestructura
dedicada.

## VPS Requirements

- Ubuntu LTS.
- Public IP or routed access through Cloudflare.
- Sufficient disk for app, backups, logs, and monitoring.
- SSH access only through approved secure path.
- Docker Engine and Docker Compose available.

## Docker Standards

- One Compose project per tenant.
- Traefik as edge router.
- Services declared declaratively in Compose.
- No ad hoc manual containers for production runtime.
- Healthchecks required for public services.

## Backup Standards

- Automated backups enabled from day one.
- Backups cover database, workflow state, and critical configs.
- Backup location must be external to the runtime host.
- Restore path must be documented before go-live.

## Security Baseline

- No public SSH exposure by default.
- Secrets kept out of repo and out of docs.
- Least privilege for service accounts.
- MFA required for administrative access.
- Tenant data isolated from Opsly core data.

## Monitoring Baseline

- Uptime Kuma for endpoint checks.
- Container health monitoring.
- Basic alerting for availability and backup failures.
- Logging retained long enough for support and incident review.

## Cloudflare Requirements

- DNS managed through Cloudflare when used.
- Proxy rules defined before public cutover.
- TLS termination consistent with Traefik routing.
- No DNS change without rollback path.

## Tailscale Requirements

- Tailscale is the preferred private operator path.
- Admin access should use Tailscale, not public SSH.
- Internal service access must stay private by default.

## MFA Requirements

- Admin access to tenant control surfaces requires MFA.
- Provider dashboards require MFA.
- Recovery procedures must account for MFA loss.

## Provisioning Outputs

Every provisioned VPS must include:

- runtime inventory.
- access model.
- backup plan.
- monitoring endpoints.
- service map.
- rollback path.

