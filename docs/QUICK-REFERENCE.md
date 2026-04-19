# Opsly — Quick Reference Card

> Cheatsheet para agentes. Todo lo que necesitás en una página.

---

## 🔒 SSH / Acceso VPS

```bash
# SIEMPRE por Tailscale — nunca IP pública
ssh vps-dragon@100.120.151.91

# IP pública (solo HTTP/HTTPS — bloqueada para SSH por UFW)
# 157.245.223.7
```

**VPS → workers (otros nodos):** clave en el VPS + pegar la pública en `authorized_keys` de cada worker; guía [`VPS-SSH-WORKER-NODES.md`](VPS-SSH-WORKER-NODES.md).

---

## 📍 URLs clave

| Servicio | URL |
|----------|-----|
| API | `https://api.ops.smiletripcare.com` |
| Admin | `https://admin.ops.smiletripcare.com` |
| Portal | `https://portal.ops.smiletripcare.com` |
| Health check | `https://api.ops.smiletripcare.com/api/health` |
| Traefik dashboard | `http://100.120.151.91:8080` (solo Tailscale) |

---

## 🤖 Agentes OpenClaw (autónomos)

Worker con `OPSLY_ORCHESTRATOR_MODE=worker-enabled` + Redis VPS + `LLM_GATEWAY_URL`. Ollama local: `./scripts/ensure-ollama-local.sh --ensure` o unidad `opsly-ollama.service`; en `.env.local` del worker `OPSLY_ENSURE_OLLAMA=1` para comprobar al arrancar. Arranque persistente: systemd `opsly-worker` (ver [`WORKER-SERVICE-MAC2011.md`](WORKER-SERVICE-MAC2011.md)). Runbook: [`AGENTS-AUTONOMOUS-RUNBOOK.md`](AGENTS-AUTONOMOUS-RUNBOOK.md), ADR-024.

```bash
# Salud del orchestrator en el worker (puerto 3011)
curl -sf http://127.0.0.1:3011/health
```

---

## ⚡ Comandos frecuentes

### Desarrollo local
```bash
# RTK — menos tokens en salidas de terminal (Cursor hooks): ver docs/RTK.md
# rtk --version   # ~/.local/bin/rtk tras install.sh oficial

npm run dev                          # Turbo: todos los servicios
npm run type-check                   # TypeScript 11 workspaces
npm run test --workspace=@intcloudsysops/api  # Tests API (241+)
npm run lint                         # ESLint (max-warnings 0 en API)
npm run validate-openapi             # Valida openapi-opsly-api.yaml
npm run validate-skills              # Valida skills manifests
```

### Deploy y VPS
```bash
# Acceder al VPS
ssh vps-dragon@100.120.151.91

# En el VPS: pull + restart
cd /opt/opsly && git pull origin main
cd infra && docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml pull
docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d --no-deps --force-recreate app admin portal

# Onboarding de tenant
./scripts/onboard-tenant.sh --slug <slug> --email <email> --plan startup --name "<Nombre>" --ssh-host 100.120.151.91 --yes

# Health check rápido
curl -sfk https://api.ops.smiletripcare.com/api/health
```

### Doppler
```bash
# Ver vars (sin imprimir valores)
doppler secrets --only-names --project ops-intcloudsysops --config prd

# Obtener var específica
doppler secrets get RESEND_API_KEY --project ops-intcloudsysops --config prd --plain

# Setear var
doppler secrets set VAR_NAME=value --project ops-intcloudsysops --config prd

# Descargar .env para VPS
doppler secrets download --no-file --format env --project ops-intcloudsysops --config prd > /opt/opsly/.env
```

### Supabase
```bash
npx supabase link --project-ref jkwykpldnitavhmtuzmo
npx supabase db push
npx supabase db push --dry-run   # preview sin aplicar
```

### Git / commits
```bash
git config core.hooksPath .githooks   # activar hooks (una vez por clon)
git add -A && git commit -m "tipo(scope): descripción"
# post-commit: type-check + ESLint + sync system_state + Discord + Drive
```

---

## 🏗️ Stack fijo (no proponer alternativas)

| Componente | Valor |
|------------|-------|
| Orquestación | Docker Compose por tenant |
| Proxy | Traefik v3 |
| DB plataforma | Supabase schema `platform` |
| DB por tenant | Schema `tenant_{slug}` |
| Secretos | Doppler proyecto `ops-intcloudsysops` config `prd` |
| Cola | Redis + BullMQ |
| Email | Resend |
| IA | LLM Gateway → Anthropic / OpenAI |
| TypeScript | Sin `any`, strict |
| Bash | `set -euo pipefail`, idempotente, con `--dry-run` |

---

## 🗂️ Estructura apps

```
apps/
├── api/          :3000  Control plane (Next.js API)
├── admin/        :3001  Dashboard admin
├── portal/       :3002  Portal cliente
├── mcp/          :3003  MCP tools (OpenClaw)
├── llm-gateway/  :3010  LLM proxy con cache/routing
├── orchestrator/ :3011  BullMQ workers
└── context-builder/:3012 Sesiones de agentes
```

---

## 🔑 Doppler vars críticas

| Var | Para qué |
|-----|----------|
| `SUPABASE_URL` | Cliente Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones admin |
| `STRIPE_SECRET_KEY` | Billing |
| `RESEND_API_KEY` | Emails (invitaciones) |
| `PLATFORM_ADMIN_TOKEN` | Rutas admin API |
| `DISCORD_WEBHOOK_URL` | Notificaciones |
| `GITHUB_TOKEN` | PAT GitHub (API: ACTIVE-PROMPT, etc.); preferido frente a `GITHUB_TOKEN_N8N` (legado) |
| `ANTHROPIC_API_KEY` | LLM gateway |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Drive sync |
| `REDIS_URL` | Cola + cache |
| `CRON_SECRET` | Cron endpoints protegidos |
| `DOCKER_GID` | GID grupo docker en VPS |
| `PLATFORM_DOMAIN` | Dominio base (ops.smiletripcare.com) |

---

## 🏃 Sprint actual

| Sprint | Estado | Commit |
|--------|--------|--------|
| Sprint 1 — Hardening + Stripe Checkout | ✅ | `feat(sprint1)` |
| Sprint 2 — Backups SHA256 + Health Monitor | ✅ | `feat(sprint2)` |
| Sprint 3 — Usage Billing + Plan Upgrade + AI Cost Caps | ✅ | `2644a03` |
| **Sprint 4 — Self-Healing + Context Persistence + CVE** | 🔄 | — |

### Sprint 4 — próximos archivos
```
apps/orchestrator/src/resilience/circuit-breaker.ts
apps/orchestrator/src/resilience/retry-policy.ts
apps/orchestrator/src/monitoring/worker-health-monitor.ts
apps/llm-gateway/src/fallback-chain.ts
apps/context-builder/src/persistence/
supabase/migrations/0019_agent_sessions.sql
.github/workflows/security.yml
```

---

## ❌ Decisiones fijas — nunca proponer

- Kubernetes / Docker Swarm
- nginx como reemplazo de Traefik
- Secretos en código o commits
- `vps-bootstrap` sin `validate-config` verde primero
- `terraform apply` sin `plan` revisado
- `vi.mock()` para módulos con singletons → usar DI (ADR-015)

---

## 📖 Si necesitás más detalle

→ `docs/README.md` — índice completo categorizado  
→ `AGENTS.md` — estado de sesión y decisiones  
→ `docs/SPRINT-ROADMAP.md` — roadmap 8 sprints  
→ `docs/adr/` — 15 decisiones de arquitectura
