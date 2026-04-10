## PROTOCOLO OBLIGATORIO — INICIO DE SESION

Antes de CUALQUIER tarea, sin excepcion:

1. Leer `AGENTS.md` completo.
2. Leer `VISION.md` completo.
3. Verificar estado VPS (acceso **solo por Tailscale** — `100.120.151.91`, nunca IP pública):
   `ssh vps-dragon@100.120.151.91 "systemctl is-active cursor-prompt-monitor opsly-watcher && docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'n8n|uptime|infra|traefik'"`
4. Verificar vars criticas Doppler:
   `for VAR in DISCORD_WEBHOOK_URL RESEND_API_KEY GITHUB_TOKEN_N8N GOOGLE_DRIVE_TOKEN; do VAL=$(doppler secrets get $VAR --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo ""); echo "$VAR: ${#VAL} chars"; done`
5. Reportar gaps antes de continuar.
6. No ejecutar nada hasta confirmar el reporte.

## FILOSOFIA DE TRABAJO

Planificar -> Documentar -> Tests -> Implementar -> Validar -> Notificar
NUNCA adivinar. NUNCA saltarse pasos.

# Opsly — Instrucciones para GitHub Copilot

<!--
Qué hace: orienta a Copilot (y herramientas que lean este archivo) sobre convenciones
  del repo Opsly y límites de arquitectura.
Cuándo se activa: Copilot lo usa como contexto al sugerir código en este repositorio.
Reutilizar en otro proyecto: sustituye nombres (Opsly → tu producto), rutas de config
  y lista de “qué NO hacer” según tus ADRs.
-->

Fuente de verdad operativa: `AGENTS.md` en la raíz del repo (y espejo bajo `.github/` cuando esté sincronizado).

## Convenciones Opsly

- **TypeScript:** estricto; **no uses `any`**.
- **Bash:** `set -euo pipefail`; scripts **idempotentes**; expón **`--dry-run`** cuando el script modifique estado o infra.
- **Secretos:** solo vía **Doppler** (proyecto `ops-intcloudsysops`, config `prd` en producción); nunca en código ni commits.
- **Config central:** valores no secretos y rutas de producto en `config/opsly.config.json` (sin credenciales).

Stack resumido: Next.js 15, Tailwind, Supabase, Stripe, Docker Compose, Traefik v3, Redis/BullMQ.

## Archivos de referencia

| Recurso | Uso |
|--------|-----|
| `VISION.md` | Norte del producto, fases, ICP, qué no haremos. |
| `AGENTS.md` | Estado de sesión, VPS, DNS, próximos pasos, decisiones fijas. |
| `config/opsly.config.json` | Dominios, IP VPS, nombres Doppler/GitHub, planes. |
| `docs/adr/` | Decisiones de arquitectura (Traefik, compose por tenant, Doppler, schemas). |
| `infra/terraform/` | IaC cuando exista; revisar plan antes de aplicar. |

## Qué NO hacer

- No proponer **Kubernetes**, **Docker Swarm** ni **nginx** como reemplazo del diseño acordado (compose + Traefik v3), salvo ADR nuevo explícito.
- No **hardcodear** URLs de producción, tokens, API keys ni contraseñas; usar Doppler y variables de entorno documentadas.
- No **saltarse** `./scripts/validate-config.sh` cuando el cambio afecte deploy, DNS o secretos esperados en `prd`.
- No aplicar **Terraform** sin **plan revisado** y sin entender impacto en VPS/tenants.
- No contradecir decisiones fijas tabuladas en `AGENTS.md` sin acuerdo del equipo.

## Patrones de diseño en Opsly

- **Repository:** toda lectura/escritura a **Supabase** va en `apps/api/lib/repositories/` (un archivo o carpeta por agregado). Los **route handlers** (`app/api/**/route.ts`) solo llaman a repositorios o casos de uso, **nunca** instancian el cliente Supabase para queries ad hoc.
  - Estructura sugerida: `lib/repositories/tenant.repository.ts` exporta funciones puras o clase pequeña con `findById`, `list`, `create`, etc.
- **Factory:** creación de **tenants**, **compose**, **configs** dinámicos → funciones factory en `apps/api/lib/factories/` (p. ej. `createTenantComposeEnv()`). Evitá bloques grandes de “armado” inline en handlers.
- **Observer / eventos:** eventos de dominio (tenant creado, pago recibido, backup completado) → **emitir** evento (Node `EventEmitter` acotado o **BullMQ** como cola). Los consumidores se registran aparte; **no** encadenar llamadas directas a notificaciones/email desde el mismo archivo que persiste datos.
- **Strategy:** proveedores intercambiables (**Stripe**, email, notificaciones) → interfaz común en `apps/api/lib/providers/` con implementaciones concretas; el handler o servicio recibe la estrategia por parámetro o registro de DI sencillo.

