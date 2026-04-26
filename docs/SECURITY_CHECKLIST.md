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

- [x] **CSP Headers implementados** — `apps/api/middleware.ts` (matcher `/api/:path*`; CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) — **2026-04-11**. _(Next.js resuelve el middleware en la raíz del app; no usar `apps/api/src/middleware.ts` en este repo.)_
- [ ] CORS en API acotado a orígenes conocidos (admin, portal).
- [ ] Webhooks Stripe validados con firma.
- [ ] Rate limiting / reCAPTCHA: evaluar según exposición pública (fase de producto).
- [ ] **Feedback portal (`POST /api/feedback`):** identidad solo vía `resolveTrustedFeedbackIdentity` → `resolveTrustedPortalSession` (`apps/api/lib/portal-trusted-identity.ts`) — JWT Supabase + fila `platform.tenants` + coincidencia `owner_email`; el cuerpo no sustituye `tenant_slug` / `user_email` (rechazo si discrepan). Reutilización de `conversation_id` validada en `verifyConversationBelongsToUser` (`lib/feedback/service.ts`). Tests: `lib/__tests__/portal-feedback-auth.test.ts`, `__tests__/feedback.test.ts`.
- [ ] **Portal `GET /api/portal/me` y `POST /api/portal/mode`:** misma sesión confiable (`resolveTrustedPortalSession`) antes de responder o mutar `user_metadata`; sin tenant/owner válidos → 401/403/404 como corresponda. Tests: `app/api/portal/__tests__/portal-routes.test.ts`, `lib/__tests__/portal-trusted-identity.test.ts`.
- [ ] **Portal `GET /api/portal/usage`:** solo métricas del tenant de la sesión (`resolveTrustedPortalSession` + `getTenantUsage`); no exponer otro tenant vía query/path. Tests: `app/api/portal/__tests__/portal-routes.test.ts`.
- [x] **`GET /api/portal/tenant/[slug]/usage`:** tras `resolveTrustedPortalSession`, validar con `tenantSlugMatchesSession(session, slug)`; mismo JSON que `GET /api/portal/usage` vía `respondPortalTenantUsage` (`lib/portal-usage-json.ts`). Tests: `app/api/portal/__tests__/portal-routes.test.ts`.
- [x] **`GET /api/portal/tenant/[slug]/me`:** mismo patrón; JSON compartido con `GET /api/portal/me` vía `respondTrustedPortalMe` (`lib/portal-me-json.ts`). Tests: `app/api/portal/__tests__/portal-routes.test.ts`.
- [x] **`POST /api/portal/tenant/[slug]/mode`:** `tenantSlugMatchesSession` antes de mutar; lógica compartida con `POST /api/portal/mode` vía `applyPortalModeUpdate` (`lib/portal-mode-update.ts`). Tests: `app/api/portal/__tests__/portal-routes.test.ts`.
- [x] **`GET /api/portal/health`** (público `?slug=`) y **`GET /api/portal/tenant/[slug]/health`** (JWT + `tenantSlugMatchesSession`): respuesta vía `respondPortalTenantHealth` (`lib/portal-health-json.ts`); OpenAPI + `REQUIRED_PORTAL_PATHS`. Tests: `app/api/portal/__tests__/portal-routes.test.ts`.
- [x] **Portal cliente (`apps/portal`):** `tenantSlugFromUserMetadata` + `fetchPortalTenant` / `fetchPortalUsage` / `postPortalMode` con slug opcional solo refuerzan la URL; la autorización sigue siendo la API (`tenantSlugMatchesSession`). URLs en `lib/portal-api-paths.ts`. Referencia contrato (subset): `docs/openapi-opsly-api.yaml` (portal incl. **`/api/portal/health`** y **`/api/feedback`**); CI valida YAML y paths obligatorios vía `npm run validate-openapi`. Tests portal: `lib/__tests__/tenant-metadata.test.ts`, `lib/__tests__/portal-api-paths.test.ts`, `lib/__tests__/invite-activation-validation.test.ts` (Vitest).

## 🔒 Evaluación de Seguridad Multi-Tenancy (2026-04-09)

### Respuesta corta al founder

Sí, el backend está **bien separado por tenant para la fase actual** (staging + pocos tenants), pero **no es aislamiento fuerte tipo VPC por tenant**. El modelo actual reduce mucho el riesgo de cruces lógicos (API/DB), mientras que los riesgos principales quedan en infraestructura compartida (VPS, Docker host, service-role global).

