# Opsly — Knowledge Base para Agentes IA

> **Última actualización:** 2026-04-14  
> ** NotebookLM ID:** `8447967c-f375-47d6-a920-c3100efd7e7b`  
> **Para agentes:** este documento es la **fuente de verdad** para cualquier sesión.

---

## 🏢 Qué es Opsly

**Opsly** es una plataforma multi-tenant SaaS que despliega y gestiona stacks de agentes autónomos (n8n, Uptime Kuma) por cliente, con facturación Stripe, backups automáticos y dashboard de administración.

- **Dominio:** ops.smiletripcare.com
- **IP VPS:** 157.245.223.7
- **Tailscale:** 100.120.151.91

---

## 🌐 Servicios y Estado

| Servicio     | Puerto | Status        | URL                          |
| ------------ | ------ | ------------- | ---------------------------- |
| Traefik      | 80/443 | ✅ Running    | —                            |
| API (app)    | 3000   | ⚠️ Error      | api.ops.smiletripcare.com    |
| Admin        | 3001   | ✅ Running    | admin.ops.smiletripcare.com  |
| Portal       | 3002   | ✅ Running    | portal.ops.smiletripcare.com |
| MCP          | 3003   | ✅ Running    | mcp.ops.smiletripcare.com    |
| Orchestrator | 3011   | ⏳ Restarting | —                            |
| Redis        | 6379   | ✅ Running    | —                            |

**Tenants activos:** smiletripcare, localrank, jkboterolabs, peskids, intcloudsysops

---

## 🎯 Skills Disponibles (15)

| Skill                    | Propósito                       | Cuándo usar               |
| ------------------------ | ------------------------------- | ------------------------- |
| `opsly-context`          | **SIEMPRE** al inicio de sesión | Contexto global + estado  |
| `opsly-quantum`          | Orquestación segura + scripts   | Jobs con costo control    |
| `opsly-architect-senior` | Diagnóstico arquitectónico      | Decisiones, ADRs          |
| `opsly-api`              | Rutas en apps/api               | Endpoints, validación     |
| `opsly-bash`             | Scripts en scripts/             | Automatización            |
| `opsly-llm`              | Llamadas vía LLM Gateway        | Sin llamadas directas     |
| `opsly-mcp`              | Tools MCP OpenClaw              | Herramientas para agentes |
| `opsly-supabase`         | Migraciones / SQL               | Base de datos             |
| `opsly-discord`          | Notificaciones                  | Discord webhooks          |
| `opsly-tenant`           | Onboarding / tenants            | Alta de clientes          |
| `opsly-agent-teams`      | BullMQ / TeamManager            | Equipos de agentes        |
| `opsly-feedback-ml`      | Feedback + ML                   | Clasificación             |
| `opsly-google-cloud`     | Google Cloud                    | Drive, BigQuery           |
| `opsly-notebooklm`       | NotebookLM                      | Generación artefactos     |
| `opsly-simplify`         | Docker & Compose                | Optimización              |

---

## ⚡ Comandos para Agentes

```bash
# Type-check all (Turbo)
npm run type-check

# Test single workspace
npm run test --workspace=@intcloudsysops/orchestrator

# BullMQ / worker — encolar job de prueba
doppler run --project ops-intcloudsysops --config prd -- ./scripts/test-worker-e2e.sh smiletripcare --notify

# Validate OpenAPI spec (CI required)
npm run validate-openapi

# Update repo state JSON
npm run update-state
```

---

## 🔧 Quick Reference VPS

```bash
# SSH (solo Tailscale)
ssh vps-dragon@100.120.151.91

# Estado contenedores
docker ps --format 'table {{.Names}}\t{{.Status}}'

# Logs de servicio
docker logs <container>

# Reiniciar servicio
docker restart <container>
```

---

## 📁 Estructura del Repo

```
apps/
├── api/              # Next.js API (control plane)
├── admin/            # Dashboard admin
├── portal/           # Portal cliente
├── mcp/              # OpenClaw MCP server
├── orchestrator/     # BullMQ + processIntent
├── ml/               # ML services
├── llm-gateway/      # LLM Gateway (cache/routing)
├── context-builder/  # Context Builder
└── agents/notebooklm/  # NotebookLM agent

scripts/              # Operación VPS
infra/               # Docker Compose, Traefik
docs/
├── adr/              # Decisiones arquitectura
├── runbooks/         # Runbooks operativos
└── KNOWLEDGE-SYSTEM.md  # Sistema de conocimiento
```

---

## 🔐 Reglas para Agentes

### SIEMPRE hacer:

- ✅ Incluir `tenant_slug` y `request_id` en cada job
- ✅ Usar `JOB_VALIDATION.isValidJob()` para validación
- ✅ Leer `AGENTS.md` al inicio de sesión
- ✅ Query inicial: "¿Cuál es el estado actual de Opsly?"

### NUNCA hacer:

- ❌ Hardcodear secrets, tokens o IPs en código
- ❌ Exponer SSH en IP pública (solo Tailscale)
- ❌ Llamadas LLM directas fuera de OpenClaw
- ❌ Crear carpetas raíz fuera de apps/

---

## 🚨 Errores Conocidos

1. **API Error:** `[id] !== [ref]` — carpeta duplicada `tenants/[ref]` vs `[id]` en imagen GHCR
   - Fix: eliminar `apps/api/app/api/tenants/[ref]` del repo y rebuildear

