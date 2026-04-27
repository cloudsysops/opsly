# Semana 6 — Segundo Cliente + Validación E2E

**Ventana:** 2026-04-29 → 2026-05-03 (estimado)  
**Objetivo:** Onboarding de segundo cliente real/homólogo + validación E2E completa  
**Punto de partida:** Semana 5 ✅ COMPLETO (feedback loop API operativo)

---

## 🎯 Criterio de Éxito

- ✅ Segundo tenant creado y funcionando (`POST /api/tenants`, schema estándar)
- ✅ Invitaciones enviadas y aceptadas por propietario del segundo tenant
- ✅ n8n + Uptime Kuma desplegados para tenant #2
- ✅ E2E flow validado: invite → sign-up → dashboard → stacks visibles
- ✅ Métricas y presupuestos presentes en admin `/admin/costs` para tenant #2
- ✅ Pre-Launch checklist completado (DNS, backups, Doppler vars)

---

## 📋 Tareas Principales

### Tarea 1: Preparación de Segundo Cliente

**Responsable:** CLI `onboard-tenant.sh`  
**Duración:** ~5 min

**Opciones:**

- **A) Staging test tenant:** Usar `localrank` o `jkboterolabs` (ya mencionados en AGENTS.md)
- **B) Cliente real:** Nuevo dominio cliente B pagador
- **C) Homólogo interno:** e.g. `test-opsly-internal` para validación sin cliente externo

**Comando:**

```bash
export PLATFORM_ADMIN_TOKEN="$(doppler run --config prd -- echo $PLATFORM_ADMIN_TOKEN)"
export NEXT_PUBLIC_APP_URL="https://api.ops.smiletripcare.com"  # O staging según env

./scripts/onboard-tenant.sh \
  --slug test-client-b \
  --email owner-b@example.com \
  --plan startup \
  --stripe-customer-id cus_... (opcional)
```

**Validaciones:**

- ✅ Tenant creado en `platform.tenants` Supabase
- ✅ Schema tenant creado (schema `test_client_b`)
- ✅ n8n container lanzado (`docker ps | grep n8n`)
- ✅ Uptime Kuma container lanzado
- ✅ Discord notificación: "Tenant test-client-b onboarded"

---

### Tarea 2: E2E Invite Flow Validation

**Responsable:** CLI `test-e2e-invite-flow.sh`  
**Duración:** ~10 min

**Precondiciones:**

- Segundo tenant creado (Tarea 1)
- `PLATFORM_ADMIN_TOKEN` disponible (Doppler)
- `NEXT_PUBLIC_APP_URL` apunta a ambiente de prueba

**Comando:**

```bash
export ADMIN_TOKEN="$(doppler run --config prd -- echo $PLATFORM_ADMIN_TOKEN)"
export OWNER_EMAIL="owner-b@example.com"  # Email owner del tenant #2

./scripts/test-e2e-invite-flow.sh \
  --api-url https://api.ops.smiletripcare.com
  # --dry-run si es primer intento
```

**Flujo validado:**

1. POST `/api/invitations` → invitación con JWT
2. GET `/api/invitations/{id}` → token verificable
3. Portal: `/invite/{token}` → formulario pre-relleno
4. POST `/api/invitations/{id}/activate` → usuario creado, sesión activa
5. GET `/api/portal/me` → perfil tenant #2 visible
6. GET `/api/portal/usage` → métricas (inicialmente 0)

**Checklist E2E:**

- ✅ Status 200 en POST invitations
- ✅ JWT en respuesta contiene tenant+email
- ✅ GET /invite/{token} renderiza sin error
- ✅ POST activate sin error (email válido)
- ✅ Portal dashboard accesible post-login
- ✅ Tenant slug visible en URL (`/tenant/test-client-b/...` si aplica)

---

### Tarea 3: Pre-Launch Checklist

**Responsable:** Manual + scripts de validación  
**Duración:** ~20 min

#### 3.1 Supabase + Backups

- [ ] Last backup timestamp recent (< 24h) en panel Supabase
- [ ] `scripts/backup-supabase.sh` ejecutable (si existe)
- [ ] Restore test: `supabase db reset` sin error en staging
- [ ] Doppler `prd` tiene `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL`

#### 3.2 DNS + Dominio

- [ ] CNAME / A records configurados para:
  - `api.ops.smiletripcare.com` → VPS IP (157.245.223.7)
  - `admin.ops.smiletripcare.com` → VPS IP
  - `portal.ops.smiletripcare.com` → VPS IP
  - Subdominio tenant #2 (si aplica)
- [ ] DNS propagado (verificar con `dig`)
- [ ] Cloudflare Proxy ON si activado en producción

#### 3.3 Doppler Configuration (`prd`)

**Variables críticas presentes:**

- [ ] `PLATFORM_DOMAIN` = `ops.smiletripcare.com`
- [ ] `PLATFORM_ADMIN_TOKEN` (SECRETO, >32 chars)
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `REDIS_URL` (VPS o external)
- [ ] `DISCORD_WEBHOOK_URL` (feedback/cost notifs)
- [ ] `RESEND_API_KEY` (invitaciones)
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY`
- [ ] `NOTEBOOKLM_ENABLED=true` (si Fase 2 activada)
- [ ] `OLLAMA_URL` + `OLLAMA_MODEL` (si Fase 2 activada)

**Verificación:**

```bash
doppler run --config prd -- ./scripts/check-tokens.sh
```

#### 3.4 Admin Access

- [ ] Admin portal operativo: `https://admin.ops.smiletripcare.com`
- [ ] `/admin/tenants` lista ambos clientes (smiletripcare + test-client-b)
- [ ] `/admin/costs` muestra presupuestos por tenant
- [ ] `/admin/metrics/llm` muestra usage por tenant
- [ ] Auth by Supabase session (no NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN expuesto)