### Arquitectura Actual: Separación por Tenant

| Capa                         | Nivel de Aislamiento | Fortalezas                                                                                                                        | Riesgos Restantes                                                     | Mitigación Recomendada                                                                                              |
| ---------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Contenedores**             | Alto                 | Proyecto Docker separado (`--project-name tenant_<slug>`) por tenant; redes Docker internas aisladas                              | Kernel compartido en VPS; posibilidad de escape                       | ufw + reglas iptables; Tailscale solo para SSH (no IP pública); auditoría de CVEs Docker                            |
| **Base de Datos**            | Medio-Alto           | Schemas separados (`platform` + `tenant_<slug>`); RLS por tenant/user en `platform.*`                                             | Service role key global; exposición = acceso a todos los schemas      | Doppler secrets + rotación por exposición; auditar logs Supabase; considerar políticas de IP en Supabase Enterprise |
| **API / Backend**            | Alto                 | `tenantSlugMatchesSession(session, slug)` en todas rutas `[slug]`; 403 si no coincide; `resolveTrustedPortalSession` reutilizable | Misconfiguración CORS; olvido de validación en ruta nueva             | CORS orígenes explícitos; pre-commit ESLint para detectar sin validación; documentar patrón en ADR                  |
| **Red / Exposición**         | Medio                | Traefik v3 con reglas `Host(\`n8n-<slug>.ops.smiletripcare.com\`)` por subdominio; TLS obligatorio                                | IP pública del VPS visible; DNS A record sin Cloudflare Proxy         | Cloudflare Proxy (naranja ON) en todos `*.ops.smiletripcare.com` + WAF rules; registrar IPs VPS en Cloudflare       |
| **SSH / Admin**              | Bajo (Actual)        | `-`                                                                                                                               | SSH banner timeout; IP pública expuesta; sin restricción de origen    | SSH solo desde Tailscale (100.64.0.0/10); ufw default DROP; whitelist IPs Tailscale en VPS                          |
| **NotebookLM / Google Auth** | EXPERIMENTAL         | Feature flag `NOTEBOOKLM_ENABLED` (Business+ only); scope MCP `agents:write` admin-only                                           | Service account JSON o user OAuth credentials; Google API rate limits | Doppler secrets; test con cuenta sandbox; feature flag default OFF                                                  |

### Checklist Multi-Tenancy (2026-04-09)

#### Contenedores

- [x] Docker Compose por tenant: `--project-name tenant_<slug>` en `docker_compose()`
- [x] Redes Docker internas: `internal_network_<slug>` sin exposición a host network
- [x] ufw firewall: drop incoming por defecto; SSH solo Tailscale (`100.64.0.0/10`), HTTP/HTTPS público
- [x] Tailscale activo en VPS: SSH solo vía `100.120.151.91`
- [ ] **TODO:** Auditoría CVEs Docker: `docker scan` en pipeline CI

#### Base de Datos

- [x] RLS en `platform.tenants`, `platform.subscriptions`, `platform.usage_events` (migración 0007)
- [x] Schemas aislados: `platform` (global) + `tenant_<slug>` (por tenant)
- [x] Service role key solo en backend (Doppler `prd`)
- [ ] **TODO:** Logs Supabase: revisar accesos auth_failures, querys sospechosas
- [ ] **TODO:** Considerar IP whitelist en Supabase (si plan Premium disponible)

#### API / Backend

- [x] `tenantSlugMatchesSession` en 4 rutas: `/api/portal/tenant/[slug]/{me,usage,mode,health}`
- [x] `resolveTrustedPortalSession` = JWT + `platform.tenants.owner_email` match
- [x] CORS en middleware: orígenes explícitos (`NEXT_PUBLIC_ADMIN_URL`, `https://admin.${PLATFORM_DOMAIN}`)
- [x] Pre-commit: ESLint sin `any`, complejidad <15 en funciones críticas
- [ ] **TODO:** Revisar rutas nuevas: verificar que todas usan `tenantSlugMatchesSession` o equivalente
- [ ] **TODO:** Documentar patrón en ADR-002 o crear ADR-015 "Multi-Tenant API Security"

#### Red / Exposición

