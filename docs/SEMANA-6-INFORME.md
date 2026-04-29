# Semana 6 Informe — Segundo Cliente + E2E Validation

**Fechas:** 2026-04-29 → 2026-05-03  
**Estado:** 🔄 EN PROGRESO  
**Sprint:** opsly (VPS) + Cursor/opencode  

## ✅ COMPLETADO

### 1. Recuperación de commits perdidos
- ✅ Recuperados 4 commits del reflog y pusheados a `origin/main`:
  - `c2b029c` feat(ops): rename cursor-prompt-monitor to billy-prompt-monitor  
  - `c2e75ba` refactor: rename cursor agent to billy across all files  
  - `d6ab214` feat(claude): improve .claude/ structure for Opsly
  - `cd38166` feat(n8n): replicate .claude/ structure for n8n autonomous agents

### 2. Fixes críticos  
- ✅ **"aggregate functions" error**: `apps/api/lib/repositories/billing-usage-repository.ts`  
  - Cálculo de SUM movido a código aplicativo (evita RLS restriction en Supabase)
  - Commit: `85d85fb fix: onboard script path and billing aggregate RLS error`
- ✅ **Onboard script**: fix `source` path en `scripts/tenant/onboard.sh`  
- ✅ **`.gitignore`**: añadido `logs/`, `tenants/` ignore rules
- ✅ **Traefik routing**: API pública `https://api.ops.smiletripcare.com/api/health` FUNCIONANDO ✅
- ✅ **E2E test script**: `test-e2e-invite-flow.sh` acepta `PLATFORM_ADMIN_TOKEN` ✅

### 3. Segundo Cliente Onboarded ✅
- ✅ **jkboterolabs** (JK Botero Labs) - slug `jkboterolabs`, plan `startup`
  - n8n: `https://n8n-jkboterolabs.ops.smiletripcare.com/` ✅
  - Uptime Kuma: `https://uptime-jkboterolabs.ops.smiletripcare.com/` ✅
- ✅ **localrank** (LocalRank) - slug `localrank`, plan `startup`  
  - n8n: `https://n8n-localrank.ops.smiletripcare.com/` ✅
  - Uptime Kuma: `https://uptime-localrank.ops.smiletripcare.com/` ✅

### 4. Infraestructura Validada
- ✅ **API**: `{"status":"ok","checks":{"supabase":"ok","redis":"ok"}}` (via Traefik HTTPS)
- ✅ **LLM Gateway**: `{"status":"ok","service":"llm-gateway"}` (puerto 3010)
- ✅ **Redis**: `PONG` (con autenticación)
- ✅ **Docker containers**: 12 tenant containers UP (6 n8n + 6 Uptime Kuma)
- ✅ **Traefik**: HTTPS + Let's Encrypt + TLS terminator

## ⚠️ EN PROGRESO

### E2E Validation (parcial)
- ✅ Health check: `https://api.ops.smiletripcare.com/api/health` → 200 OK
- ⚠️ **POST /api/invitations**: falla 500 (dominio Resend no verificado)
  - Error: "You can only send testing emails to your own email address"
  - Requiere: verificar dominio `ops.smiletripcare.com` en Resend
  - Alternativa: usar `onboarding@resend.dev` (limitado a emails propios)

### Pre-Launch Checklist (pendiente)
- [ ] **DNS**: ✅ todos apuntan a `157.245.223.7` (verificado con `dig`)
- [ ] **Backups**: configurar `scripts/backup-tenants.sh` en cron
- [ ] **Doppler vars**: faltan `GOOGLE_CLOUD_PROJECT_ID`, `BIGQUERY_DATASET`, `VERTEX_AI_REGION` (Fase 10)
- [ ] **Cloudflare Proxy**: cambiar a naranja (ocultar IP pública)
- [ ] **UFW Firewall**: SSH solo Tailscale (`100.64.0.0/10`)
- [ ] **Resend dominio**: verificar `ops.smiletripcare.com` para envíos reales

## 📊 Métricas

| Métrica | Valor |
| -------- | ----- |
| Tenants activos | 7 (intcloudsysops, smiletripcare, localrank, jkboterolabs, peskids, legalvial, cp-1777120239) |
| Containers UP | 12 tenant containers (n8n + Uptime) |
| API health | ✅ 200 OK (HTTPS via Traefik) |
| LLM Gateway | ✅ healthy |
| Redis | ✅ PONG |
| Commits pusheados | 6 (4 recuperados + 2 fixes) |
| E2E tests | ⚠️ Parcial (health ✅, invitations ⚠️) |

## 🔄 Próximos pasos (días restantes)

1. **Verificar dominio Resend** → `ops.smiletripcare.com` (permitir invitaciones reales)
2. **E2E completo** → `test-e2e-invite-flow.sh` con email verificado
3. **Cloudflare Proxy ON** → ocultar IP VPS `157.245.223.7`
4. **UFW hardening** → SSH solo Tailscale `100.120.151.91`
5. **Backups automáticos** → cron + `scripts/backup-tenants.sh`
6. **Doppler vars Fase 10** → Google Cloud + BigQuery + Vertex AI

## 📝 Commits Semana 6

```bash
85d85fb fix: onboard script path and billing aggregate RLS error
9d13abb fix(api): calculate billing sum in app code to avoid RLS aggregate restriction  
cd38166 feat(n8n): replicate .claude/ structure for n8n autonomous agents
d6ab214 feat(claude): improve .claude/ structure for Opsly
c2e75ba refactor: rename cursor agent to billy across all files
c2b029c feat(ops): rename cursor-prompt-monitor to billy-prompt-monitor
```

**URL raw para próxima sesión:**  
https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
