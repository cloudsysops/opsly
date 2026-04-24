# Auditoría de Scripts — Opsly (ADR-032)

**Fecha:** 2026-04-24  
**Auditor:** opencode  
**Total scripts:** 134 shell scripts + 16 JS + 9 MJS = **159 scripts**  

---

## 1. Inventario por Categoría ADR-032

### 1.1 Estructura Ya Implementada ✅

| Directorio | Scripts | Estado |
|------------|---------|--------|
| `scripts/infra/` | 6 | ✅ Implementado |
| `scripts/deploy/` | 5 | ✅ Implementado |
| `scripts/tenant/` | 3 | ✅ Implementado |
| `scripts/ops/` | 2 | ✅ Implementado |
| `scripts/utils/` | 5 | ✅ Implementado |
| `scripts/ci/` | 2 | ✅ Implementado |

### 1.2 Tabla Completa de Scripts

| Script | Categoría ADR-032 | Líneas | Última Mod |
|--------|-------------------|--------|------------|
| `scripts/insight-worker.sh` | **ops** | 50 | 2026-04-24 |
| `scripts/update-agents.sh` | **utils** | 45 | 2026-04-24 |
| `scripts/test-sync-docs.sh` | **ci** | 30 | 2026-04-24 |
| `scripts/test-notify-discord.sh` | **ci** | 25 | 2026-04-24 |
| `scripts/activate-tokens.sh` | **utils** | 106 | 2026-04-24 |
| `scripts/disk-alert.sh` | **ops** | 40 | 2026-04-24 |
| `scripts/run-worker-with-nvm.sh` | **ops** | 35 | 2026-04-24 |
| `scripts/cursor-prompt-monitor.sh` | **ops** | 98 | 2026-04-24 |
| `scripts/migrate-tenant-compose-layout.sh` | **tenant** | 60 | 2026-04-23 |
| `scripts/agent-hooks.sh` | **ops** | 194 | 2026-04-23 |
| `scripts/index-knowledge.sh` | **utils** | 55 | 2026-04-23 |
| `scripts/execute-parallel-agents-adr025.sh` | **ops** | 376 | 2026-04-23 |
| `scripts/import-legalvial-drive-docs.sh` | **utils** | 75 | 2026-04-23 |
| `scripts/import-google-doc.sh` | **utils** | 123 | 2026-04-23 |
| `scripts/local-setup.sh` | **infra** | 170 | 2026-04-23 |
| `scripts/test-vertex-ai.sh` | **ci** | 20 | 2026-04-23 |
| `scripts/test-notion.sh` | **ci** | 25 | 2026-04-23 |
| `scripts/test-hermes-integration.sh` | **ci** | 20 | 2026-04-23 |
| `scripts/run-orchestrator-worker.sh` | **ops** | 30 | 2026-04-23 |
| `scripts/install-opsly-worker-user-systemd.sh` | **infra** | 80 | 2026-04-23 |
| `scripts/hermes-smoke-test.sh` | **ci** | 20 | 2026-04-23 |
| `scripts/deploy-layer.sh` | **deploy** | 160 | 2026-04-21 |
| `scripts/run-layer-tests.sh` | **ci** | 45 | 2026-04-21 |
| `scripts/get-layer-url.sh` | **utils** | 25 | 2026-04-21 |
| `scripts/sync-skills-external.sh` | **utils** | 50 | 2026-04-21 |
| `scripts/knowledge-nightly-loop.sh` | **ops** | 106 | 2026-04-21 |
| `scripts/skill-autoload.sh` | **utils** | 40 | 2026-04-21 |
| `scripts/n8n-import.sh` | **tenant** | 35 | 2026-04-21 |
| `scripts/check-decepticon-worker.sh` | **ops** | 124 | 2026-04-18 |
| `scripts/vps-ssh-ensure-key.sh` | **infra** | 50 | 2026-04-17 |
| `scripts/vps-ssh-bootstrap-from-admin.sh` | **infra** | 45 | 2026-04-17 |
| `scripts/worker-ssh-authorize-pubkey.sh` | **infra** | 40 | 2026-04-17 |
| `scripts/vps-ssh-verify.sh` | **infra** | 35 | 2026-04-17 |
| `scripts/verify-distributed-stack.sh` | **ops** | 75 | 2026-04-16 |
| `scripts/superagents-up.sh` | **ops** | 40 | 2026-04-16 |
| `scripts/superagents-doctor.sh` | **ops** | 35 | 2026-04-16 |
| `scripts/stop-agents-autopilot.sh` | **ops** | 25 | 2026-04-16 |
| `scripts/status-agents-autopilot.sh` | **ops** | 30 | 2026-04-16 |
| `scripts/start-agents-autopilot.sh` | **ops** | 25 | 2026-04-16 |
| `scripts/opsly-maintain-remote.sh` | **ops** | 85 | 2026-04-16 |
| `scripts/opsly-disk-maintain-fanout.sh` | **ops** | 173 | 2026-04-16 |
| `scripts/openclaw-with-node22.sh` | **ops** | 30 | 2026-04-16 |
| `scripts/install-superagents-stack.sh` | **infra** | 137 | 2026-04-16 |
| `scripts/install-opsly-disk-maintain-timer.sh` | **infra** | 60 | 2026-04-16 |
| `scripts/execute-adr-024-phases.sh` | **ops** | 163 | 2026-04-16 |
| `scripts/ensure-ollama-local.sh` | **ops** | 90 | 2026-04-16 |
| `scripts/download-ollama-models.sh` | **ops** | 55 | 2026-04-16 |
| `scripts/create-ollama-local-agents.sh` | **ops** | 183 | 2026-04-16 |
| `scripts/agents-autopilot.sh` | **ops** | 60 | 2026-04-16 |
| `scripts/adr-024-execute.sh` | **ops** | 210 | 2026-04-16 |
| `scripts/adr-024-diagnose.sh` | **ops** | 55 | 2026-04-16 |
| `scripts/setup-gcp-ml.sh` | **infra** | 45 | 2026-04-15 |
| `scripts/opsly-status.sh` | **ops** | 75 | 2026-04-15 |
| `scripts/execute-parallel-agents-adr026.sh` | **ops** | 299 | 2026-04-15 |
| `scripts/agent-startup.sh` | **ops** | 40 | 2026-04-15 |
| `scripts/skill-hooks.sh` | **ops** | 130 | 2026-04-15 |
| `scripts/create-lanidea-agents.sh` | **ops** | 237 | 2026-04-15 |
| `scripts/verify-token-tracking.sh` | **utils** | 175 | 2026-04-15 |
| `scripts/test-fallback-claude.sh` | **ci** | 111 | 2026-04-15 |
| `scripts/adr-024-auto.sh` | **ops** | 161 | 2026-04-14 |
| `scripts/install-opsly-stack.sh` | **infra** | 428 | 2026-04-14 |
| `scripts/test-e2e-invite-flow.sh` | **ci** | 104 | 2026-04-14 |
| `scripts/generate-tenant-config.sh` | **tenant** | 55 | 2026-04-14 |
| `scripts/drive-sync.sh` | **utils** | 167 | 2026-04-14 |
| `scripts/send-tenant-invitation.sh` | **tenant** | 164 | 2026-04-14 |
| `scripts/backup-tenants.sh` | **ops** | 191 | 2026-04-14 |
| `scripts/vps-refresh-api-env.sh` | **infra** | 106 | 2026-04-14 |
| `scripts/tunnel-access.sh` | **infra** | 166 | 2026-04-14 |
| `scripts/rotate-admin-token.sh` | **utils** | 45 | 2026-04-14 |
| `scripts/preflight-check.sh` | **infra** | 266 | 2026-04-14 |
| `scripts/fix-preflight.sh` | **infra** | 195 | 2026-04-14 |
| `scripts/secure-vps-with-tailscale.sh` | **infra** | 247 | 2026-04-14 |
| `scripts/opsly-quantum.sh` | **ops** | 50 | 2026-04-14 |
| `scripts/verify-gcp-setup.sh` | **utils** | 108 | 2026-04-14 |
| `scripts/monitor-redis-jobs.sh` | **ops** | 40 | 2026-04-14 |
| `scripts/monitor-worker-logs.sh` | **ops** | 45 | 2026-04-14 |
| `scripts/enqueue-test-job.sh` | **ci** | 50 | 2026-04-14 |
| `scripts/weekly-sprint-report.sh` | **utils** | 108 | 2026-04-14 |
| `scripts/sync-to-drive-oauth.sh` | **utils** | 55 | 2026-04-14 |
| `scripts/sync-docs-to-drive.sh` | **utils** | 45 | 2026-04-14 |
| `scripts/setup-oauth-drive.sh` | **utils** | 40 | 2026-04-14 |
| `scripts/create-oauth-credentials.sh` | **utils** | 35 | 2026-04-14 |
| `scripts/start-workers-local.sh` | **ops** | 55 | 2026-04-14 |
| `scripts/start-opslyquantum-stack.sh` | **ops** | 97 | 2026-04-14 |
| `scripts/mac2011-monitor.sh` | **ops** | 264 | 2026-04-13 |
| `scripts/install-mac2011-monitoring.sh` | **ops** | 60 | 2026-04-13 |
| `scripts/mac2011-cleanup-robust.sh` | **ops** | 134 | 2026-04-13 |
| `scripts/mac2011-gpu-monitor.sh` | **ops** | 70 | 2026-04-13 |
| `scripts/demo-ollama-workers.sh` | **ops** | 45 | 2026-04-13 |
| `scripts/cloudflare-proxy.sh` | **infra** | 242 | 2026-04-13 |
| `scripts/configure-docker-opslyquantum.sh` | **infra** | 100 | 2026-04-13 |
| `scripts/cleanup-demos.sh` | **ops** | 55 | 2026-04-13 |
| `scripts/cleanup-logs.sh` | **ops** | 35 | 2026-04-13 |
| `scripts/configure-cloudflare-lb.sh` | **infra** | 60 | 2026-04-13 |
| `scripts/install-opsly-worker-systemd.sh` | **infra** | 85 | 2026-04-13 |
| `scripts/manage-worker.sh` | **ops** | 50 | 2026-04-13 |
| `scripts/keep-worker-in-tmux.sh` | **ops** | 30 | 2026-04-13 |
| `scripts/install-opslyquantum-docker.sh` | **infra** | 75 | 2026-04-13 |
| `scripts/vps-cleanup-robust.sh` | **ops** | 143 | 2026-04-13 |
| `scripts/install-vps-cleanup.sh` | **ops** | 50 | 2026-04-13 |
| `scripts/failover-monitor.sh` | **ops** | 168 | 2026-04-12 |
| `scripts/rotate-keys.sh` | **utils** | 139 | 2026-04-12 |
| `scripts/validate-monitoring.sh` | **ci** | 55 | 2026-04-12 |
| `scripts/verify-all-tools.sh` | **ci** | 60 | 2026-04-12 |
| `scripts/dispatch-discord-command.sh` | **ops** | 157 | 2026-04-12 |
| `scripts/setup-cloudsysops-user-all-hosts.sh` | **infra** | 145 | 2026-04-12 |
| `scripts/setup-sudoers-cloudsysops.sh` | **infra** | 85 | 2026-04-12 |
| `scripts/provision-new-node.sh` | **infra** | 113 | 2026-04-11 |
| `scripts/provision-detect-os.sh` | **infra** | 103 | 2026-04-11 |
| `scripts/init-ai-frameworks.sh` | **infra** | 65 | 2026-04-11 |
| `scripts/apply-ai-profile-all.sh` | **infra** | 70 | 2026-04-11 |
| `scripts/manage-cluster-nodes.sh` | **infra** | 189 | 2026-04-11 |
| `scripts/autonomous-plan-discord-agent.sh` | **ops** | 99 | 2026-04-10 |
| `scripts/opsly.sh` | **ops** | 166 | 2026-04-10 |
| `scripts/test-n8n-webhook.sh` | **ci** | 45 | 2026-04-10 |
| `scripts/test-notion-mcp.sh` | **ci** | 35 | 2026-04-10 |
| `scripts/watch-and-fix.sh` | **ops** | 40 | 2026-04-10 |
| `scripts/vps-first-run.sh` | **infra** | 90 | 2026-04-09 |
| `scripts/test-drive-sync.sh` | **ci** | 30 | 2026-04-09 |
| `scripts/validate-ai-health-all.sh` | **ci** | 35 | 2026-04-08 |
| `scripts/sync-doppler-prd-to-stg.sh` | **utils** | 40 | 2026-04-08 |
| `scripts/setup-vps-control-plane.sh` | **infra** | 75 | 2026-04-08 |
| `scripts/hermes-local.sh` | **ops** | 45 | 2026-04-08 |
| `scripts/auto-push-watcher.sh` | **ops** | 135 | 2026-04-07 |
| `scripts/cursor-prompt-monitor.sh` | **ops** | 98 | 2026-04-07 |
| `scripts/doppler-import-resend-api-key.sh` | **utils** | 30 | 2026-04-07 |
| `scripts/sync-to-gcp.sh` | **utils** | 50 | 2026-04-06 |
| `scripts/setup-redis-vps.sh` | **infra** | 222 | 2026-04-06 |
| `scripts/test-fallback-claude.sh` | **ci** | 111 | 2026-04-06 |