## Algoritmos — cuándo usar qué

- **Listas pequeñas (< ~100 ítems):** `Array.prototype.filter` / `find` en memoria; no micro-optimizar.
- **Listas grandes o datos persistentes:** **índices y consultas en Supabase**; nunca escanear tablas enteras en un loop en Node.
- **Reintentos:** **BullMQ** con `attempts` y **backoff exponencial**; no `setTimeout` en bucle manual para reintentos de negocio.
- **Paginación:** preferir **cursor-based** (keyset) para logs/tenants en crecimiento; evitar `OFFSET` alto en tablas grandes.
- **Caché:** **Redis** para resultados costosos **> ~100 ms**; siempre definir **TTL** explícito (ver `lib/constants.ts` → `CACHE_TTL`).

## Principios SOLID aplicados a Opsly

- **S — Single responsibility:** cada módulo bajo `lib/` tiene una responsabilidad clara (un tema por archivo cuando sea posible).
- **O — Open/closed:** nuevos **providers** o estrategias se añaden sin modificar el núcleo (interfaces + registro).
- **L — Liskov:** si una función acepta `TenantConfig`, cualquier subtipo válido debe comportarse sin romper llamadas.
- **I — Interface segregation:** preferir tipos pequeños (`Pick`, interfaces enfocadas) a un objeto “común” con decenas de campos opcionales.
- **D — Dependency inversion:** los route handlers dependen de **contratos** (funciones importadas desde `lib/`), no de implementaciones bajas mezcladas en el mismo archivo.

## Reglas de estilo obligatorias

- **Early return:** validar input y errores al inicio; el “camino feliz” al final.
- **Sin números mágicos:** usar `lib/constants.ts` u otras constantes nombradas.
- **Comentarios:** explicar el **por qué**, no lo obvio; el **qué** debe leerse en el código.
- **Nombres en inglés** en código; **comentarios en español** cuando ayuden al equipo.
- **Funciones puras** cuando no haya I/O; aislar efectos secundarios.

## Estructura de un archivo nuevo en `apps/api` (route handler)

1. **Imports:** tipos → `lib/` (repositorios, validación) → externos (`next/server`, etc.).
2. **Validación** del input (query/body) con **early return** (`400`/`422`).
3. **Lógica de negocio** delegada a `lib/` (repositorio, factory, servicio); **sin** SQL ni Supabase directo en el handler.
4. **Respuesta** `NextResponse.json(...)` con tipo explícito o `satisfies` cuando aplique.

## Estructura de un script bash nuevo (`scripts/` o `tools/`)

```bash
#!/usr/bin/env bash
# Propósito en una línea.
set -euo pipefail

DRY_RUN="${DRY_RUN:-false}"
log() { echo "[script] $*"; }

check_dependencies() {
  command -v jq >/dev/null || { echo "Falta jq" >&2; exit 2; }
}

main() {
  check_dependencies
  if [[ "${DRY_RUN}" == "true" ]]; then
    log "DRY-RUN: …"
    return 0
  fi
  # …
}

main "$@"
```

---

## Build, Test, Lint

### Root level (Turbo)

```bash
# Full monorepo
npm run build              # Build todas las apps
npm run type-check        # TypeScript check Turbo (más rápido que compilar)
npm run lint              # ESLint en apps/api (strict), demás con defaults

# Individual workspace
npm run <script> --workspace=@intcloudsysops/api
npm run type-check -w @intcloudsysops/llm-gateway

# Single test file (Vitest)
npm test --workspace=@intcloudsysops/api -- portal-routes
```

### Development

```bash
npm run dev                 # Turbo: dev todos los servicios (next dev, tsx watch, etc.)
npm run dev -w apps/api     # Dev solo una app
```

### ESLint + Prettier

```bash
# Check (failing on warnings)
npm run lint

# Auto-fix (staged changes en apps/api/)
npm run lint:fix -w @intcloudsysops/api

# Pre-commit hook (Git)
# Ejecuta type-check + ESLint sobre staged en apps/api/{app,lib}/*.ts
git config core.hooksPath .githooks
```

### Test suites (app-specific)

- **`apps/api`** — 155+ tests Vitest (`portal-routes`, `feedback`, `metrics`, etc.)
  ```bash
  npm test -w @intcloudsysops/api [-- <filter>]
  ```
