# Opsly — Contexto del Agente

> Fuente de verdad para cada sesión nueva.
> Al iniciar: lee este archivo completo antes de cualquier acción.
> Al terminar: actualiza las secciones marcadas con 🔄.

---

## Flujo de sesión (humano + Cursor)

**Al abrir una sesión nueva conmigo (otro agente / otro dispositivo):**

1. Asegúrate de que `AGENTS.md` en `main` está actualizado (último commit en GitHub).
2. **Contexto:** lee `VISION.md` una vez (el norte del producto); lee `AGENTS.md` siempre (estado de la sesión); para arquitectura, consulta `docs/adr/`. Ante decisiones nuevas, verifica alineación con `VISION.md` y documéntalas aquí (y ADR si aplica).
3. Pega en el chat la **URL raw** del archivo para que el agente lo cargue sin clonar:
   - Formato: `https://raw.githubusercontent.com/<org>/<repo>/<branch>/AGENTS.md`
   - Ejemplo: `https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md`
4. Pide explícitamente: *«Lee el contenido de esa URL y actúa según AGENTS.md»*.

**Al cerrar la sesión con Cursor — copiar/pegar esto:**

```
Flujo de cierre:
1. Actualiza AGENTS.md (todas las secciones 🔄).
2. Commit y push a main (mensaje claro, ej. docs(agents): estado sesión YYYY-MM-DD).
   Con `core.hooksPath=.githooks`, el post-commit copia AGENTS y system_state a `.github/` (revisa `git status` por si hace falta un commit extra).
   Alternativa: `./scripts/update-agents.sh` para espejar AGENTS, VISION y `context/system_state.json` y pushear.
3. Respóndeme con la URL raw de AGENTS.md en main para que la pegue al abrir la próxima sesión.

https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md
```

**Resumen:** Cursor deja `AGENTS.md` al día → commit/push a `main` → tú pegas la URL raw al iniciar la próxima sesión con el agente → listo.

---

## Rol

Eres el arquitecto senior de **Opsly** — plataforma multi-tenant SaaS
que despliega stacks de agentes autónomos (n8n, Uptime Kuma) por cliente,
con facturación Stripe, backups automáticos y dashboard de administración.

---

## 🔄 Estado actual

<!-- Actualizar al final de cada sesión -->

**Fecha última actualización:** 2026-04-05 (docs: inventario completo — contexto automático + gobernanza previa)

**Completado ✅**

*Alineación automática del contexto (Capa 1 + Capa 2; n8n y capas superiores después):*
- **Capa 1 — `scripts/update-state.js`:** Node sin dependencias extra; lee el repo y escribe en `context/system_state.json` el bloque `repo` (`apps[]`, número de `scripts/*.sh`, ADRs, migraciones `.sql`) y `last_updated` (UTC fecha); no sobrescribe fase, VPS, Doppler, DNS, `next_action` ni `tenants` (merge sobre JSON actual).
- **Capa 2 — `.githooks/post-commit`:** Tras cada commit exitoso: si el commit tocó `infra/`, `scripts/`, `apps/` o `supabase/`, ejecuta `node scripts/update-state.js`; **siempre** copia `AGENTS.md` → `.github/AGENTS.md` y `context/system_state.json` → `.github/system_state.json` (si los cambios del hook quedan sin commitear, haz un segundo commit o `./scripts/update-agents.sh`).
- **`package.json`:** `npm run update-state`, `sync-agents` → `bash scripts/update-agents.sh`, `validate-context` → validación JSON local con `python3 -m json.tool`.
- **CI — `.github/workflows/validate-context.yml`:** en `push` y `pull_request` comprueba JSON válido, que cada carpeta bajo `apps/*` tenga mención en `AGENTS.md`, y `diff` entre `AGENTS.md` y `.github/AGENTS.md` (si falla: sincronizar y pushear).
- **Activación hooks:** `git config core.hooksPath .githooks` en **README → Setup** y al arrancar `scripts/local-setup.sh`; **pre-commit** existente sigue ejecutando `npm run type-check` (Turbo) antes del commit.
- **Verificación:** commit `feat(context): …` en `main` con pre-commit + post-commit ejecutándose (type-check OK, `update-state` y “Contexto sincronizado” en log).