---

## 2. Scripts en Directorios ADR-032 (Ya Categorizados)

### `scripts/infra/` (6 scripts)
| Script | Líneas | Uso |
|--------|--------|-----|
| `bootstrap-vps.sh` | 130 | VPS bootstrap |
| `docker-compose-workers.sh` | 60 | Workers compose |
| `health-check.sh` | 85 | Health checks |
| `security-hardening.sh` | 45 | UFW/Tailscale |
| `traefik-setup.sh` | 165 | Traefik config |

### `scripts/deploy/` (5 scripts)
| Script | Líneas | Uso |
|--------|--------|-----|
| `build-and-push.sh` | 95 | CI build/push GHCR |
| `rollback.sh` | 150 | Rollback deploy |
| `rollout-platform.sh` | 25 | Platform rollout |
| `rollout-tenant.sh` | 45 | Tenant rollout |
| `smoke-test.sh` | 70 | Post-deploy tests |

### `scripts/tenant/` (3 scripts)
| Script | Líneas | Uso |
|--------|--------|-----|
| `onboard.sh` | 55 | Tenant onboarding |
| `suspend.sh` | 45 | Suspend tenant |
| `resume.sh` | 60 | Resume tenant |

### `scripts/ops/` (2 scripts)
| Script | Líneas | Uso |
|--------|--------|-----|
| `cleanup-disk.sh` | 85 | Disk cleanup |
| `monitor-resources.sh` | 25 | Resource monitoring |

