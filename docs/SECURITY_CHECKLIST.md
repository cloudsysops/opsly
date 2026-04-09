# Security checklist — Opsly

Lista operativa para releases y revisiones periódicas. Marca ítems según tu proceso (PR template, runbook interno, etc.).

## Secretos y configuración

- [ ] Ningún secreto en Git (`git grep`, hooks, revisión de PR).
- [ ] Secretos solo en **Doppler** (config `prd` / `stg`); `.env` del VPS no se sube al repo.
- [ ] `PLATFORM_ADMIN_TOKEN`, `STRIPE_*`, claves Supabase **service** solo en backend; **anon** solo en front con RLS adecuado.
- [ ] Rotación tras exposición en logs, tickets o chat.
- [ ] PAT GitHub / GHCR con alcance mínimo (`read:packages` donde baste).

## Supabase

- [ ] RLS activo en tablas `platform.*` según migraciones (ver `0007_rls_policies.sql`).
- [ ] Nuevas tablas de plataforma: política explícita antes de exponer anon/authenticated.
- [ ] Service role key no expuesta en navegador ni en builds cliente.

## Red e infraestructura

- [ ] TLS activo en Traefik para dominios de producción.
- [ ] Firewall / security groups: solo puertos necesarios (22 restringido, 80/443 públicos según diseño).
- [ ] SSH por clave; sin contraseña root en producción.

## Dependencias

- [ ] `npm audit` en CI sin vulnerabilidades **high/critical** sin justificación documentada.
- [ ] Lockfile actualizado de forma controlada.

## Aplicación

- [ ] CORS en API acotado a orígenes conocidos (admin, portal).
- [ ] Webhooks Stripe validados con firma.
- [ ] Rate limiting / reCAPTCHA: evaluar según exposición pública (fase de producto).
- [ ] **Feedback portal (`POST /api/feedback`):** identidad solo vía `resolveTrustedFeedbackIdentity` → `resolveTrustedPortalSession` (`apps/api/lib/portal-trusted-identity.ts`) — JWT Supabase + fila `platform.tenants` + coincidencia `owner_email`; el cuerpo no sustituye `tenant_slug` / `user_email` (rechazo si discrepan). Reutilización de `conversation_id` validada en `verifyConversationBelongsToUser` (`lib/feedback/service.ts`). Tests: `lib/__tests__/portal-feedback-auth.test.ts`, `__tests__/feedback.test.ts`.
- [ ] **Portal `GET /api/portal/me` y `POST /api/portal/mode`:** misma sesión confiable (`resolveTrustedPortalSession`) antes de responder o mutar `user_metadata`; sin tenant/owner válidos → 401/403/404 como corresponda. Tests: `app/api/portal/__tests__/portal-routes.test.ts`, `lib/__tests__/portal-trusted-identity.test.ts`.
- [ ] **Portal `GET /api/portal/usage`:** solo métricas del tenant de la sesión (`resolveTrustedPortalSession` + `getTenantUsage`); no exponer otro tenant vía query/path. Tests: `app/api/portal/__tests__/portal-routes.test.ts`.
- [x] **`GET /api/portal/tenant/[slug]/usage`:** tras `resolveTrustedPortalSession`, validar con `tenantSlugMatchesSession(session, slug)`; mismo JSON que `GET /api/portal/usage` vía `respondPortalTenantUsage` (`lib/portal-usage-json.ts`). Tests: `app/api/portal/__tests__/portal-routes.test.ts`.
- [x] **`GET /api/portal/tenant/[slug]/me`:** mismo patrón; JSON compartido con `GET /api/portal/me` vía `respondTrustedPortalMe` (`lib/portal-me-json.ts`). Tests: `app/api/portal/__tests__/portal-routes.test.ts`.
- [x] **`POST /api/portal/tenant/[slug]/mode`:** `tenantSlugMatchesSession` antes de mutar; lógica compartida con `POST /api/portal/mode` vía `applyPortalModeUpdate` (`lib/portal-mode-update.ts`). Tests: `app/api/portal/__tests__/portal-routes.test.ts`.
- [x] **Portal cliente (`apps/portal`):** `tenantSlugFromUserMetadata` + `fetchPortalTenant` / `fetchPortalUsage` / `postPortalMode` con slug opcional solo refuerzan la URL; la autorización sigue siendo la API (`tenantSlugMatchesSession`). URLs en `lib/portal-api-paths.ts`. Referencia contrato (subset): `docs/openapi-opsly-api.yaml` (`/api/portal/usage`, `/api/portal/tenant/{slug}/me|mode|usage`). Tests portal: `lib/__tests__/tenant-metadata.test.ts`, `lib/__tests__/portal-api-paths.test.ts`, `lib/__tests__/invite-activation-validation.test.ts` (Vitest).

## Informes

- [ ] Revisar [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) y actualizar tras cambios mayores en RLS o dependencias.