2. **Orchestrator:** reiniciando — espera rebuild CI (falta packages/ml en imagen anterior)

---

## 📚 Docs Clave

- [`AGENTS.md`](AGENTS.md) — Estado operativo
- [`VISION.md`](VISION.md) — Norte del producto
- [`ROADMAP.md`](ROADMAP.md) — Plan semanal
- [`docs/KNOWLEDGE-SYSTEM.md`](docs/KNOWLEDGE-SYSTEM.md) — Sistema de conocimiento
- [`docs/NOTEBOOKLM-SETUP.md`](docs/NOTEBOOKLM-SETUP.md) — Setup NotebookLM

---

## 🔗 URLsraw para Agentes

```
AGENTS.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
VISION.md: https://raw.githubusercontent.com/cloudsysops/opsly/main/VISION.md
context:   https://raw.githubusercontent.com/cloudsysops/opsly/main/context/system_state.json
```

---

## ✅ Checklist Inicio de Sesión Agente

1. [ ] Leer `AGENTS.md` (URL raw arriba)
2. [ ] Query NotebookLM: "¿Cuál es el estado actual de Opsly?"
3. [ ] Verificar estado de servicios (`docker ps`)
4. [ ] Aplicar fix si hay error conocido
5. [ ] Commit + push cambios al terminar

---

_Documento generado automáticamente — actualizar tras cada sesión._

### opsly-agent-teams

# Opsly Agent Teams Skill

## Cuándo usar

Al encolar trabajo paralelo por especialización (BullMQ) o al extender `TeamManager`.

## Implementación actual

- `apps/orchestrator/src/teams/TeamManager.ts`
- Colas `team:<nombre>`; configs: frontend, backend, ml, infra.
- `assignToTeam(taskType, payload)` elige team por `handles` del tipo de tarea.
- `infra-team` con `max_parallel: 1` (serial).
- Eventos: publicación en bus Redis (`publishEvent`); `index.ts` asigna `deploy` en `tenant.onboarded`.

## Asignación (patrón)

```typescript
await teamManager.assignToTeam('deploy', {
  tenant_slug: 'slug',
  /* payload mínimo */
});
```

Task types de ejemplo: `ui_fix`, `api_fix`, `deploy`, `model_update`, etc. (ver `TEAM_CONFIGS` en el archivo).

## Reglas

- Infra: no paralelizar cambios destructivos sin diseño explícito.
- UI: paralelizar fixes independientes con límite del team.
- ML: desacoplar de backend para no bloquear API crítica.

## Métricas admin

- `GET /api/metrics/teams` — configuración estática / estado (ver implementación actual en `apps/api`).

### opsly-api

# Opsly API Skill

## Cuándo usar

Al crear o modificar rutas en `apps/api/`.

## Plantilla para route handlers

En este monorepo las importaciones suelen ser **relativas** (`../../../lib/auth`), no `@/` (salvo que el paquete lo tenga configurado).

```typescript
// apps/api/app/api/[feature]/route.ts
import type { NextRequest } from 'next/server';
import { requireAdminToken } from '../../../lib/auth';
import { HTTP_STATUS } from '../../../lib/constants';

export async function GET(req: NextRequest): Promise<Response> {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  try {
    // lógica
    return Response.json({ data: {} });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    return Response.json({ error: message }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}
```

Para lectura pública en demo admin, usar `requireAdminTokenUnlessDemoRead` donde ya exista el patrón.

## Reglas

- Tipo de retorno explícito `Promise<Response>` en handlers exportados.
- Rutas admin: `requireAdminToken` o patrón demo documentado en `AGENTS.md`.
- Errores: mensaje seguro; códigos desde `HTTP_STATUS` en `lib/constants.ts`.
- Sin `any`.
- Si la función crece: extraer lógica a `lib/<feature>/`.

## Tests por ruta (Vitest)

- 200 con datos esperados (mocks Supabase/fetch).
- 401 sin token (cuando la ruta es protegida).
- 400 body inválido si aplica.
- 500 con error de DB mockeado si aplica.

### opsly-architect-senior

# Opsly — Arquitecto senior (diagnóstico y priorización)

## Cuándo usar

- Revisión de arquitectura antes de features grandes o cambios de infra.
- Priorizar bloqueantes operativos vs. deuda técnica.
- Preparar ADRs cuando el impacto sea medio/alto.
- **Después** de `opsly-context`: leer `AGENTS.md` y `VISION.md`; este skill no sustituye esas fuentes.

## Fuentes de verdad (no contradecir)

| Documento                         | Rol                                   |
| --------------------------------- | ------------------------------------- |
| `VISION.md`                       | Norte comercial y fases               |
| `AGENTS.md`                       | Estado operativo, bloqueantes, sprint |
| `ROADMAP.md`                      | Ventana semanal                       |
| `docs/IMPLEMENTATION-IA-LAYER.md` | Capa IA en TS                         |
| `docs/adr/`                       | Decisiones ya tomadas                 |
| `docs/SECURITY_CHECKLIST.md`      | Zero-Trust y rutas sensibles          |

## Decisiones fijas (innegociables en Opsly)

- Compose por tenant (no K8s/Swarm); Traefik v3; Doppler; Supabase `platform` + schema por tenant.
- Tráfico IA vía OpenClaw → LLM Gateway (sin LLM directo fuera de ese flujo).
- Incluir `tenant_slug` y `request_id` en jobs/orquestación cuando aplique.