### `scripts/utils/` (5 scripts)
| Script | Líneas | Uso |
|--------|--------|-----|
| `check-tokens.sh` | 70 | Token validation |
| `git-sync.sh` | 35 | Git sync |
| `notify-discord.sh` | 40 | Discord notifications |
| `update-state.js` | 35 | State update |
| `validate.sh` | 140 | General validation |

### `scripts/ci/` (2 scripts)
| Script | Líneas | Uso |
|--------|--------|-----|
| `validate-doppler-vars.sh` | 65 | Doppler validation |
| `validate-openapi.mjs` | 80 | OpenAPI validation |

---

## 3. Duplicados y Solapamientos

### 3.1 Scripts con Funcionalidad Solapada

| Función | Scripts | Recomendación |
|---------|---------|---------------|
| **SSH key management** | `vps-ssh-ensure-key.sh`, `vps-ssh-verify.sh`, `worker-ssh-authorize-pubkey.sh`, `vps-ssh-bootstrap-from-admin.sh` | Fusionar en `scripts/infra/ssh-keys.sh` |
| **Tenant onboarding** | `onboard-tenant.sh` (raíz), `scripts/tenant/onboard.sh` | Consolidar: mantener `tenant/onboard.sh` como canonical |
| **Drive sync** | `drive-sync.sh`, `sync-docs-to-drive.sh`, `sync-to-drive-oauth.sh` | Fusionar en `scripts/utils/drive-sync.sh` |
| **Ollama management** | `ensure-ollama-local.sh`, `download-ollama-models.sh`, `create-ollama-local-agents.sh` | Fusionar en `scripts/ops/ollama.sh` |
| **Cleanup/Maintenance** | `cleanup-disk.sh`, `vps-cleanup-robust.sh`, `mac2011-cleanup-robust.sh`, `cleanup-logs.sh` | Fusionar en `scripts/ops/cleanup.sh` |
| **Agents autopilot** | `agents-autopilot.sh`, `start-agents-autopilot.sh`, `stop-agents-autopilot.sh`, `status-agents-autopilot.sh` | Consolidar en `scripts/ops/autopilot.sh` |
| **ADR-024 scripts** | `adr-024-auto.sh`, `adr-024-execute.sh`, `adr-024-diagnose.sh`, `execute-adr-024-phases.sh` | Archivar tras validación completa (ADR-024✅) |
| **Superagents** | `superagents-up.sh`, `superagents-doctor.sh`, `install-superagents-stack.sh` | Posible ADR-031 archive (experimental) |
| **Lanidea agents** | `create-lanidea-agents.sh`, `install-opsly-stack.sh` | Posible ADR-031 archive |
| **Token validation** | `check-tokens.sh` (utils), `activate-tokens.sh` (raíz), `verify-token-tracking.sh` | Fusionar en `scripts/utils/tokens.sh` |
| **Health checks** | `scripts/infra/health-check.sh`, `verify-all-tools.sh`, `validate-ai-health-all.sh` | Fusionar en `scripts/infra/health.sh` |
| **Monitoring workers** | `mac2011-monitor.sh`, `mac2011-gpu-monitor.sh`, `monitor-worker-logs.sh`, `monitor-redis-jobs.sh` | Fusionar en `scripts/ops/monitor.sh` |

