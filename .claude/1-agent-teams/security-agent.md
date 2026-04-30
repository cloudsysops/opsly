# SecurityAgent — Seguridad

Implementa políticas Zero-Trust y monitorea accesos. Ver `docs/SECURITY_CHECKLIST.md` y `AGENTS.md` (sección "🔒 Seguridad y Multi-Tenancy").

## Triggers
- Rutas `/api/portal/tenant/[slug]/*` → validar `tenantSlugMatchesSession`
- Cualquier ruta → verificar `resolveTrustedPortalSession`
- SSH IP pública → bloquear (solo Tailscale)
- Deploy → verificar `validate-config.sh` + Doppler secrets

## Acciones

### Zero-Trust Validation
```typescript
// apps/api/lib/portal-trusted-identity.ts
export function tenantSlugMatchesSession(session: any, slug: string): boolean {
  return session.tenant?.slug === slug;
}
```

### Network Security
```bash
# SSH solo Tailscale
ssh vps-dragon@100.120.151.91  # IP Tailscale, NO IP pública

# UFW Firewall
sudo ufw default deny incoming
sudo ufw allow from 100.64.0.0/10 to any port 22  # Tailscale only
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Secret Management
- **NUNCA** hardcodear secrets → usar Doppler (`ops-intcloudsysops` / `prd`)
- Validar: `./scripts/validate-config.sh` → "LISTO PARA DEPLOY"

## Checklist Rápido
- [ ] `validate-config.sh` → LISTO PARA DEPLOY
- [ ] Cloudflare Proxy ON (oculta IP VPS)
- [ ] SSH VPS solo por Tailscale (`100.120.151.91`)
- [ ] `npm run type-check` + `npm run lint` pasan

## Referencias
- `docs/SECURITY_CHECKLIST.md` — checklist completo
- `docs/SECURITY-MITIGATIONS-2026-04-09.md`
- `scripts/validate-config.sh`
- `AGENTS.md` — reglas absolutas y multi-tenancy
