# Invitaciones — Runbook Admin

Guía operativa para enviar invitaciones al portal del tenant (staging/producción).

## Flujo completo

1. **Admin** llama `POST /api/invitations` con token de plataforma y cuerpo JSON válido.
2. La API valida tenant + coincidencia **email = `owner_email`** en `platform.tenants`.
3. Supabase `auth.admin.generateLink` (tipo `invite`) + ensamblado de URL portal.
4. **Resend** envía el email HTML (plantilla oscura en `lib/portal-invitations.ts`).
5. El usuario abre **`/invite/[token]?email=...`**, completa OTP/contraseña según flujo Supabase.
6. Acceso a **dashboard** en modo **developer** o **managed** (`POST /api/portal/mode`).

## Requisitos

| Requisito | Detalle |
|-----------|---------|
| Header admin | `Authorization: Bearer <PLATFORM_ADMIN_TOKEN>` o `x-admin-token` (mismo valor que en Doppler `prd`) |
| Tenant | Fila en `platform.tenants` con `slug` y `owner_email` |
| Email | Debe ser exactamente el `owner_email` del tenant (normalizado a minúsculas) |
| Resend | `RESEND_API_KEY` (clave activa en [resend.com](https://resend.com/api-keys)), y **`RESEND_FROM_EMAIL`** o **`RESEND_FROM_ADDRESS`** en Doppler → `.env` del contenedor API (tras `vps-bootstrap.sh`, recrear servicio `app`). Prueba sin dominio propio: `onboarding@resend.dev` (sujeto a políticas de la cuenta Resend). |
| Dominio portal | `PORTAL_SITE_URL` o `PLATFORM_DOMAIN` para construir `https://portal.${DOMAIN}` |

## Códigos de respuesta

| HTTP | Significado | Acción |
|------|-------------|--------|
| **200** | Invitación enviada | Cuerpo: `ok`, `tenant_id`, `link`, `email`, `token` (el token es el hash de la URL Supabase; tratar como secreto) |
| **400** | JSON inválido o falta `slug`/`tenantRef` | Revisar body Zod |
| **401** | Sin token admin o token incorrecto | `requireAdminToken` |
| **403** | Email ≠ `owner_email` del tenant | Usar email del owner registrado en Supabase |
| **404** | `slug` / `tenantRef` sin fila en `platform.tenants` | Verificar slug |
| **500** | Supabase `generateLink`, Resend, u otro error interno | Logs API (sin volcar tokens); Doppler + Resend dashboard |

## Ejemplo curl

Sustituye el token sin pegarlo en tickets públicos.

```bash
ADMIN_TOKEN="…"  # doppler secrets get PLATFORM_ADMIN_TOKEN --plain --project ops-intcloudsysops --config prd

curl -X POST "https://api.ops.smiletripcare.com/api/invitations" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d '{
    "email": "owner@smiletripcare.com",
    "tenantRef": "smiletripcare",
    "mode": "developer"
  }'
```

Campos opcionales: `name` (sobrescribe el nombre mostrado en el email; por defecto nombre del tenant), `slug` (alternativa a `tenantRef`).

## Troubleshooting

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|------------|
| **403 Forbidden** | Email no coincide con `owner_email` | Consultar `platform.tenants` por slug; alinear email en el POST |
| **404 Tenant not found** | Slug mal escrito o tenant borrado (`deleted_at`) | Verificar slug en Supabase |
| **500** + mensaje Resend | API key, dominio de envío, cuota | Dashboard Resend; `RESEND_API_KEY` / `RESEND_FROM_*` en Doppler `prd` + bootstrap VPS + `compose up --force-recreate app` |
| **500** + `API key is invalid` | Clave revocada, mal copiada o **placeholder corto** en Doppler (p. ej. solo `re_…` de 6 caracteres) | Clave **completa** desde [resend.com/api-keys](https://resend.com/api-keys); `./scripts/validate-config.sh` avisa si longitud &lt; 20; luego bootstrap VPS + recrear `app` |
| **500** + Supabase | `generateLink` rechazado (usuario existe, política, etc.) | Logs API; revisar usuario en Auth |
| **No llega el email** | Spam, bloqueo, remitente no verificado | Resend logs; probar otro buzón |
| **CORS en navegador** | Solo aplica si llamas la API desde browser | Invitaciones deben hacerse **server-side** o desde admin con origen permitido |

Comprobación en VPS (sin secretos en el comando interactivo):

```bash
docker logs opsly_portal 2>&1 | tail -50
# Si el servicio API tiene otro nombre de contenedor, ajustar (p. ej. stack del compose plataforma).
```

## UI admin

- Formulario en **`/invitations`** (ver `apps/admin/INVITATIONS_UI.md`).
- Listado de invitaciones pendientes requeriría nuevo modelo o integración con Supabase Auth.