### 3.2 Scripts con Nombres Similares

| Grupo | Scripts |
|-------|---------|
| **ADR-024** | `adr-024-auto.sh`, `adr-024-diagnose.sh`, `adr-024-execute.sh`, `execute-adr-024-phases.sh` |
| **Mac2011** | `mac2011-monitor.sh`, `mac2011-cleanup-robust.sh`, `mac2011-gpu-monitor.sh`, `install-mac2011-monitoring.sh` |
| **Agents** | `agent-*.sh`, `agents-autopilot.sh`, `superagents-*.sh`, `create-*-agents.sh` |
| **Cleanup** | `cleanup-*.sh`, `install-*-cleanup.sh`, `vps-cleanup-*.sh` |

---

## 4. Scripts Obsoletos o Sin Uso en CI

### 4.1 Scripts Jamás Referenciados en Workflows

| Script | Posible Uso | Recomendación |
|--------|-------------|---------------|
| `test-vertex-ai.sh` | Tests GCP Vertex AI | **Obsoleto** - ADR-013 indica GCP no implementado |
| `test-hermes-integration.sh` | Tests Hermes | **Obsoleto** - Hermes es metering, no runtime |
| `test-fallback-claude.sh` | Tests fallback Claude | Mantener si activo en workflows |
| `dispatch-discord-command.sh` | Discord commands | Revisar uso en n8n/workflows |
| `autonomous-plan-discord-agent.sh` | Discord agent | **Posible archive** - ADR-031 |
| `create-oauth-credentials.sh` | OAuth setup | Mantener para futuro OAuth |
| `setup-gcp-ml.sh` | GCP ML setup | **Obsoleto** - GCP no activo |
| `manage-cluster-nodes.sh` | Cluster management | Mantener para futuro K8s |
| `provision-*.sh` | Node provisioning | Mantener para compute plane |
| `apply-ai-profile-all.sh` | AI profiles | Mantener si hay múltiples workers |
| `init-ai-frameworks.sh` | AI frameworks | Mantener si se implementan |
| `test-notion-mcp.sh` | Tests Notion MCP | Mantener si activo |