- **`apps/llm-gateway`** — cache, routing, intent, quality, beast, gateway tests
  ```bash
  LLM_BATCH_WINDOW_SCALE=0 npm test -w @intcloudsysops/llm-gateway
  ```
- **`apps/mcp`** — OAuth, server, tools, auth scope
  ```bash
  npm test -w @intcloudsysops/mcp
  ```
- **`apps/context-builder`** — knowledge index, summarization, chunks
  ```bash
  npm test -w @intcloudsysops/context-builder
  ```
- **`skills/manifest`** — skill validation, manifest parsing
  ```bash
  npm run validate-skills
  npm test -w skills/manifest
  ```

### Validation scripts (antes de deploy)

```bash
./scripts/validate-config.sh     # Verifica JSON, DNS, SSH VPS, Doppler vars críticas
npm run validate-context          # Valida system_state.json
npm run validate-skills           # Verifica metadatos en skills/user/*/
```

---

## Acceso al VPS — Tailscale obligatorio

> **Regla de oro:** el SSH al VPS va **SIEMPRE** por Tailscale. Nunca usar la IP pública `157.245.223.7` para conectarse.

| Propósito | Dirección | Nota |
|-----------|-----------|------|
| SSH / admin | `vps-dragon@100.120.151.91` | Tailscale VPN — única vía válida |
| HTTP/HTTPS público | `157.245.223.7` (detrás de Cloudflare) | Solo tráfico de usuarios |

```bash
# ✅ CORRECTO — siempre así
ssh vps-dragon@100.120.151.91

# ❌ NUNCA — IP pública bloqueada por ufw para SSH
ssh vps-dragon@157.245.223.7
```

Si Tailscale no responde (`Connection timed out`): verificar `tailscale status` localmente y en el VPS antes de escalar.

---

## Arquitectura de alto nivel

### Estructura del monorepo

```
apps/
  ├── api/                        # Next.js 15 — Control plane API
  │   └── lib/                    # Repositorios, validación, servicios
  │       ├── repositories/       # Acceso a Supabase
  │       ├── factories/          # Creación de tenants, configs
  │       ├── providers/          # Stripe, email, notificaciones
  │       └── constants.ts        # Sin magic numbers
  ├── admin/                      # Next.js 15 — Dashboard operativo (3001)
  ├── portal/                     # Next.js 15 — Portal cliente (3002)
  ├── web/                        # Next.js 15 — Landing / workspace
  │
  ├── mcp/                        # MCP server — Tools CLI para OpenClaw (3003)
  ├── orchestrator/               # BullMQ + workers — Orquestación (3011)
  ├── llm-gateway/                # Cache Redis, routing, modelos (3010)
  ├── context-builder/            # Sesión + resúmenes (3012, interno)
  ├── ml/                         # ML tasks, feedback, embeddings
  └── agents/
      └── notebooklm/             # Agente NotebookLM (experimental)

config/
  └── opsly.config.json           # Dominios, IP VPS, planes (sin secretos)

infra/
  ├── docker-compose.platform.yml # Stack plataforma + Traefik
  ├── templates/tenant            # Template por tenant
  └── traefik/                    # Config estática Traefik v3

scripts/
  ├── vps-bootstrap.sh            # Setup VPS (.env desde Doppler)
  ├── vps-first-run.sh            # Primer docker compose up
  ├── onboard-tenant.sh           # Crear nuevo tenant
  ├── validate-config.sh          # Pre-deploy checks
  └── [otros scripts operativos]

.github/
  ├── workflows/                  # CI/CD (ci.yml, deploy.yml, etc.)
  ├── ISSUE_TEMPLATE/             # Plantillas de issues
  ├── copilot-instructions.md     # Este archivo
  └── CODEOWNERS                  # Permisos por ruta

skills/
  ├── manifest/                   # Validador de skills (package @intcloudsysops/skills-manifest)
  └── user/
      ├── opsly-api/              # Skill para rutas API
      ├── opsly-bash/             # Skill para scripts
      ├── opsly-context/          # Skill AGENTS.md + state
      └── [otros skills]
```

### Control plane vs Data plane

- **Control plane** (`apps/api`, `apps/admin`, `apps/orchestrator`): decisiones, billing, operación
- **Data plane** (Docker Compose por tenant en VPS): n8n, Uptime Kuma, volúmenes, redes aisladas

Cada tenant corre en **`docker compose --project-name tenant_<slug>`** con sus propias imágenes y volúmenes.

### OpenClaw — Capas de orquestación

```
Capa 1: MCP (herramientas)       → apps/mcp
        ↓
Capa 2: Orchestrator (cola)      → apps/orchestrator
        ↓
Capa 3: LLM Gateway + Context    → apps/llm-gateway + apps/context-builder
        ↓
API + ML: Métricas, embeddings   → apps/api + apps/ml
```