## Marco mental (quick test)

1. **¿Es necesario para la fase actual y tenants reales?** Si no → roadmap, no esta semana.
2. **¿Qué rompe producción o validación de mercado si no se hace?** Seguridad perimetral, email/onboarding, pérdida de datos → antes que “nice to have”.
3. **¿Hay datos para decidir?** Si no → medir (métricas, load test, costo proveedor) antes de ADR.

## Bloqueantes recurrentes (validar en `AGENTS.md` 🔄)

Operativos típicos documentados en el repo:

- **Edge:** Cloudflare Proxy ON en registros del dominio de plataforma (ocultar origen); coherente con `VISION` / mitigaciones de seguridad.
- **Email:** Resend — dominio remitente verificado; sin eso, invitaciones fallan para correos fuera de sandbox.
- **SSH:** Solo Tailscale para administración; `docs/SECURITY-MITIGATIONS-*.md` y scripts tipo `vps-secure.sh` cuando aplique.
- **GCP vars:** Fase BigQuery/Vertex según checklist en AGENTS si el producto lo exige.

No listar secretos ni tokens en el análisis; usar `scripts/check-tokens.sh` y Doppler.

## Arquitectura validada (mantener)

- **Docker Compose por tenant:** simplicidad operativa hasta escala que justifique otro paso; escalar VPS antes que complejidad (alineado a `VISION.md`).
- **Traefik v3 + ACME:** TLS por subdominio; provider Docker; no migrar a nginx sin ADR.
- **Supabase + RLS + schemas:** transaccionalidad y aislamiento; coste proveedor revisar con volumen de tenants.
- **Redis + BullMQ:** throughput y simplicidad; riesgo = disponibilidad/persistencia — planificar snapshots/backup/runbook (ver `docs/ORCHESTRATOR.md`, infra Redis en compose), no sustituir por Kafka en esta fase sin ADR.
- **Doppler `prd`:** fuente de secretos; GitHub Actions según runbooks existentes.

## Deuda técnica frecuente (priorizar con datos)

- Aprobaciones de costos admin en memoria de proceso → persistencia cuando el negocio lo exija (`docs/COST-DASHBOARD.md`).
- E2E invite en CI → credenciales y secrets de GitHub; no bloquear merge por humo local mal configurado.
- Observabilidad distribuida (OTEL): diferir hasta que la latencia/debug multi-servicio lo justifique.

## Matriz de riesgo (plantilla)

| Riesgo | Probabilidad    | Impacto           | Mitigación      | Esfuerzo | Owner |
| ------ | --------------- | ----------------- | --------------- | -------- | ----- |
| …      | baja/media/alta | bajo/alto/crítico | acción concreta | h        |       |

## Roadmap 30 / 60 / 90 días (orientativo)

- **30 días:** Cerrar bloqueantes de AGENTS + ROADMAP semana activa; endurecer red/email; pruebas de flujo crítico.
- **60 días:** Automatización onboarding/stripe según `VISION`; persistencia de métricas/decisiones de costo si aplica.
- **90 días:** Escala horizontal solo si triggers de negocio/técnicos lo justifican (tenants, CPU, SLA); documentar en ADR antes de multi-VPS.

## ADRs candidatos (numerar al crear el archivo en `docs/adr/`)

- NotebookLM / herramientas experimentales: flag por plan, términos de servicio.
- Multi-VPS / failover: disparadores (tenants, carga, contrato enterprise).
- Estrategia vectorial: pgvector vs. servicio dedicado según volumen.
- Fine-tuning / modelos propios: solo con dataset y ROI claros.

## Checklist por sprint (arquitectura)

- [ ] `AGENTS.md` 🔄 actualizado al cierre de sesión.
- [ ] Cambios de contrato HTTP/OpenAPI reflejados en `docs/openapi-opsly-api.yaml` y CI `validate-openapi`.
- [ ] Rutas nuevas con patrón Zero-Trust (`tenantSlugMatchesSession` donde toque `[slug]`).
- [ ] Sin secretos en código ni en prompts pegados en issues.
- [ ] `npm run type-check` y tests del workspace tocado en verde.

## Salida esperada al usar este skill

1. Lista corta de **prioridades** (máx. 5) con referencia a archivos del repo.
2. **Riesgos** con mitigación y orden sugerido.
3. **ADRs** a crear o actualizar, si el cambio supera el umbral de “trivial”.

**Versión skill:** 1.0.0 · Revisar cuando cambie fase en `VISION.md` o cierre de sprint en `ROADMAP.md`.

### opsly-bash

# Opsly Bash Script Skill

## Cuándo usar

Al crear o modificar scripts en `scripts/`.

## Plantilla obligatoria

```bash
#!/usr/bin/env bash
# nombre-script.sh — descripción en una línea
# Uso: ./scripts/nombre-script.sh [--dry-run] [--skip-X]
#
# Variables requeridas (Doppler prd o export):
#   VAR_REQUERIDA — para qué sirve

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO  $*"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN  $*" >&2; }
die()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR $*" >&2; exit 1; }

main() {
  if $DRY_RUN; then
    log "DRY-RUN: pasos que se ejecutarían"
    return 0
  fi
  # ejecución real
}

main "$@"
```

