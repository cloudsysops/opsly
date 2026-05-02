## PROTOCOLO — INICIO DE SESIÓN AUTÓNOMO

1. **Cargar skills automáticamente:**

   ```bash
   # Detectar skills para el contexto
   node scripts/skill-finder.js "inicio sesión" --autonomous
   ```

2. **Leer AGENTS.md** (URL raw abajo) — fuente de verdad operativa

3. **Leer VISION.md** — norte del producto

4. **Ejecutar checks en paralelo:**
   - VPS: `ssh vps-dragon@100.120.151.91 "docker ps --format '{{.Names}}\t{{.Status}}'"`
   - Doppler: `doppler run --project ops-intcloudsysops --config prd -- print-env | grep -E "DISCORD|RESEND|GITHUB|NOTEBOOKLM"`
   - Git: `git status && git log --oneline -3`

5. **Reporte de gaps** — si hay errores, parar y reportar

---

# Claude en Opsly — Sistema Autónomo

## Framework: OpenClaw

OpenClaw es el **framework de orquestación multi-agente** de Opsly. Ver `.openclaw.md` para configuración completa.

### Componentes OpenClaw

| Componente      | Puerto |
| --------------- | ------ |
| MCP Server      | 3003   |
| Orchestrator    | 3011   |
| LLM Gateway     | 3010   |
| Context Builder | 3012   |

## Sistema de Skills (Auto-activación)

**Regla central:** buscar skill existente primero; si no hay match adecuado, crear o extender skill por módulo usando `opsly-skill-creator`.

**Shared catalog para herramientas externas/internas:** `/mnt/skills/index.json` + `/mnt/skills/user/*` (publicar con `npm run skills:sync:external`).

### CLI de Skills

```bash
# Buscar skills por query
node scripts/skill-finder.js "crear api route"

# Modo autónomo (genera cadena)
node scripts/skill-finder.js "mcp tool oauth" --autonomous

# Auto-cargar skills
node scripts/skill-loader.js --context "deploy"

# Validar todos los manifests
bash scripts/skill-autoload.sh validate

# Hook de autoload
source scripts/skill-hooks.sh
skill_autoload "mi query"
```

### Índice de Skills (v3.0)

| Priority   | Skill                    | Category       | Usage                                      |
| ---------- | ------------------------ | -------------- | ------------------------------------------ |
| CRITICAL   | `opsly-context`          | bootstrap      | SIEMPRE al inicio de cualquier sesión      |
| CRITICAL   | `opsly-quantum`          | master         | Visión completa del monorepo + diagnóstico |
| CRITICAL   | `opsly-autonomous`       | autonomy       | Modo autónomo sin confirmación humana      |
| CRITICAL   | `opsly-skill-creator`    | tooling        | Crear/mejorar skills                       |
| HIGH       | `opsly-api`              | development    | Rutas en apps/api                          |
| HIGH       | `opsly-bash`             | development    | Scripts en scripts/                        |
| HIGH       | `opsly-frontend`         | development    | Portal, Admin, UI React                    |
| HIGH       | `opsly-supabase`         | database       | Migraciones SQL, RLS                       |
| HIGH       | `opsly-infra`            | infrastructure | Docker, Compose, VPS, deploy               |
| HIGH       | `opsly-llm`              | ai             | LLM Gateway, providers, cache              |
| HIGH       | `opsly-mcp`              | integration    | MCP OpenClaw tools                         |
| HIGH       | `opsly-tenant`           | operations     | Onboarding, suspensión, stacks             |
| HIGH       | `opsly-orchestrator`     | orchestration  | OAR, workflows, n8n                        |
| HIGH       | `opsly-billing`          | billing        | Stripe subscriptions, invoices             |
| HIGH       | `opsly-architect-senior` | architecture   | Diagnóstico, ADRs, riesgos                 |
| MEDIUM     | `opsly-agent-teams`      | orchestration  | BullMQ, colas paralelas                    |
| MEDIUM     | `opsly-qa`               | qa             | Testing, smoke, audit                      |
| MEDIUM     | `opsly-discord`          | notifications  | Notificaciones Discord                     |
| MEDIUM     | `opsly-feedback-ml`      | ai             | Feedback loop, decisiones ML               |
| MEDIUM     | `opsly-google-cloud`     | integration    | Google Cloud services                      |
| LOW        | `opsly-notebooklm`       | ai             | PDF→podcast (EXPERIMENTAL)                 |
| LOW        | `opsly-simplify`         | optimization   | Docker/Compose optimization                |
| DEPRECATED | `opsly-bootstrap`        | —              | Usar `opsly-context`                       |
| DEPRECATED | `opsly-architect`        | —              | Usar `opsly-architect-senior`              |

### Templates Reutilizables

```bash
# En skills/templates/
template-api-route.md      # Ruta API con tests
template-bash-script.md    # Script idempotente
template-mcp-tool.md       # Tool MCP con OAuth
template-migration.md      # Migración SQL
template-test.md           # Tests Vitest
```

## Autonomía — Reglas de Ejecución

### Sin Confirmar (Auto-ejecutar)

- Búsqueda y lectura de archivos
- Creación de archivos según templates
- Ejecución de `npm run type-check`
- Tests unitarios con `npm run test`
- Validaciones con `npm run validate-*`
- Git status/log (lectura)