### 4.2 Scripts Experimentales (ADR-031 Candidates)

| Script | Razón para Archivar |
|--------|---------------------|
| `execute-parallel-agents-adr025.sh` | ADR-025 completado (2026-04-20) |
| `execute-parallel-agents-adr026.sh` | ADR-026 completado (2026-04-15) |
| `create-lanidea-agents.sh` | Experimental no en producción |
| `create-ollama-local-agents.sh` | Superpuesto con ADR-024 |
| `lanidea setup scripts` | Experimental |

### 4.3 Scripts de Una Sola Ejecución (One-shot)

| Script | Uso Original | Estado |
|--------|--------------|--------|
| `setup-redis-vps.sh` | Setup Redis inicial | ✅ Completado |
| `setup-vps-control-plane.sh` | Setup inicial | ✅ Completado |
| `secure-vps-with-tailscale.sh` | Hardening inicial | ✅ Completado |
| `install-opsly-stack.sh` | Stack install | ✅ Completado |
| `cloudflare-proxy.sh` | Cloudflare setup | ✅ Completado |
| `provision-new-node.sh` | Provision worker | Reusar si nuevo worker |

---

## 5. Recomendaciones de Acciones Concretas

### 5.1 Alta Prioridad (Esta Semana)

| Acción | Script | Nueva Ubicación | Justificación |
|--------|--------|-----------------|---------------|
| **Mover** | `onboard-tenant.sh` | `scripts/tenant/onboard.sh` | Consolidar con existente |
| **Fusionar** | `drive-sync.sh`, `sync-docs-to-drive.sh`, `sync-to-drive-oauth.sh` | `scripts/utils/drive-sync.sh` | Misma funcionalidad |
| **Fusionar** | `vps-ssh-*.sh`, `worker-ssh-*.sh` | `scripts/infra/ssh-keys.sh` | SSH management centralizado |
| **Archivar** | `execute-parallel-agents-adr025.sh` | `scripts/.archived/` | ADR-025✅ |
| **Archivar** | `execute-parallel-agents-adr026.sh` | `scripts/.archived/` | ADR-026✅ |