## Reglas

- `set -euo pipefail` siempre.
- `--dry-run` cuando el script modifique infra o datos.
- Nunca secretos en el repo ni en `echo` de producción.
- **Nunca** `docker system prune --volumes` en producción sin runbook explícito.
- Helpers `log` / `warn` / `die` y `main` al final.
- Notificaciones Discord: `notify-discord.sh` debe poder hacer no-op si falta webhook (ya implementado en Opsly).

### opsly-context

# Opsly Context Skill

## Cuándo usar

**SIEMPRE** al inicio de cualquier sesión con Opsly, antes de escribir código, scripts o docs.

## Protocolo obligatorio

```bash
# 1. Fuentes de verdad (desde la raíz del repo)
cat AGENTS.md
cat VISION.md
cat docs/OPENCLAW-ARCHITECTURE.md

# 2. Estado VPS — acceso SOLO por Tailscale (nunca IP pública 157.245.223.7)
ssh vps-dragon@100.120.151.91 "
  systemctl is-active cursor-prompt-monitor opsly-watcher 2>/dev/null || true
  docker ps --format 'table {{.Names}}\t{{.Status}}' \
    | grep -E 'n8n|uptime|infra|traefik|mcp|gateway' || true
"

# 3. Tokens en Doppler (longitudes, sin volcar valores)
./scripts/check-tokens.sh

# 4. Últimos commits
git log --oneline -5
```

## Decisiones fijas (NUNCA proponer alternativas)

- Orquestación: docker-compose por tenant
- DB plataforma: Supabase schema `platform`
- Proxy: Traefik v3
- Secrets: Doppler `ops-intcloudsysops` / `prd`
- TypeScript: sin `any`
- Scripts: `set -euo pipefail`, idempotentes, `--dry-run` cuando aplique

## Stack

Next.js 15 · TypeScript · Tailwind · Supabase · Stripe · Docker Compose · Traefik v3 · Redis/BullMQ · Doppler · Resend · Discord · MCP · LLM Gateway

## Repos y paths

- GitHub: `cloudsysops/opsly`
- VPS: `/opt/opsly` · SSH `vps-dragon@100.120.151.91` (Tailscale · IP pública `157.245.223.7` solo para tráfico HTTP/HTTPS)
- Doppler: `ops-intcloudsysops` / `prd`

### opsly-discord

# Opsly Discord Notifications Skill

## Cuándo usar

Al notificar eventos operativos (deploy, errores, commits, monitor) sin filtrar secretos.

## Uso

```bash
./scripts/notify-discord.sh \
  "Título del evento" \
  "Descripción detallada (sin tokens ni passwords)" \
  "success|error|warning|info"
```

## Tipos

| Tipo      | Uso típico                       |
| --------- | -------------------------------- |
| `success` | Deploy OK, tarea completada      |
| `error`   | Fallo crítico, provider caído    |
| `warning` | Disco alto, degradación          |
| `info`    | Commit, sync, mensajes generales |

## Reglas

- **No** usar `secrets.*` dentro de `if:` en GitHub Actions para webhooks; comprobar webhook vacío en bash (patrón ya usado en Opsly).
- No incluir valores de secretos en título ni descripción.
- Webhook vacío → el script hace **no-op** con warning y **exit 0** (no romper hooks).

### opsly-feedback-ml

# Opsly Feedback ML Skill

## Cuándo usar

Al tocar el flujo de feedback de usuarios, decisiones ML o tablas `feedback_*` / `llm_feedback`.

## Flujo de alto nivel

1. Mensajes en `platform.feedback_conversations` / `feedback_messages`.
2. Motor: `apps/ml/src/feedback-decision-engine.ts` — `analyzeFeedback()` usando `llmCall` (gateway).
3. Decisiones en `platform.feedback_decisions` (`auto_implement`, `needs_approval`, `rejected`, `scheduled`).
4. Auto-implementación seguro: `write-active-prompt` / GitHub según `AGENTS.md`.
5. Aprobación humana: API `POST /api/feedback/approve` y panel admin.

## Auto-implement (solo cambios menores)

- Typos UI, estilos menores, textos de botón/error, enlaces en docs (lista exacta en el código del engine).

## Siempre `needs_approval` (o equivalente)

- Nuevas features, lógica de negocio, pricing, integraciones nuevas, seguridad, o `criticality === "critical"`.

## Datos para mejora continua

- `platform.conversations` / métricas de sesión cuando existan.
- `platform.llm_feedback` (rating + correction por mensaje).
- `platform.agent_executions` para trazabilidad de agentes.

## API / portal

- `apps/api/lib/feedback/`, `apps/portal/components/FeedbackChat*.tsx`, migraciones `0010` / `0011`.

### opsly-google-cloud

# Opsly Google Cloud Skill

## Cuándo usar

Al integrar cualquier servicio de Google Cloud en Opsly.

## Proyecto GCP

- Nombre: opsly-platform
- Sin organización (cuenta personal Gmail)
- Service Account: opsly-drive-sync
- Secret: `GOOGLE_SERVICE_ACCOUNT_JSON` en Doppler `prd`

## Obtener access token desde service account