#### 3.5 Discord Notifications

- [ ] Webhook URL válido en Doppler `prd`
- [ ] Test: `./scripts/test-notify-discord.sh "Test message"`
- [ ] Feedback decisions envían notificación (verificar en Slack/Discord)
- [ ] Cost approvals/rejections envían notificación

#### 3.6 Email (Resend)

- [ ] `RESEND_API_KEY` válido en Doppler
- [ ] Invitaciones pueden enviarse sin error
- [ ] Test: `POST /api/invitations` con email válido

#### 3.7 Stripe Integration

- [ ] `STRIPE_SECRET_KEY` presente en Doppler
- [ ] Webhook endpoint configurado (si aplica)
- [ ] Tenant #2 tiene `stripe_customer_id` en DB

#### 3.8 Logs & Observability

- [ ] `/opt/opsly/runtime/logs//` existe en VPS
- [ ] Compose logs accesibles: `docker compose logs --tail=100 app`
- [ ] LLM Gateway logs estructurados (request_id present)
- [ ] Orchestrator job logs persistidos

---

### Tarea 4: VPS Health & Performance

**Responsable:** SSH Tailscale + scripts  
**Duración:** ~10 min

```bash
ssh vps-dragon@100.120.151.91 << 'EOF'
  # Health checks
  docker ps --format "table {{.Names}}\t{{.Status}}"

  # Disk usage
  df -h | grep -E "/$|/opt"

  # Memory
  free -h

  # Load
  uptime

  # Traefik running
  curl -s http://localhost/api/health || echo "Traefik down"

  # Compose status
  cd /opt/opsly && docker compose ps
EOF
```

**Checklist VPS:**

- [ ] All core services running (app, admin, portal, orchestrator, redis, postgres)
- [ ] Disk usage < 80% (`/` y `/opt`)
- [ ] Load < 4 (normal en background tasks)
- [ ] Traefik health OK
- [ ] Redis accepting connections
- [ ] n8n containers para ambos tenants

---

### Tarea 5: Documentación & Runbooks

**Duración:** ~15 min

**Archivos a crear/actualizar:**

- [ ] `docs/SECOND-CLIENT-ONBOARDING.md` — paso a paso para próximos clientes
- [ ] `docs/PRE-LAUNCH-CHECKLIST.md` — lista de validación antes de prod
- [ ] `docs/INCIDENT-RUNBOOKS.md` — guías para problemas comunes
- [ ] `AGENTS.md` — actualizar sección 🔄 con Semana 6 completada

---

## 🔗 Dependencias y Bloqueantes

| Bloqueante                 | Estado                                    | Mitigación                              |
| -------------------------- | ----------------------------------------- | --------------------------------------- |
| Cloudflare Proxy OFF       | ⚠️ Si está OFF, IP 157.245.223.7 expuesta | Activar Proxy en dashboard CF           |
| Doppler `prd` missing vars | ⚠️ Si variables incompletas, deploy falla | Completar según checklist 3.3           |
| Supabase rate limits       | ⚠️ Si E2E muy agresivo                    | Usar `--dry-run` primero                |
| RESEND quota               | ⚠️ Si se agotan invitaciones diarias      | Verificar con equipo Resend             |
| Tailscale VPN              | ⚠️ Si no conecta, SSH imposible           | Verificar IP `100.120.151.91` reachable |

---

## 📊 Métricas de Validación

**Al completar Semana 6:**

| Métrica               | Target  | Validación                              |
| --------------------- | ------- | --------------------------------------- |
| Tenants activos       | ≥ 2     | `SELECT COUNT(*) FROM platform.tenants` |
| Invitaciones exitosas | 100%    | POST + activate sin error               |
| E2E flow time         | < 5 min | Timing end-to-end                       |
| API latency (p50)     | < 200ms | Gateway logs                            |
| Type-check            | PASS    | `npm run type-check`                    |
| Test suite            | PASS    | `npm run test --workspace=...`          |

---

## ⏱️ Timeline Estimado

| Tarea                         | Duración   | Status |
| ----------------------------- | ---------- | ------ |
| Tarea 1: Onboard T2           | 5 min      | ⏳     |
| Tarea 2: E2E Invite Flow      | 10 min     | ⏳     |
| Tarea 3: Pre-Launch Checklist | 20 min     | ⏳     |
| Tarea 4: VPS Health           | 10 min     | ⏳     |
| Tarea 5: Docs                 | 15 min     | ⏳     |
| **Total**                     | **60 min** | ⏳     |

---

## 🎬 Ejecución Autónoma (sin parar)

### Fase A: Setup (sin confirmación)

1. `onboard-tenant.sh --slug ... --email ... --plan ...`
2. Verificar `docker ps | grep n8n`
3. Verificar Supabase schema creado

### Fase B: E2E Validation (requiere confirmación si hay errores)

1. `test-e2e-invite-flow.sh --dry-run` (sin mutations)
2. `test-e2e-invite-flow.sh` (con POST invitations)
3. Validar 200 OK en todos los pasos

### Fase C: Checklist (manual)

1. Ejecutar script validación Doppler
2. SSH health checks
3. Completar checklist 3.x

### Fase D: Documentation (automático)

1. Crear `docs/SECOND-CLIENT-ONBOARDING.md`
2. Crear `docs/PRE-LAUNCH-CHECKLIST.md`
3. Actualizar `AGENTS.md` sección 🔄

---

**Próximo estado esperado:** Semana 6 ✅ COMPLETADO → Ready for Go-Live o siguiente sprint