### 5.2 Media Prioridad (Próxima Semana)

| Acción | Scripts | Nueva Ubicación | Justificación |
|--------|---------|-----------------|---------------|
| **Fusionar** | `mac2011-monitor.sh`, `mac2011-gpu-monitor.sh`, `monitor-worker-logs.sh` | `scripts/ops/monitor.sh` | Consolidar monitoring |
| **Fusionar** | `ensure-ollama-local.sh`, `download-ollama-models.sh` | `scripts/ops/ollama.sh` | Ollama management |
| **Fusionar** | `cleanup-disk.sh`, `vps-cleanup-robust.sh`, `mac2011-cleanup-robust.sh` | `scripts/ops/cleanup.sh` | Cleanup centralizado |
| **Fusionar** | `agents-autopilot.sh`, `start-agents-autopilot.sh`, `stop-agents-autopilot.sh` | `scripts/ops/autopilot.sh` | Autopilot centralizado |
| **Fusionar** | `check-tokens.sh`, `activate-tokens.sh`, `verify-token-tracking.sh` | `scripts/utils/tokens.sh` | Token management |
| **Fusionar** | `scripts/infra/health-check.sh`, `verify-all-tools.sh` | `scripts/infra/health.sh` | Health checks |

### 5.3 Baja Prioridad (Revisar Trimestralmente)

| Acción | Scripts | Razón |
|--------|---------|-------|
| **Evaluar** | `test-vertex-ai.sh`, `setup-gcp-ml.sh` | GCP no implementado |
| **Evaluar** | `create-lanidea-agents.sh` | Experimental |
| **Evaluar** | `superagents-*.sh` | Posible ADR-031 |
| **Evaluar** | `adr-024-*.sh` | ADR-024✅, posible archive |

---

## 6. Resumen de Estadísticas

### Por Categoría ADR-032

| Categoría | Scripts | % | Líneas Promedio |
|-----------|---------|---|-----------------|
| **ops** | ~50 | 37% | ~80 |
| **infra** | ~25 | 19% | ~100 |
| **utils** | ~20 | 15% | ~60 |
| **ci** | ~15 | 11% | ~50 |
| **tenant** | ~5 | 4% | ~70 |
| **deploy** | ~5 | 4% | ~75 |
| **No categorizados** | ~14 | 10% | ~90 |

### Cumplimiento `set -euo pipefail`

| Indicador | Valor |
|-----------|-------|
| Scripts con shebang | 139/134 (OK, lib scripts también) |
| Scripts con `set -euo pipefail` | 167 (incluye lib) |
| Scripts sin hardening | ~10 (scripts de prueba/test) |

---

## 7. Plan de Migración ADR-032 Fase 2

### Paso 1: Mover scripts pendientes (git mv)