```bash
# scripts/lib/google-auth.sh
get_google_token() {
  local SA_JSON
  SA_JSON=$(doppler secrets get GOOGLE_SERVICE_ACCOUNT_JSON \
    --project ops-intcloudsysops --config prd --plain 2>/dev/null)

  if [[ -z "$SA_JSON" ]]; then
    echo ""
    return 1
  fi

  # Generar JWT y obtener token
  # Ver scripts/lib/google-auth.sh para implementación completa
}
```

## APIs disponibles y cuándo usarlas

| API            | Cuándo                | Free tier         |
| -------------- | --------------------- | ----------------- |
| Drive API      | Sync docs             | 1B requests/día   |
| Sheets API     | Reportes              | 500 requests/100s |
| BigQuery       | Analytics > 100k rows | 1TB queries/mes   |
| Cloud Run      | Workers sin servidor  | 2M requests/mes   |
| Vertex AI      | Fine-tuning ML        | $300 créditos     |
| Speech-to-Text | Audio → texto         | 60 min/mes        |

## Reglas

- SIEMPRE service account (no OAuth personal)
- SIEMPRE token desde `GOOGLE_SERVICE_ACCOUNT_JSON`
- NUNCA hardcodear `project_id` (usar variable)
- Billing alert configurado en $10/mes
- Habilitar API antes de usar (`console.cloud.google.com`)

## Billing alert — configurar una vez

```
console.cloud.google.com
→ Billing → Budgets & Alerts
→ Create Budget
→ Amount: $10/mes
→ Alert at: 50%, 90%, 100%
→ Email: cboteros1@gmail.com
```

### opsly-llm

# Opsly LLM Gateway Skill

## Cuándo usar

Al hacer cualquier llamada a un LLM desde código del monorepo Opsly: **no** llamar Anthropic/OpenAI directamente desde features de plataforma; usar **`@intcloudsysops/llm-gateway`** (`llmCall`), salvo excepción documentada en ADR.

## Uso correcto

```typescript
import { llmCall } from '@intcloudsysops/llm-gateway';

const result = await llmCall({
  tenant_slug: 'mi-tenant',
  messages: [{ role: 'user', content: prompt }],
  model: 'haiku',
  temperature: 0,
  cache: true,
});
```

## Selección de modelo (orientativo)

| Tarea                          | Modelo                  | Notas                             |
| ------------------------------ | ----------------------- | --------------------------------- |
| Clasificar, extraer, formatear | `haiku`                 | Barato / rápido                   |
| RAG moderado                   | `haiku`                 | Subir a `sonnet` si falla calidad |
| Arquitectura / código complejo | `sonnet`                | Coste mayor                       |
| Feedback en tiempo real        | `haiku`, `cache: false` | Respuestas frescas                |

Detalle de proveedores, health daemon y batching: `docs/LLM-GATEWAY.md`.

## Caché

- `temperature: 0` + `cache: true` → uso intensivo de caché Redis (TTL configurable).
- `temperature > 0` o `cache: false` → menos o nada de caché.
- Feedback / clasificaciones que deben ser únicas → `cache: false` explícito.

## Infra

- Health daemon y circuit breaker están en `apps/llm-gateway` (ver documentación del repo).
- Variables: `docs/DOPPLER-VARS.md` y `AGENTS.md`.

### opsly-mcp

# Opsly MCP Tool Skill

## Cuándo usar

Al agregar o modificar tools del MCP OpenClaw en `apps/mcp/`.

## Plantilla de tool

```typescript
// apps/mcp/src/tools/mi-feature.ts
import { z } from 'zod';
import { opslyFetch } from '../lib/api-client.js';
import type { ToolDefinition } from '../types/index.js';

export const miTool: ToolDefinition<{ param: string }, { result: unknown }> = {
  name: 'nombre_tool',
  description: 'Qué hace, qué devuelve y cuándo usarla. Una o dos frases claras.',
  inputSchema: z.object({
    param: z.string().describe('Qué es este parámetro'),
  }),
  handler: async (input) => {
    const data = await opslyFetch(`/api/endpoint/${encodeURIComponent(input.param)}`);
    return { result: data };
  },
};
```

Registrar la tool en `apps/mcp/src/server.ts` (`registerTools` / `adaptTool`).

## Scopes OAuth (obligatorio al exponer la tool)

Los scopes por nombre de tool viven en **`apps/mcp/src/server.ts`** (`TOOL_REQUIRED_SCOPES`). Cada tool nueva debe tener entrada ahí, alineada con:

- `tenants:read` / `tenants:write`
- `metrics:read`
- `invitations:write`
- `executor:write`

OAuth / PKCE: `apps/mcp/src/auth/` y `docs/adr/ADR-009-openclaw-mcp-architecture.md`.

## Reglas

- `description` clara; `inputSchema` con `.describe()` por campo.
- Sin side effects no documentados (GitHub, Discord, Docker, etc.).
- Tests: mock de `opslyFetch` en `apps/mcp/__tests__/`.

### opsly-notebooklm

# Opsly NotebookLM Agent Skill

## Cuándo usar

Cuando un tenant necesite generar contenido a partir de documentos o investigación:

- PDFs → podcast + slides + infografía (workflow `report-to-podcast.py`)
- URLs / texto → fuentes en NotebookLM → quiz, chat, etc.
- Investigación web → resumen + importación de fuentes

Requiere `NOTEBOOKLM_ENABLED=true` y credenciales notebooklm-py (Google). **API no oficial** de Google.

## Acciones (TypeScript)

