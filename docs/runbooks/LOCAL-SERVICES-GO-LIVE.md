# Runbook — Local Services (Equipa) en producción

**Marca comercial:** **Equipa** — limpieza de equipos y upgrade en campo (tenant técnico `local-services`).  
**Objetivo:** tenant productivo para **ofrecer el servicio** y validar automatizaciones (n8n, portal, API).

**Runbook genérico:** [`ONBOARDING-NEW-CLIENT.md`](ONBOARDING-NEW-CLIENT.md) (pre-requisitos, SSH Tailscale, Doppler).

---

## 1. Nombre y presencia

| Campo | Valor |
| ----- | ----- |
| Nombre en plataforma / invitaciones | `Equipa` (o `Equipa — Limpieza y upgrade` si preferís más largo en `platform.tenants.name`) |
| Slug (no cambiar tras onboard) | `local-services` |
| URLs públicas (staging típico) | `https://n8n-local-services.<PLATFORM_DOMAIN>` · `https://uptime-local-services.<PLATFORM_DOMAIN>` |

---

## 2. Checklist go-live

1. [ ] Dominio wildcard y Traefik OK (`dig` / health).
2. [ ] Doppler `prd` con secrets mínimos (Supabase, Resend si hay invitaciones, etc.).
3. [ ] Crear tenant (ejemplo con wrapper; ajustar email y plan):

```bash
./scripts/opsly.sh create-tenant local-services \
  --email "<OWNER_EMAIL>" \
  --plan startup \
  --name "Equipa" \
  --ssh-host 100.120.151.91
```

4. [ ] Verificar contenedores y URLs n8n + Uptime (mismo runbook de onboarding §3.2).
5. [ ] Invitación portal al owner (`POST /api/invitations` o flujo admin) — dominio Resend verificado si el email es externo.
6. [ ] Comprobar login portal y que `user_metadata.tenant_slug` = `local-services`.
7. [ ] (Opcional) Página pública de reserva cuando exista `apps/local-services` o ruta acordada en portal.
8. [ ] Documentar en `AGENTS.md` 🔄 que Equipa está **live** (fecha + entorno).

---

## 3. Oferta comercial (referencia)

Mensaje mínimo para clientes: *“Equipa — servicio de limpieza de equipos e instalación/upgrade en tu ubicación. Reserva y seguimiento vía Opsly.”* (Ajustar copy con marketing.)

---

## 4. Cursor / equipo

Prompts: `@.cursor/prompts/tenants/local-services/piloto-automatizaciones.md` + `@.cursor/prompts/local-services-tech-builder.md`.