- [x] Traefik v3: reglas `Host()` por subdominio (`n8n-<slug>.ops.smiletripcare.com`)
- [x] TLS obligatorio vía Let's Encrypt + ACME
- [x] **HECHO:** Cloudflare Proxy (naranja ON) para todos `*.ops.smiletripcare.com`
  - Habilita WAF rules (Bots, SQL injection, XSS)
  - Cache TTL para assets estáticos
  - DDoS mitigation
  - Runbook: `docs/CLOUDFLARE-PROXY-ACTIVATION.md`

#### SSH / Admin

- [x] SSH **exclusivamente vía Tailscale** — `ssh vps-dragon@100.120.151.91` (IP pública bloqueada)
- [x] Script onboard: `SSH_HOST=${SSH_HOST:-100.120.151.91}` (Tailscale por defecto)
- [x] ufw firewall activo: SSH solo desde `100.64.0.0/10` (red Tailscale), HTTP/HTTPS público
- [x] `CF_DNS_API_TOKEN` en Doppler `prd` — Traefik dnsChallenge activo (docs: `CLOUDFLARE-PROXY-ACTIVATION.md`)
- [x] Traefik `api.insecure` eliminado (sin dashboard HTTP expuesto en `:8080`)

#### Secrets / Doppler

- [x] Doppler proyecto `ops-intcloudsysops`, config `prd`
- [x] `PLATFORM_ADMIN_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` en `prd` only
- [ ] **TODO:** `GOOGLE_SERVICE_ACCOUNT_JSON` para NotebookLM (si aplica)
- [ ] **TODO:** Rotación post-exposición: política clara, audit logs en Doppler

#### Tests / CI

- [x] `npm run test`: 155/155 passing (incluye portal + feedback security tests)
- [x] `npm run type-check`: 11/11 packages (TypeScript strict, sin `any`)
- [x] ESLint: 0 warnings en `apps/api`
- [ ] **TODO:** OWASP ZAP scan en CI (opcional, phase 2)

### Recomendaciones Inmediatas (Ordenadas por Prioridad)

#### 🔴 CRÍTICA (Esta noche - LocalRank pilot)

1. **Cloudflare Proxy** para `*.ops.smiletripcare.com`
   - Protege IP VPS pública
   - Habilita WAF rules para ataques comunes
   - Setup: 5 min en Cloudflare dashboard

2. **ufw Firewall en VPS**
   - Drop incoming por defecto
   - Whitelist SSH desde Tailscale range 100.64.0.0/10
   - Allow HTTP/HTTPS públicos

- Command recomendado: `./scripts/vps-secure.sh --ssh-host 100.120.151.91`

#### 🟡 IMPORTANTE (Esta semana)

3. **Tailscale SSH en VPS**
   - Instalación: `curl ... | sh`
   - Test SSH: `ssh vps-dragon@100.120.151.91` (IP Tailscale)
   - Desactivar acceso IP pública: `ufw delete allow 22/tcp`

4. **Documentar patrón Multi-Tenant en ADR**
   - Nueva ADR-015: "Multi-Tenant API Security Pattern"
   - Incluir `tenantSlugMatchesSession` obligatorio
   - Pre-commit checks

### Cambios concretos recomendados (middleware/scripts)

- **Script (implementado):** `scripts/vps-secure.sh` ahora elimina reglas SSH públicas (`allow 22/tcp`) y mantiene SSH solo por CIDR Tailscale.
- **Script (implementado):** `scripts/onboard-tenant.sh` admite `--ssh-host` y hace preflight SSH con 3 retries (`ConnectTimeout=15`).
- **Middleware/API (siguiente PR):**
  - añadir rate limit por IP + ruta para endpoints públicos (`/api/portal/health`, `/api/feedback`, `/api/invitations`) usando middleware edge o Traefik middleware dedicado;
  - checklist de seguridad obligatoria en nuevas rutas con segmento `[slug]` (`tenantSlugMatchesSession` requerido).
  - ~~CSP + cabeceras HTTP en API~~ — hecho **2026-04-11** (`apps/api/middleware.ts`).

#### 🟢 OPCIONAL (Fase 2+)

5. **OWASP ZAP scanning** en CI
6. **IP Whitelist en Supabase** (Enterprise plan)
7. **Auditoría de logs Supabase** vía Cloud Logging

---

## Informes

- [ ] Revisar [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) y actualizar tras cambios mayores en RLS o dependencias.
- [ ] **Nueva:** Auditoría de seguridad multi-tenancy (2026-04-09) — aplicar mitigaciones críticas antes de producción con múltiples tenants.