El paquete `@intcloudsysops/notebooklm-agent` expone `executeNotebookLM`:

```typescript
import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';

await executeNotebookLM({
  action: 'create_notebook',
  tenant_slug: 'localrank',
  name: 'Reporte Enero 2026',
});

await executeNotebookLM({
  action: 'add_source',
  tenant_slug: 'localrank',
  notebook_id: 'nb_xxx',
  source_type: 'url',
  url: 'https://example.com/doc',
});

await executeNotebookLM({
  action: 'generate_podcast',
  tenant_slug: 'localrank',
  notebook_id: 'nb_xxx',
  instructions: 'Resumen ejecutivo 10 min',
  output_path: '/tmp/localrank-podcast.mp3',
});
```

## MCP

Tool registrada: **`notebooklm`**, scope OAuth **`agents:write`**.

## Caso de uso LocalRank

1. Cliente sube PDF de reporte mensual (Drive u origen acordado).
2. n8n u orquestador invoca el workflow Python o `executeNotebookLM`.
3. Salidas: podcast, PDF de slides, infografía (según pipeline).
4. Entrega al cliente y notificación (email / WhatsApp / Discord según flujo).

## Advertencias

- Puede dejar de funcionar si Google cambia NotebookLM.
- Recomendado para planes **business** y **enterprise**; documentar uso en producción vía ADR-014.

## Instalación skill upstream (opcional)

CLI interactivo: `npx skills add teng-lin/notebooklm-py` (elegir agente destino).  
Python: `pip install "notebooklm-py[browser]"` y autenticación según docs del proyecto.

### opsly-quantum

# Opsly Quantum — skill maestro

## Cuándo usar

Cuando el agente necesita **visión completa** del monorepo Opsly: contexto, diagnóstico seguro, enlaces a otros skills, y **acciones reales** vía scripts ya existentes (nunca inventar comandos que no estén en el repo).

**Orden:** tras `opsly-context` (sesión); Opsly Quantum **orquesta** lecturas y comandos, no sustituye decisiones de `AGENTS.md` ni `VISION.md`.

## Superpoderes (mapeo a repo real)

| Poder                 | Qué hacer en Opsly                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Context master**    | Leer `AGENTS.md`, `VISION.md`, `config/opsly.config.json`, `docs/adr/` según la tarea.                                                        |
| **Diagnostic wizard** | `./scripts/verify-platform-smoke.sh`; VPS solo Tailscale `100.120.151.91`; disco: `scripts/disk-alert.sh` / `docs/OPS-CLEANUP-PROCEDURES.md`. |
| **Deploy / infra**    | CI: `.github/workflows/deploy.yml`; VPS: runbooks en `docs/` — **no** `docker` destructivo sin runbook.                                       |
| **Métricas**          | API admin/metrics según producto; LLM: `apps/llm-gateway`; costos en dashboard si aplica.                                                     |
| **Seguridad**         | `docs/SECURITY_CHECKLIST.md`; sin escanear el repo con regex agresiva de “secretos” (falsos positivos). Secretos: Doppler.                    |
| **Documentación**     | Actualizar `AGENTS.md` al **cierre de sesión** según protocolo; ADRs en `docs/adr/`.                                                          |
| **Tests**             | `npm run type-check`; tests por workspace (`npm run test --workspace=@intcloudsysops/api`, etc.).                                             |
| **Builder**           | Patrones en `.github/copilot-instructions.md`; API: `skills/user/opsly-api/SKILL.md`.                                                         |

## Skills que combina (lectura)

- `opsly-context` — bootstrap de sesión.
- `opsly-api` — rutas `apps/api`.
- `opsly-bash` — scripts `scripts/`.
- `opsly-llm` — LLM Gateway.
- `opsly-mcp` — MCP OpenClaw.
- `opsly-supabase` — migraciones SQL.
- `opsly-tenant` — onboarding.
- `opsly-agent-teams` — BullMQ / orchestrator.

## CLI opcional (raíz del repo)

```bash
./scripts/opsly-quantum.sh help
./scripts/opsly-quantum.sh context
./scripts/opsly-quantum.sh status      # npm run type-check
./scripts/opsly-quantum.sh smoke       # verify-platform-smoke (requiere red/SSH)
./scripts/opsly-quantum.sh skills      # lista skills/user
```

## Lo que Opsly Quantum **no** hace

- No ejecuta deploy a producción ni `terraform apply` sin runbook explícito.
- No escribe en `AGENTS.md` automáticamente en cada comando (solo el humano/agente al cierre de sesión según protocolo).
- No sustituye **Doppler** ni expone secretos.

## Referencias

- `docs/OPSLYQUANTUM-SKILL-DESIGN.md`
- `docs/OPSLYQUANTUM-USAGE.md`
- `skills/user/opsly-quantum/templates/runbook.md`

### opsly-simplify

# opsly-simplify: Docker & Docker Compose Optimization

## Overview

Systematic code simplification and optimization for opsly's Docker and docker-compose configuration. Identifies and fixes patterns that create maintenance burden, waste resources, or duplicate configuration.

**Git source:** `skills/user/opsly-simplify/SKILL.md`

---

## Phase 1: Identify Simplification Opportunities

### Dockerfile Patterns (Multi-Stage Builds)

**npm dependency management:**