### Con Confirmación Requerida

- Deploy a producción (`--prod`)
- `docker system prune --volumes`
- `terraform apply`
- Modificación de `.env` o Doppler
- Creación de migración SQL nueva
  -Cambios destructivos en Supabase
- Credentials en Doppler

### Escalation Automático

```
confidence < 0.3  →  Reportar y preguntar
intent = "deploy" →  Confirmar antes de ejecutar
domain = "unknown" → Solicitar contexto adicional
```

## URLs raw

- AGENTS.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
- VISION.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md

## Reglas Absolutas

- **NUNCA** K8s, Swarm, nginx (salvo ADR)
- **NUNCA** secretos en código
- **NUNCA** `any` en TypeScript
- **NUNCA** saltarse `validate-config.sh` antes de deploy
- **NUNCA** terraform apply sin plan
- **SIEMPRE** leer AGENTS.md al iniciar
- **SIEMPRE** git add + git commit tras cada tarea completada
- **SIEMPRE** usar OpenClaw como framework de trabajo
- **SIEMPRE** usar skill-finder para detectar skills necesarios

## Stack

| Servicio        | Puerto |
| --------------- | ------ |
| api             | 3000   |
| admin           | 3001   |
| portal          | 3002   |
| mcp             | 3003   |
| llm-gateway     | 3010   |
| orchestrator    | 3011   |
| context-builder | 3012   |

## Infraestructura

- VPS: `/opt/opsly` — SSH **solo Tailscale** `vps-dragon@100.120.151.91`
- IP pública: `157.245.223.7` (solo HTTP/HTTPS)
- Doppler: `ops-intcloudsysops` / `prd`
- Supabase: `jkwykpldnitavhmtuzmo`
- GitHub: `cloudsysops/opsly`

## División Roles

| Herramienta | Rol                                              |
| ----------- | ------------------------------------------------ |
| Claude (tú) | Arquitectura, decisiones, desbloqueos, autonomía |
| Cursor      | Ejecución, código, commits                       |
| AGENTS.md   | Memoria compartida entre sesiones                |

## agent_teams

Configuración de equipos de agentes (reemplaza `enable-flag.json`):

- **OrchestratorAgent**: coordina tareas vía BullMQ/Temporal
  - Modos: `queue-only` (VPS control plane), `worker-enabled` (remotos)
  - Estrategias OAR: ReAct, Plan-Execute, Reflection
  - Ver: `1-agent-teams/orchestrator.md`
- **OpsAgent**: onboarding, health checks, deployments
  - Ver: `1-agent-teams/ops-agent.md`
- **BillingAgent**: Stripe, metering, cost alerts
  - Ver: `1-agent-teams/billing-agent.md`
- **SecurityAgent**: Zero-Trust, access review
  - Ver: `1-agent-teams/security-agent.md`

**Configuración en VPS:**
```bash
# Control plane (VPS)
OPSLY_ORCHESTRATOR_MODE=queue-only

# Worker remoto (Mac 2011)
OPSLY_ORCHESTRATOR_MODE=worker-enabled
REDIS_URL=redis://100.120.151.91:6379
```

## Antes de Proponer Código

1. Verificar si existe en `lib/` → reutilizar
2. Función >50 líneas → dividir
3. Query Supabase → Repository pattern en `lib/repositories/`
4. Crear recurso → Factory pattern en `lib/factories/`
5. Números mágicos → `lib/constants.ts`

## Git Operations — Protocolo Obligatorio para TODOS los agentes

**⚠️ CRÍTICO:** Después de CADA tarea completada, SIEMPRE:

```bash
# 1. Revisar cambios
git status

# 2. Agregar cambios
git add -A

# 3. Commitear con mensaje descriptivo (en inglés)
git commit -m "feat(scope): descripción clara"
# Ejemplos:
#   git commit -m "feat(local-services): add migration for services, customers, bookings"
#   git commit -m "fix(api): resolve tenant isolation in quotes endpoint"
#   git commit -m "docs(adr): add ADR-037 multi-tenant architecture decision"

# 4. Pushear a rama asignada
git push origin <branch-name>
```

**Por qué:** 
- ✅ GitHub refleja siempre estado actual del código
- ✅ Fácil trackear progreso por commits
- ✅ Evita "cambios perdidos" cuando agentes rotan
- ✅ CI corre automáticamente en cada push

**APLICA A (sin excepciones):**
- ✅ Claude (AI en Claude Code)
- ✅ Cursor (AI en Cursor IDE)
- ✅ Codex (AI en Copilot)
- ✅ GitHub Copilot
- ✅ Cualquier agente externo que modifique código
- ✅ Cualquier script automatizado

**NO EXCEPTIONS:** Todo código que entre al repo debe pasar por: `git add → git commit → git push`

---

## Workflow Autónimo Típico

```bash
# 1. Detectar skills necesarios
node scripts/skill-finder.js "crear migration supabase" --autonomous

# 2. Cargar skills
node scripts/skill-loader.js --context "crear migration"

# 3. Implementar usando templates
# Copiar de skills/templates/template-migration.md

# 4. Validar
npm run type-check
npm run test --workspace=@intcloudsysops/api

# 5. COMMIT + PUSH (obligatorio, no opcional)
git add -A
git commit -m "feat(supabase): nueva migration"
git push origin <branch-name>
```