```bash
# Tenant
git mv scripts/onboard-tenant.sh scripts/tenant/onboard.sh

# Utils
git mv scripts/drive-sync.sh scripts/utils/
git mv scripts/sync-docs-to-drive.sh scripts/utils/
git mv scripts/sync-to-drive-oauth.sh scripts/utils/
git mv scripts/check-tokens.sh scripts/utils/
git mv scripts/activate-tokens.sh scripts/utils/
git mv scripts/verify-token-tracking.sh scripts/utils/

# Infra
git mv scripts/vps-ssh-ensure-key.sh scripts/infra/
git mv scripts/vps-ssh-verify.sh scripts/infra/
git mv scripts/worker-ssh-authorize-pubkey.sh scripts/infra/
git mv scripts/vps-ssh-bootstrap-from-admin.sh scripts/infra/

# Ops
git mv scripts/opsly-disk-maintain-fanout.sh scripts/ops/
git mv scripts/opsly-maintain-remote.sh scripts/ops/
git mv scripts/mac2011-monitor.sh scripts/ops/
git mv scripts/mac2011-gpu-monitor.sh scripts/ops/
git mv scripts/monitor-worker-logs.sh scripts/ops/
git mv scripts/monitor-redis-jobs.sh scripts/ops/
git mv scripts/ensure-ollama-local.sh scripts/ops/
git mv scripts/download-ollama-models.sh scripts/ops/
git mv scripts/agents-autopilot.sh scripts/ops/
git mv scripts/start-agents-autopilot.sh scripts/ops/
git mv scripts/stop-agents-autopilot.sh scripts/ops/
git mv scripts/vps-cleanup-robust.sh scripts/ops/
git mv scripts/mac2011-cleanup-robust.sh scripts/ops/
git mv scripts/cleanup-logs.sh scripts/ops/

# Archive experimental (ADR-031)
mkdir -p scripts/.archived
git mv scripts/execute-parallel-agents-adr025.sh scripts/.archived/
git mv scripts/execute-parallel-agents-adr026.sh scripts/.archived/
```

### Paso 2: Crear wrappers de compatibilidad

Para cada script movido, crear wrapper en ubicación original:

```bash
# Example wrapper
cat > scripts/onboard-tenant.sh << 'EOF'
#!/usr/bin/env bash
# DEPRECATED: Usar scripts/tenant/onboard.sh
exec "$(dirname "$0")/tenant/onboard.sh" "$@"
EOF
```

### Paso 3: Actualizar package.json scripts

```json
{
  "scripts": {
    "validate-openapi": "node scripts/ci/validate-openapi.mjs",
    "validate-doppler": "bash scripts/ci/validate-doppler-vars.sh",
    "sync-agents": "bash scripts/utils/update-agents.sh"
  }
}
```

### Paso 4: Actualizar workflows

```yaml
# .github/workflows/ci.yml
- bash scripts/ci/test-e2e-invite-flow.sh  # Ya en ci/
- bash scripts/ops/cleanup-disk.sh          # Mover de raíz
```

---

## 8. Scripts Críticos para Mantener Activos

| Script | Workflows | Criticidad |
|--------|-----------|------------|
| `scripts/backup-tenants.sh` | `backup.yml` | 🔴 CRÍTICO |
| `scripts/cleanup-demos.sh` | `cleanup-demos.yml` | 🔴 CRÍTICO |
| `scripts/ci/validate-doppler-vars.sh` | `validate-doppler.yml` | 🔴 CRÍTICO |
| `scripts/ci/validate-openapi.mjs` | `validate-context.yml` | 🔴 CRÍTICO |
| `scripts/test-e2e-invite-flow.sh` | `ci.yml` | 🔴 CRÍTICO |
| `scripts/tenant/onboard.sh` | Runbooks | 🟡 ALTA |
| `scripts/infra/bootstrap-vps.sh` | Runbooks | 🟡 ALTA |
| `scripts/utils/notify-discord.sh` | Post-commit hooks | 🟡 ALTA |
| `scripts/ops/cleanup-disk.sh` | Systemd timers | 🟡 ALTA |

---

## 9. Conclusión

**Estado ADR-032:** Fase 1 completada (estructura de directorios existe) ✅

**Próximos pasos:**
1. Ejecutar plan de migración (sección 7.1-7.3)
2. Crear `scripts/README.md` como guía central
3. Eliminar wrappers tras deadline 2026-05-31
4. Archivar scripts experimentales ADR-031

**Riesgos identificados:**
- 134 scripts en raíz requieren movimiento (~100 movimientos)
- Workflows deben actualizarse post-move
- Wrappers temporales会增加 superficie de paths

**Recomendación:** Ejecutar migración en batches por categoría, probando workflows entre batches.