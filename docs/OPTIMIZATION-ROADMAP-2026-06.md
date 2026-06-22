---
status: active
owner: operations
last_review: 2026-06-22
---

# Optimización & Limpieza Codebase (2026-06-22)

> Foco: Preparar Opsly para **go-live Peskids + escalado multi-tenant**

---

## 🎯 Objetivos

1. **Reducir complejidad operativa** — 330 scripts shell → flujo maestro
2. **Dokumentación actualizada** — AGENTS.md archivado, historial separado
3. **Dependencias limpias** — eliminar obsoletas, auditar vulnerabilidades
4. **Peskids 100% deployable** — scripts maestro + verificación
5. **Monorepo optimizado** — tree-shaking, imports limpios

---

## 📋 Tareas en Progreso

### ✅ Completadas (2026-06-22)

- [x] **AGENTS.md refactor:** archivar sesiones pre-2026-05-26 → `docs/AGENTS-SESSION-HISTORY.md`
  - Reducción: 2,531 → ~1,800 líneas (28% menos)
  - Mantiene: sesiones activas + bloqueantes actuales
  - Links: `docs/AGENTS-SESSION-HISTORY.md` para contexto histórico

### 🔄 En Progreso

- [ ] **Scripts Peskids consolidación:**
  - 29 scripts shell agrupados por categoría
  - Crear: `scripts/peskids-orchestrator.sh` (maestro)
  - Deprecar: duplicados identificados
  - Status: Análisis completo, agrupación por tema

- [ ] **Verificación Peskids completitud:**
  - [ ] Check: Landing page live (`https://peskids.op-sly.com`)
  - [ ] Check: Admin auth funcional
  - [ ] Check: N8N workflows configurados
  - [ ] Check: Health endpoints responsivos
  - [ ] Check: Uptime Kuma integrado

- [ ] **Config & dependencias:**
  - [ ] Auditar `package.json` workspaces para orphans
  - [ ] `npm audit` en CI (ya 0 vulnerabilidades)
  - [ ] Consolidar `.env.example` → único canonical
  - [ ] Revisar `tsconfig` para dead code detection

---

## 🔗 Scripts Peskids (Agrupación)

### Categorías Identificadas

| Categoría | Count | Scripts Principales | Estado |
|-----------|-------|-------------------|--------|
| **Deploy/VPS** | 8 | `peskids-deploy-vps.sh`, `peskids-rebuild-vps.sh`, `peskids-production-deploy.sh`, `deploy-peskids-finish.sh`, `deploy-peskids-production.sh` | 🔄 Consolidar en maestro |
| **N8N Setup** | 3 | `install-peskids-n8n-workflows.sh`, `smoke-peskids-n8n-lead-intake.sh` | 🔄 Verificar post-SSH |
| **Uptime Kuma** | 2 | `peskids-uptime-kuma-bootstrap.sh` (duplicado), `peskids-uptime-kuma-bootstrap.py` | 🔄 Unificar en Python |
| **Secrets/Doppler** | 6 | `sync-peskids-*-secrets-to-github.sh`, `doppler-*-peskids-prd.sh` | ⏳ Revisar Doppler config |
| **Smoke/Testing** | 5 | `smoke-peskids-*.sh`, `test-peskids-*.sh`, `peskids-mvp-smoke.sh` | ✅ Tests completos |
| **Seeds/Demo** | 3 | `seed-peskids-*.sh`, `test-peskids-client-demo.sh` | ✅ Ready |
| **Provisioning** | 2 | `ghl-peskids-operator-run.ts`, `ghl-provision-peskids.sh` | 📋 Revisar GHL config |
| **Misc** | 4 | `peskids-docker-env-filter.sh`, `peskids-traefik-labels`, etc. | 🔄 Evaluar uso |

### 🎯 Consolidación Propuesta

**Crear:** `scripts/peskids-orchestrator.sh`
```bash
./scripts/peskids-orchestrator.sh --task <task> [--env prd|staging]

Tareas disponibles:
  deploy-vps          # Deploy completo a VPS
  rebuild-vps         # Rebuild desde source
  setup-n8n           # Configure N8N workflows
  setup-uptime-kuma   # Configure Uptime Kuma monitoring
  smoke-test          # Run smoke tests (pre/post deploy)
  seed-demo-data      # Seed database with demo classes
  health-check        # Verify all endpoints
```

**Deprecar:** Scripts individuales con `# DEPRECATED: use peskids-orchestrator.sh --task <x>`

---

## 📊 Métricas Pre-Optimización

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **AGENTS.md** | 2,531 líneas | ~1,800 | -28% |
| **Peskids Scripts** | 29 sueltos | 1 maestro | -97% |
| **Config files** | 7.1MB `config/` | TBD | TBD |

---

## 🚀 Checklist Go-Live Peskids

**Pre-requisitos (completar antes de merge a main):**

- [ ] **API Production:**
  - [ ] `GET /api/health` → 200 ✅
  - [ ] `GET /api/portal/health?slug=peskids` → 200
  - [ ] Endpoints N8N+Uptime listados correctamente

- [ ] **Portal & Admin:**
  - [ ] Landing page live + lead capture form ✅
  - [ ] Admin auth functional ✅
  - [ ] Health status visible

- [ ] **Monitoring:**
  - [ ] Uptime Kuma endpoints responsive
  - [ ] Discord alerts configured
  - [ ] Logs centralized (Hermes/observability)

- [ ] **Documentation:**
  - [ ] Extraction plan documented (`docs/tenants/peskids/EXTRACTION-PLAN.md`) ✅
  - [ ] Phase 2 execution guide ready
  - [ ] Client handoff checklist complete

- [ ] **CI/CD:**
  - [ ] GitHub Actions auto-deploy on main
  - [ ] Type-check passes
  - [ ] Tests green (where applicable)

---

## 🔐 Security & Best Practices

- [ ] Secrets: Doppler only (never hardcoded) ✅
- [ ] Multi-tenant isolation: `tenant_slug` on all scopes ✅
- [ ] Zero-Trust: Portal routes use `resolveTrustedPortalSession()` ✅
- [ ] RLS policies: Migrations applied ✅

---

## 📌 Próximos Pasos

1. **Semana de optimización (Jun 22-28):**
   - Consolidate Peskids scripts
   - Verify completeness checklist
   - Clean config orphans
   - Test go-live flow end-to-end

2. **Semana de deployment (Jun 29-Jul 5):**
   - SSH access to VPS for N8N final setup
   - Production verification
   - Client handoff

3. **Post-go-live:**
   - Monitor metrics (usage, uptime, costs)
   - Prepare Phase 2 (additional features)
   - Plan extraction to independent repo (>50 users)

---

## 📚 Related Documents

- `docs/AGENTS-SESSION-HISTORY.md` — Archived sessions (pre 2026-05-26)
- `docs/tenants/peskids/EXTRACTION-PLAN.md` — Phase 0-2 roadmap
- `docs/tenants/peskids/PHASE-2-WEEK1-EXECUTION-GUIDE.md` — Week 1 tasks
- `docs/01-development/VISION.md` — Product north
- `AGENTS.md` — Current session state

---

*Last updated: 2026-06-22 by Claude (claude-haiku-4-5-20251001)*