*Contexto y flujo para agentes (abr 2026):*
- `VISION.md` — visión, ICP, planes, primer cliente smiletripcare, stack transferible, límites; **roadmap por fases (revisado 2026-04-04)** con Fase 1 (máx 1 semana), 2, 3, lista *Nunca* (K8s, Swarm, migrar Traefik/Supabase) y **regla:** antes de features nuevos → ¿tenants en producción > 0? si no, Fase 1
- `AGENTS.md` — fuente de verdad por sesión; bloque de **cierre** para Cursor (actualizar 🔄, commit/push o `./scripts/update-agents.sh`, pegar URL raw al abrir la próxima sesión)
- `.vscode/extensions.json` — extensiones recomendadas (ESLint, Prettier, Tailwind, TS, GitLens, Supabase, Thunder Client, etc.)
- `.cursor/rules/opsly.mdc` — Fase 1 validación; prioridad `VISION.md` → `AGENTS.md` → `config/opsly.config.json`; consultar `docs/adr/` para arquitectura
- `.claude/CLAUDE.md` — URLs raw de `AGENTS.md` y `VISION.md`
- **GitHub:** repo `cloudsysops/opsly` **público** para que Claude u otros lean sin clonar
- `docs/adr/` — ADR-001 (compose por tenant), ADR-002 (Traefik v3), ADR-003 (Doppler), ADR-004 (Supabase schema por tenant)
- `agents/prompts/` — `claude-architect.md`, `cursor-executor.md`
- `context/system_state.json` — fase `fase-1-validacion`, `next_action` `./scripts/validate-config.sh`, VPS/DNS/Doppler; espejo `.github/system_state.json` vía `update-agents.sh`
- `.gitignore` — `context/doppler-ready.json`, `agents/prompts/secrets-*.md` (sin secretos en repo)
- `scripts/update-agents.sh` — copia `AGENTS.md`, `VISION.md`, `context/system_state.json` → `.github/`; `git add` de espejos y `docs/adr/`, `agents/` (sin `git add .github/` completo)

*Código e infra en repo (resumen):*
- Supabase migrations (schema platform, tenants, RLS, subscriptions)
- apps/api/lib/ (supabase, stripe, docker, doppler, notifications, email,
  orchestrator, auth, validation)
- apps/api/app/api/ (Route Handlers: tenants CRUD, metrics,
  webhooks/stripe, health)
- infra/ (traefik config, docker-compose.platform.yml, template tenant)
- scripts/ (onboard, backup, restore, suspend, vps-bootstrap, vps-deploy,
  vps-first-run, fix-preflight, preflight-check, local-setup,
  tunnel-access, setup-doppler, sync-config, validate-config,
  migrate-to-traefik, git-setup, deploy-staging)
- apps/admin/ (dashboard Next.js dark theme ops/terminal)
- apps/web/ (workspace Next.js en monorepo; documentado para CI `validate-context`)
- .github/workflows/ (ci.yml, deploy.yml, deploy-staging.yml, backup.yml,
  cleanup-demos.yml, validate-context.yml)
- config/opsly.config.json (fuente de verdad central)
- docs/ (ARCHITECTURE.md, TEST_PLAN.md, DNS_SETUP.md, VPS-ARCHITECTURE.md)
- README.md completo
- .githooks/ (pre-commit type-check, post-commit contexto) + plantillas GitHub
  (CODEOWNERS, issue forms, PR template)
- AGENTS.md (este archivo)
- Auditoría secrets: `doppler secrets upload` desde `/opt/opsly/.env` (18 claves
  de la lista audit) + alineación `PLATFORM_*` / `NEXT_PUBLIC_*` dominio con
  `config/opsly.config.json` (2026-04-05)
- `config/doppler-missing.txt` (instrucciones para claves no aplicables o token de
  servicio)
- `.github/copilot-instructions.md`, `.github/AGENTS.md` (espejo de este archivo)

**En progreso 🔄**
- Deploy staging VPS DigitalOcean
- Refrescar `.env` en VPS desde Doppler tras el upload (`vps-bootstrap` o
  `doppler secrets download`)
- DNS: ops.smiletripcare.com → 157.245.223.7 ✅

**Pendiente ⏳**
- Revisar en Doppler UI que no queden placeholders (p. ej. ACME_EMAIL,
  PLATFORM_ADMIN_TOKEN, REDIS_* si aún decían change-me en el .env del VPS)
- `DOPPLER_TOKEN` de servicio en el VPS (`/etc/doppler.env`) — ver
  `config/doppler-missing.txt` y `scripts/setup-doppler.sh`
- `NEXTAUTH_*`: no usado en el código actual; ver `doppler-missing.txt`
- Correr `vps-bootstrap.sh` / `doppler secrets download` en VPS para alinear
  disco con Doppler
- Primer tenant de prueba: smiletripcare

---

## 🔄 Próximo paso inmediato

