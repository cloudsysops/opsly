# Auditoría Doppler — `ops-intcloudsysops` / `prd` (2026-04-07)

**Metodología:** solo nombres de clave, sin valores. Regenerar la tabla tras cambios en el proyecto.

```bash
doppler secrets --project ops-intcloudsysops --config prd --only-names | wc -l
```

Última revisión automatizada: **49** claves listadas en consola.

## Rotación recomendada (política orientativa)

| Activo | Periodicidad sugerida | Notas |
|--------|----------------------|--------|
| PAT / `GHCR_TOKEN` | 90 días o al compromiso | GitHub → Fine-grained o classic `read:packages` |
| `PLATFORM_ADMIN_TOKEN` / `NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN` | Al exposición o trimestral | Mismo valor en ambos para admin browser |
| `STRIPE_*` | Según rotación Stripe | Webhooks y restricted keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Mínimo anual o si filtra | Rotación en dashboard Supabase |
| `RESEND_API_KEY` | Si filtra | Un solo key por entorno suele bastar |

## Inventario de claves (presencia)

**Leyenda:** ✓ = listada por Doppler en esta auditoría (no implica que el valor sea correcto en runtime).

| Clave | Presente (nombre) | Válido en runtime | Revisar rotación |
|-------|-------------------|-------------------|------------------|
| ACME_EMAIL | ✓ | Comprobar en Traefik/Let's Encrypt | Si cambia dominio |
| ADMIN_APP_IMAGE | ✓ | Imagen GHCR admin | Al cambiar registry |
| ADMIN_PUBLIC_DEMO_READ | ✓ | Bool compose/API | No crítico |
| APP_IMAGE | ✓ | Imagen GHCR API | Al cambiar registry |
| DB_URL | ✓ | Si se usa migraciones externas | Según DB |
| DISCORD_WEBHOOK_URL | ✓ | Opcional | Si filtra webhook |
| DOPPLER_CONFIG | ✓ | Metadato | No |
| DOPPLER_ENVIRONMENT | ✓ | Metadato | No |
| DOPPLER_PROJECT | ✓ | Metadato | No |
| FEATURE_FLAGS | ✓ | App | Según producto |
| GHCR_TOKEN | ✓ | PAT GHCR / login manual | **90 d** |
| GHCR_USER | ✓ | Usuario GH | Si cambia PAT |
| LOGGING | ✓ | App | No |
| NAME | ✓ | Metadato Doppler | No |
| NEXT_PUBLIC_API_URL | ✓ | Build admin/portal | DNS |
| NEXT_PUBLIC_APP_URL | ✓ | Opcional | DNS |
| NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN | ✓ | Browser admin | **Trimestral** |
| NEXT_PUBLIC_PLATFORM_DOMAIN | ✓ | Build | DNS |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✓ | Cliente | Si rotación Supabase |
| NEXT_PUBLIC_SUPABASE_URL | ✓ | Cliente | Si proyecto nuevo |
| PLATFORM_ADMIN_TOKEN | ✓ | API `x-admin-token` | **Trimestral** |
| PLATFORM_BASE_DOMAIN | ✓ | Fallback dominio | Alinear con PLATFORM_DOMAIN |
| PLATFORM_DOMAIN | ✓ | Canónico staging | DNS |
| PLATFORM_TENANTS_DIR | ✓ | Ruta en contenedor | VPS |
| PLATFORM_TENANTS_HOST_PATH | ✓ | Bind mount host | VPS |
| PRIVATE_KEY | ✓ | Si aplica integración | Muy sensible |
| REDIS_PASSWORD | ✓ | Redis compose | Si filtra |
| REDIS_URL | ✓ | API/worker | Si filtra |
| RESEND_API_KEY | ✓ | Invitaciones email | **Al filtrado** |
| S3_PREFIX | ✓ | Backups | No secreto |
| STRIPE_KEY | ✓ | Ver uso vs STRIPE_SECRET_KEY | Consolidar nombres |
| STRIPE_PRICE_* | ✓ | Precios Stripe | IDs públicos en dashboard |
| STRIPE_SECRET_KEY | ✓ | API Stripe | **Rotación Stripe** |
| STRIPE_WEBHOOK_SECRET | ✓ | Webhooks | **Rotación** |
| SUPABASE_SERVICE_ROLE_KEY | ✓ | API servidor | Muy sensible |
| SUPABASE_URL | ✓ | API | Proyecto correcto |
| TEMPLATE_PATH | ✓ | Onboarding | Repo |
| TENANTS_PATH | ✓ | Onboarding | VPS |
| TENANT_*_N8N_* | ✓ | Credenciales por tenant | Por tenant |
| TRAEFIK_DASHBOARD_BASIC_AUTH_USERS | ✓ | htpasswd | Si filtra |
| TRAEFIK_NETWORK | ✓ | Docker | No secreto |

Columna «Válido»: marcar manualmente tras `validate-config.sh` y un deploy verde.

## Próximos pasos

1. `doppler secrets get GO --plain` nunca en chat; usar siempre redirección a archivo local ignorado o `>/dev/null` para smoke.
2. Alinear nombres duplicados Stripe (`STRIPE_KEY` vs `STRIPE_SECRET_KEY`) si ambos existen en el mismo config.
3. Triggers de recordatorio en calendario para PAT GitHub y tokens admin.
