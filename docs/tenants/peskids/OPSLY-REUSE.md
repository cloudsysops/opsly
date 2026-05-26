---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# Peskids — qué reutilizar de Opsly

Mapa práctico para no duplicar el monorepo. **No** significa importar todo el portal en `apps/peskids` de golpe.

## Ya conectado hoy

| Capacidad Opsly | Dónde vive | Uso en Peskids |
|-----------------|------------|----------------|
| Leads / feedback públicos | `apps/api` → `POST /api/public/tenants/peskids/leads` | Smoke + forms HTML en API |
| Event bus (opcional) | `apps/orchestrator` + `NEXT_PUBLIC_OPSLY_EVENT_BUS_URL` | Encolar eventos `lead.created` |
| Supabase `platform` | Mismo proyecto que Opsly | `apps/peskids` service role + tablas tenant |
| n8n tenant | `n8n_peskids` + workflows `.n8n/1-workflows/peskids/` | WhatsApp inbound → `/api/webhooks/inbound` |
| Doppler | `ops-intcloudsysops/prd` | `runtime/peskids.env` en VPS |
| Traefik | `infra/traefik/dynamic/peskids.yml` | `peskids.op-sly.com` |
| Tenant invite / recovery | `apps/peskids/lib/auth-recovery.ts`, `/invite/[token]`, `/admin/login` | Invitación y recuperación separadas por tenant; no usar el portal como fallback de staff |

## Módulos `lib/*` recomendados (cuando crezca el producto)

| Módulo | Reutilizar para | No usar aún si… |
|--------|-----------------|-----------------|
| `@intcloudsysops/errors` | Respuestas API uniformes en rutas nuevas | MVP solo con handlers locales |
| `@intcloudsysops/observability` | Logs JSON en workers/webhooks | Solo landing estática |
| `@intcloudsysops/api-utils` | Formato `{ ok, data, error }` al exponer más APIs | Sin API pública nueva |
| `@intcloudsysops/security` | `redactPII` en logs de mensajes WhatsApp | No loguear PII en prod |
| `@intcloudsysops/services` | Repositorio multi-tenant si unificas DB con `apps/api/lib/peskids/repository.ts` | Duplicar repo está OK en incubación |
| `@intcloudsysops/config` | Feature flags por plan (`startup` / `business`) | Un solo tenant piloto |

Guía completa: [`docs/01-development/LIBRARY-MODULES.md`](../../01-development/LIBRARY-MODULES.md).

## Auth — Google y login de familias

| Pieza Opsly | Qué es en realidad | ¿Sirve para “login Google” en Peskids? |
|-------------|-------------------|--------------------------------------|
| `scripts/lib/google-auth.sh` | Service account / OAuth **Drive** y APIs Google Cloud | **No** — no es login de padres |
| `apps/portal` + Supabase Auth | Email + invitación (`signInWithPassword`, magic invite) | **Sí, patrón** — mismo Supabase project |
| Email invite / magic link en UI | **Implementado como patrón reusable** para familias | **Usar** en portal de familias / Peskids; el correo debe estar autorizado por alumno o reserva aprobada |

Pasos cuando pidan acceso de familias:

1. Pedir el correo con el que se registró la reserva o con el que ya existe el alumno.
2. Verificar que el correo coincida con `students.parent_email` o con una reserva `enrolled`.
3. Emitir un enlace seguro por Supabase Auth hacia `/auth/callback?next=/familias/submissions`.
4. Staff / profesores / soporte siguen por **invitación + contraseña**; para esos roles puede añadirse passkey/MFA, pero **no** compartir login con familias.
5. **No** copiar `NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN`; admin Peskids sigue con `DASHBOARD_ADMIN_SECRET`.
6. Cada invitación staff debe salir con `tenant_slug: peskids` explícito; si la metadata no coincide, corregirla antes de enviar.

## WhatsApp — Opsly vs web

| Capa | Opsly | Web Peskids (nuevo) |
|------|-------|---------------------|
| Conversaciones en panel | `POST /api/webhooks/inbound` + dashboard | Botón `wa.me` → chat del negocio |
| Automatización | n8n `peskids-whatsapp` (Baileys/Jelou) | No sustituye al botón público |
| Config | Doppler: `JELOU_*`, `PESKIDS_INBOUND_*` | `NEXT_PUBLIC_PESKIDS_WHATSAPP_E164` |
| Staff/admin auth | `DASHBOARD_ADMIN_SECRET` + sesión Supabase con rol/tenant | Reutilizable en repo propio para staff/support/teachers |

Ver [`WHATSAPP-CHANNEL.md`](./WHATSAPP-CHANNEL.md).

## Instagram

| Pieza | Ubicación |
|-------|-----------|
| Feed en landing | `apps/peskids` + `INSTAGRAM_POST_PERMALINKS` |
| Inbound mensajes | Mismo webhook que WhatsApp (futuro) |

Ver [`INSTAGRAM-FEED.md`](./INSTAGRAM-FEED.md).

## Qué no portar al clon Peskids

- `apps/admin` completo (métricas multi-tenant Opsly).
- LLM Gateway / MCP directo desde la landing (todo IA vía orchestrator si hace falta).
- `lib/content-studio` (generación de posts) — solo si producto pide Content Studio.

## Próximo incremento sugerido (orden)

1. Número WhatsApp real en Doppler → redeploy.
2. Permalinks Instagram en `INSTAGRAM_POST_PERMALINKS`.
3. Portal familias con Supabase Auth (email; Google opcional).
4. Unificar leads: solo `apps/api/lib/peskids` **o** solo tablas en schema `peskids` (evitar dos fuentes).

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