- ✅ Use `npm ci` (deterministic) instead of `npm install`
- ✅ Add `--ignore-scripts` to skip postinstall scripts (unless needed; verify per package)
- ✅ Add `--omit=dev` in production images to exclude dev dependencies
- ⚠️ If runner stage needs node_modules, copy from builder stage — avoids reinstall

**Example pattern:**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build -w @intcloudsysops/service-name

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/service-name/dist ./apps/service-name/dist
CMD ["node", "dist/src/server.js"]
```

**Checklist:**

- [ ] Runner stage copies node_modules from builder (not reinstalling)
- [ ] Unnecessary npm ci removed from runner stage
- [ ] Build cache layers ordered: package files → install → source → build

---

### docker-compose.platform.yml Patterns (YAML Anchors)

#### Healthcheck Anchor for Node Services

**Problem:** 9 Node services repeat identical healthcheck structure (interval, timeout, retries) with only the test command and start_period differing.

**Solution:** Create `x-healthcheck-node` anchor for shared properties:

```yaml
x-healthcheck-node: &healthcheck-node
  interval: 30s
  timeout: 10s
  retries: 3
```

**Usage in services:**

```yaml
app:
  healthcheck:
    <<: *healthcheck-node
    test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health')"]
    start_period: 60s

admin:
  healthcheck:
    <<: *healthcheck-node
    test: ["CMD", "node", "-e", "fetch('http://localhost:3001/health')"]
    start_period: 45s
```

**Services using this pattern:** app, admin, portal, mcp, llm-gateway, ingestion-bunker, orchestrator, hermes, context-builder

#### Supabase Environment Anchor

**Problem:** orchestrator and hermes services repeat identical Supabase config with fallback logic:

```yaml
SUPABASE_URL: ${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}
SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-}
```

**Solution:** Create `x-env-supabase` anchor:

```yaml
x-env-supabase: &env-supabase
  SUPABASE_URL: ${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}
  NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:-}
  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-}
```

**Usage:**

```yaml
orchestrator:
  environment:
    <<: *env-supabase
    # other vars...

hermes:
  environment:
    <<: *env-supabase
    # other vars...
```

#### Resource Limits Verification

**All 17 services should have memory limits** to prevent OOM:

```yaml
deploy:
  resources:
    limits:
      memory: 512M # or service-appropriate value
```

**Expected services and typical limits:**
| Service | Memory | Notes |
|---------|--------|-------|
| app | 768M | main API |
| admin | 512M | dashboard |
| portal | 512M | user portal |
| mcp | 256M | lightweight |
| llm-gateway | 1G | heavy compute |
| ingestion-bunker | 256M | queue consumer |
| orchestrator | 1G | workflow engine |
| hermes | 512M | job executor |
| context-builder | 512M | semantic processing |
| cadvisor | 256M | monitoring |
| redis | 384M | cache/queue backend |
| postgres | varies | check docs |
| prometheus | 512M | metrics |
| grafana | 256M | UI |
| traefik | 256M | router |
| uptime-kuma | 256M | monitoring |
| n8n | 512M | automation |

---

## Phase 2: Code Review Checklist

### For each Dockerfile in `apps/`:

- [ ] Multi-stage build uses `AS builder` and `AS runner` (or similar)
- [ ] Builder stage: `npm ci --ignore-scripts` (or `--ignore-scripts` if required)
- [ ] Builder stage: Production image only → add `--omit=dev`
- [ ] Runner stage: Copies only built artifacts, not entire repo
- [ ] Runner stage: Does NOT repeat npm install/ci
- [ ] Workdir and build commands appropriate for package structure

### For docker-compose.platform.yml:

- [ ] All Node services use `x-healthcheck-node` anchor or have documented exception
- [ ] Supabase-dependent services use `x-env-supabase` anchor
- [ ] All 17 services have `deploy.resources.limits.memory` set
- [ ] No hardcoded secrets (use `${VAR}` interpolation only)
- [ ] x-logging anchor applied consistently (confirmed working elsewhere)

---

## Phase 3: Implementation Steps

### For Dockerfiles:

1. Read the current Dockerfile
2. Identify if it's single-stage or multi-stage
3. Check `RUN npm` commands for `ci` vs `install`, `--ignore-scripts`, `--omit=dev`
4. If multi-stage and runner copies node_modules, verify builder populates it and runner doesn't reinstall
5. Apply fixes and test build

### For docker-compose.platform.yml:

1. Add anchors to top of file (after `version` and before services)
2. For each service matching the pattern:
   - If Node healthcheck: replace with `<<: *healthcheck-node` + service-specific test/start_period
   - If Supabase env: replace with `<<: *env-supabase` + other env vars
3. Verify resource limits exist (or add if missing)
4. Test: `docker-compose config` parses YAML correctly, `docker-compose up` starts services

---

## Known Patterns & Decisions

### When to use anchors:

- **Exact match:** interval=30s, timeout=10s, retries=3 for Node healthchecks → anchor
- **Fallback chains:** Supabase config with `${VAR:-${OTHER_VAR:-}}` → anchor
- **Repeated sections with variations:** healthcheck test, start_period vary; everything else identical → anchor

### When NOT to create anchors:

- Single occurrence (no duplication)
- Highly service-specific (will only be used once)
- Values diverge significantly across uses

### Resource limits notes:

- All 17 services already have limits in place (as of 2026-04-13)
- Limits prevent runaway memory consumption and kernel OOM killer
- Never exceed host available memory

### Healthcheck test commands:

- Node services: `node -e "fetch('http://localhost:PORT/health')"`
- Each service has unique PORT
- start_period varies: 15s (fast), 30s (normal), 45s+ (slow startup)
- Keep these service-specific; only anchor shared properties

---

## Files Modified (Session 2026-04-13)

- ✅ `/opt/opsly/apps/ingestion-service/Dockerfile` — npm ci --ignore-scripts --omit=dev
- ✅ `/opt/opsly/apps/llm-gateway/Dockerfile` — removed redundant npm ci from runner
- ✅ `/opt/opsly/infra/docker-compose.platform.yml` — added 2 anchors, applied to 9 services + 2 env services

---

## Remaining Optimizations (Lower Priority)

1. **Playwright in Hermes:** Removed from Dockerfile (commit d82ad3d). If jobs fail on first run, consider lazy-loading via `npx playwright install`.

2. **Orchestrator source bloat:** Copies full `/app/apps/ml` (~10-20MB). Verify if dist-only would work — could save build time.

3. **Context-builder repo files:** Bakes `/docs`, `AGENTS.md` into image. Could use volume mounts instead (~10-50MB savings per layer).

---

## Success Criteria

- All Node services in docker-compose use healthcheck anchor
- Supabase-dependent services use env anchor
- All 17 services have memory limits
- `docker-compose config` produces valid output
- Services start and pass health checks
- No duplicate configuration visible in YAML

---

## References

- **Main config:** `/opt/opsly/infra/docker-compose.platform.yml`
- **Node app patterns:** `/opt/opsly/apps/{api,admin,portal,mcp,llm-gateway,ingestion-service,orchestrator,hermes,context-builder}/Dockerfile`
- **Docker Compose docs:** https://docs.docker.com/compose/compose-file/compose-file-v3/
- **YAML anchors:** https://yaml.org/type/merge.html

### opsly-supabase

# Opsly Supabase Skill

## Cuándo usar

Al crear migraciones SQL o diseñar queries contra el schema `platform`.

## Migraciones — plantilla

Archivos bajo `supabase/migrations/00XX_nombre.sql`. **Postgres no admite `ADD CONSTRAINT IF NOT EXISTS`** en todas las versiones: usar bloques `DO $$ ... $$` con `pg_catalog` o comprobar existencia como en `0011_db_architecture_fix.sql`.

```sql
-- 00XX_nombre_descriptivo.sql
-- Descripción breve