Documentación: `docs/OPENCLAW-ARCHITECTURE.md`, `docs/ORCHESTRATOR.md`, `docs/LLM-GATEWAY.md`.

---

## Convenciones clave por sección

### `apps/api`

1. **Route handlers** (`app/api/**/route.ts`) — solo validan input y delegan a `lib/`
2. **Repositorios** (`lib/repositories/*.ts`) — acceso a Supabase; funciones puras o métodos de clase
3. **Validación** (`lib/validation.ts`) — Zod schemas, early return en handlers
4. **Respuestas** — `NextResponse.json()` con tipos explícitos o `satisfies`
5. **Sin SQL directo** en handlers — siempre pasar por repositorio o función de `lib/`

### `apps/portal` y `apps/admin`

- Next.js SSR/ISR con middleware de autenticación Supabase
- Componentes shadcn/ui con Tailwind
- `lib/supabase/` — clientes y helpers (nunca Supabase directo en páginas)
- `lib/tenant.ts` — data fetching centralizado (avoid duplication)

### Backend services (`mcp`, `orchestrator`, `llm-gateway`)

- Vitest para tests; `LLM_BATCH_WINDOW_SCALE=0` en CI para reproducibilidad
- TypeScript estricto, sin `any`
- Structured JSON logging (`worker_start`, `job_complete`, `llm_call_error`, etc.)
- Librerias exportadas con named exports y tipos públicos

### Scripts bash

- Directorio: `scripts/`, `tools/usb-kit/`
- Header: `#!/usr/bin/env bash` + `set -euo pipefail`
- Dry-run: `DRY_RUN=${DRY_RUN:-false}` env var para preview sin mutar
- Idempotentes: ejecutar dos veces = mismo resultado
- Dependencias: verificar con `command -v` (p. ej. `jq`, `docker`)

---

## Decisiones fijas (ADRs)

| ADR | Decisión | Razón |
|-----|----------|-------|
| ADR-001 | Docker Compose por tenant (no Swarm) | Simplicidad, aislamiento claro, escalado vertical |
| ADR-002 | Traefik v3 (no nginx) | TLS automático, routing dinámico, no reinitialize |
| ADR-003 | Doppler para secrets (no .env local) | Rotación centralizada, audit, CI/CD integrado |
| ADR-004 | Supabase schema aislado por tenant | RLS + GRANT granular, backups por cliente |
| ADR-009 | MCP para herramientas + OAuth 2.0 | Estándar OpenClaw, alineado con Claude |
| ADR-011 | BullMQ cola por plan (prioridad) | Enterprise `0` → startup `50_000` |

Consulta `docs/adr/` para detalle.

---

## Debugging y observabilidad

### Health checks

```bash
# Cada servicio expone GET /health
curl -s http://localhost:3000/api/health        # API
curl -s http://localhost:3001/health            # Admin (Traefik reverse proxy)
curl -s http://localhost:3010/health            # LLM Gateway
curl -s http://localhost:3011/health            # Orchestrator
curl -s http://localhost:3012/health            # Context Builder
```

### Logs

- **JSON estructurado** en workers + `llm_call_*` eventos (`apps/llm-gateway`, `apps/orchestrator`)
- **VPS** — `docker logs infra-app-1`, `docker logs opsly_admin_1`, etc.
- **GitHub Actions** — ver workflow run logs; job `deploy` incluye health check con reintentos

### Monitoreo (opcional)

- **Prometheus** en VPS (si existe) — métricas sistema, Docker
- **Sentry** — si configurado en Doppler `SENTRY_DSN`
- **Discord webhook** — notificaciones post-commit y errores CI

---

## Flujo típico de cambios

1. **Rama feature** — `git checkout -b feat/...`
2. **Cambios** — editar `apps/api/lib/` primero (repositorios), luego `app/api/**/route.ts`
3. **Test local** — `npm test -w @intcloudsysops/api`, `npm run type-check`
4. **Pre-commit** — ejecuta automáticamente si en `.githooks/pre-commit` está activado
5. **Commit** — `git commit -m "feat(api): ..."` (post-commit sincroniza `AGENTS.md` espejo)
6. **Push** — `git push origin feat/...`
7. **CI** — workflows `validate-context.yml`, `ci.yml` (lint, typecheck, test)
8. **PR** → merge a `main`
9. **Deploy** — `deploy.yml` build GHCR + deploy VPS

Si el cambio afecta **infra, DNS, deploy o secretos**: ejecutar `./scripts/validate-config.sh` antes de merge.
