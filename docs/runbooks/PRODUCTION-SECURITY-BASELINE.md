# Baseline de seguridad — producción (mínimo)

Checklist orientativa para operadores. **No** sustituye auditoría formal ni pentest.

## Red y acceso

- [ ] SSH administrativo **solo** por Tailscale (o política explícita documentada si hay excepción).
- [ ] UFW: `80/tcp` y `443/tcp` públicos; **no** exponer SSH a `0.0.0.0/0` salvo decisión explícita y rotación de claves.
- [ ] Cloudflare: proxy naranja en registros públicos del dominio de plataforma cuando aplique (ocultar IP de origen).

## Secretos

- [ ] Doppler `prd` (o fuente canónica): sin placeholders en `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL` / password, tokens de plataforma, Stripe, Resend.
- [ ] GitHub Actions: `TAILSCALE_AUTHKEY` (si deploy vía tailnet), `VPS_*`, `PLATFORM_DOMAIN`, build args `NEXT_PUBLIC_*` según `deploy.yml`.
- [ ] **No** volcar valores de secretos en issues, PRs ni logs de CI.

## Aplicaciones

- [ ] Admin: autenticación por sesión Supabase (sin token admin público en cliente).
- [ ] API: rutas portal con Zero-Trust (`tenantSlugMatchesSession` en segmentos `[slug]`); ver `docs/SECURITY_CHECKLIST.md`.

## Verificación rápida

```bash
./scripts/check-tokens.sh
```

(Desde entorno con Doppler o vars equivalentes; ver `docs/DOPPLER-VARS.md`.)