CREATE TABLE IF NOT EXISTS platform.mi_tabla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mi_tabla_tenant_created
  ON platform.mi_tabla(tenant_slug, created_at DESC);

-- FK: preferir ON DELETE CASCADE; nombre explícito de constraint
-- FK: alinear con columnas reales de platform.tenants (slug, id, etc.)
ALTER TABLE platform.mi_tabla
  DROP CONSTRAINT IF EXISTS mi_tabla_tenant_fkey;
ALTER TABLE platform.mi_tabla
  ADD CONSTRAINT mi_tabla_tenant_fkey
  FOREIGN KEY (tenant_slug)
  REFERENCES platform.tenants(slug)
  ON DELETE CASCADE;

ALTER TABLE platform.mi_tabla ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.mi_tabla TO service_role;
```

(Ajusta la FK si la columna referenciada no es `tenants.slug`; algunas tablas referencian `id` uuid.)

## Reglas Opsly

- Schema **`platform`** para datos de control plane.
- Índices compuestos frecuentes: `(tenant_slug, created_at DESC)` cuando hay listados por tenant.
- RLS habilitado en tablas expuestas; la API usa `service_role` donde aplica.
- Versiones de migración **únicas** (sin duplicar `0003_*`, etc.).
- Validar en entorno linkeado: `npx supabase db push` o `--dry-run` si el CLI lo soporta y el proyecto está `supabase link`.

## Políticas RLS

Si anon/authenticated acceden por PostgREST, añadir políticas explícitas; si solo `service_role` vía backend, documentar en el ADR o en el comentario de la migración.

### opsly-tenant

# Opsly Tenant Operations Skill

## Cuándo usar

Onboarding, suspensión, resume o diagnóstico de stacks por tenant.

## Onboarding

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/onboard-tenant.sh \
    --slug mi-cliente \
    --email owner@cliente.com \
    --plan startup
```

Usar `--dry-run` primero si el entorno no está validado. Variables Supabase/path/compose: ver salida de `--help` del script y `AGENTS.md`.

## Planes (CHECK SQL / producto)

- `startup` | `business` | `enterprise` — alineados a `BILLING_PLANS` / scripts del repo (no inventar `pro`).

## Reglas críticas

- **Nunca** `docker system prune --volumes` en producción sin procedimiento acordado.
- Stacks por tenant con compose aislado; nombres y paths según `scripts/onboard-tenant.sh` y plantillas en `infra/`.
- Credenciales generadas → **Doppler** `prd`, no en chat ni commit.

## URLs típicas (staging actual)

- n8n: `https://n8n-{slug}.{PLATFORM_DOMAIN}`
- Uptime: `https://uptime-{slug}.{PLATFORM_DOMAIN}`
- Portal: `https://portal.{PLATFORM_DOMAIN}`

Sustituir `PLATFORM_DOMAIN` por el dominio base del entorno (ej. `ops.smiletripcare.com`).