<!-- Una sola tarea concreta. Actualizar al final de cada sesión -->
```bash
# Paso actual:
./scripts/validate-config.sh
# Si pasa: ssh vps-dragon@157.245.223.7 'cd /opt/opsly && ./scripts/vps-bootstrap.sh'
```

---

## 🔄 Bloqueantes activos

<!-- Qué está roto o bloqueado ahora mismo -->

- [x] Bulk upload Doppler desde VPS `.env` (lista audit) — hecho 2026-04-05
- [ ] Token de servicio Doppler en VPS (`/etc/doppler.env`)
- [ ] `.env` en disco VPS sincronizado con Doppler tras el upload

---

## Infraestructura (fija)

| Recurso | Valor |
|---|---|
| VPS | DigitalOcean Ubuntu 24 |
| IP | 157.245.223.7 |
| Usuario SSH | vps-dragon |
| Repo en VPS | /opt/opsly |
| Repo GitHub | github.com/cloudsysops/opsly |
| Dominio staging | ops.smiletripcare.com |
| DNS wildcard | *.ops.smiletripcare.com → 157.245.223.7 |

---

## Stack (fijo)

Next.js 15 · TypeScript · Tailwind · shadcn/ui · Supabase · Stripe ·
Docker Compose · Traefik v3 · Redis/BullMQ · Doppler · Resend · Discord

---

## Decisiones fijas — no proponer alternativas

| Decisión | Valor |
|---|---|
| Orquestación | docker-compose por tenant (no Swarm) |
| DB plataforma | Supabase schema "platform" |
| DB por tenant | schema aislado "tenant_{slug}" |
| Proxy | Traefik v3 (no nginx) |
| Secrets | Doppler proyecto ops-intcloudsysops config prd |
| TypeScript | Sin `any` |
| Scripts bash | set -euo pipefail · idempotentes · con --dry-run |
| Config central | config/opsly.config.json |

---

## 🔄 Decisiones tomadas en sesiones anteriores

<!-- Agregar aquí cada decisión importante con fecha y razón -->

| Fecha | Decisión | Razón |
|---|---|---|
| 2026-04 | validate-config usa `dig +short` para DNS | Comprobar que la IP del VPS aparece en la resolución |
| 2026-04 | sync-config redirige stdout de `doppler secrets set` a /dev/null | No volcar tablas con valores en logs compartidos |
| 2026-04 | Dashboard Traefik en `traefik.${PLATFORM_DOMAIN}` | Reservar `admin.*` para la app Admin Opsly |
| 2026-04-04 | ADR-001 a ADR-004 documentadas en `docs/adr/` | Gobernanza explícita; agentes no reabren K8s/Swarm/nginx sin ADR nuevo |
| 2026-04 | Repo GitHub `cloudsysops/opsly` en visibilidad **public** | Lectura por URL raw / Claude sin credenciales |
| 2026-04-04 | Roadmap realista en `VISION.md` (fases + *Nunca* + regla tenants) | Alinear trabajo a validación antes de producto |
| 2026-04-05 | `update-state.js` + post-commit + `validate-context.yml` | Capa 1–2: estado repo en JSON + espejo .github + CI |

---

## Estructura del repo

```
.
├── apps/
│   ├── api/                 # Next.js API (control plane)
│   ├── admin/               # Next.js dashboard admin
│   └── web/                 # App web (workspace)
├── config/
│   └── opsly.config.json    # Infra/dominios/planes (sin secretos)
├── agents/prompts/          # Plantillas Claude / Cursor
├── context/                 # system_state.json (sin secretos)
├── docs/                    # Arquitectura, ADRs, DNS, tests, VPS
│   └── adr/                 # Decisiones de arquitectura (ADR-001 …)
├── infra/
│   ├── docker-compose.platform.yml
│   ├── docker-compose.local.yml
│   ├── templates/           # Plantilla compose por tenant
│   └── traefik/             # Estático + dynamic middlewares
├── scripts/                 # Operación, VPS, Doppler, sync-config
├── supabase/                # migrations, config CLI
├── .vscode/                 # extensiones recomendadas
├── .cursor/rules/           # Reglas Cursor (opsly.mdc)
├── .claude/                 # Contexto Claude (CLAUDE.md)
├── .github/                 # workflows, espejo AGENTS/VISION/system_state, Copilot, plantillas
├── .githooks/               # pre-commit (type-check), post-commit (sync contexto)
├── package.json             # workspaces + turbo
├── README.md
├── VISION.md                # Norte del producto (fases, ICP, límites agentes)
└── AGENTS.md                # Este archivo
```
