# Opsly — Contexto del Agente

> Fuente de verdad para cada sesión nueva.
> Al iniciar: lee este archivo completo antes de cualquier acción.
> Al terminar: actualiza las secciones marcadas con 🔄.

---

## Flujo de sesión (humano + Cursor)

**Al abrir una sesión nueva conmigo (otro agente / otro dispositivo):**

1. Asegúrate de que `AGENTS.md` en `main` está actualizado (último commit en GitHub).
2. Pega en el chat la **URL raw** del archivo para que el agente lo cargue sin clonar:
   - Formato: `https://raw.githubusercontent.com/<org>/<repo>/<branch>/AGENTS.md`
   - Ejemplo: `https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md`
3. Pide explícitamente: *«Lee el contenido de esa URL y actúa según AGENTS.md»*.

**Al cerrar la sesión con Cursor — díselo tal cual (copiar/pegar):**

```
Antes de cerrar: actualiza AGENTS.md (todas las secciones 🔄), haz commit y push a main
con un mensaje claro (ej. docs(agents): estado sesión YYYY-MM-DD). Luego respóndeme con
la URL raw de AGENTS.md en main para pegarla al iniciar la próxima sesión.
```

*(El “commit automático” lo hace Cursor si se lo pides así; si usas reglas/hooks, mantén el mismo criterio: siempre push a `main` tras editar AGENTS.md.)*

---

## Rol

Eres el arquitecto senior de **Opsly** — plataforma multi-tenant SaaS
que despliega stacks de agentes autónomos (n8n, Uptime Kuma) por cliente,
con facturación Stripe, backups automáticos y dashboard de administración.

---

## 🔄 Estado actual

<!-- Actualizar al final de cada sesión -->

**Fecha última actualización:** 2026-04-05 (instrucciones equipo + agentes)

**Completado ✅**
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
- .github/workflows/ (ci.yml, deploy.yml, deploy-staging.yml, backup.yml,
  cleanup-demos.yml)
- config/opsly.config.json (fuente de verdad central)
- docs/ (ARCHITECTURE.md, TEST_PLAN.md, DNS_SETUP.md, VPS-ARCHITECTURE.md)
- README.md completo
- .githooks/ + plantillas GitHub (CODEOWNERS, issue forms, PR template)
- AGENTS.md (este archivo)
- Auditoría secrets: `doppler secrets upload` desde `/opt/opsly/.env` (18 claves
  de la lista audit) + alineación `PLATFORM_*` / `NEXT_PUBLIC_*` dominio con
  `config/opsly.config.json` (2026-04-05)
- `config/doppler-missing.txt` (instrucciones para claves no aplicables o token de
  servicio)
- Instrucciones humano + IA: `.cursor/rules/opsly.mdc`, `.claude/CLAUDE.md`,
  `.github/copilot-instructions.md`, `.github/AGENTS.md` (espejo de este archivo),
  `scripts/update-agents.sh` (sync espejo + commit/push)

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

---

## Estructura del repo

```
.
├── apps/
│   ├── api/                 # Next.js API (control plane)
│   └── admin/               # Next.js dashboard admin
├── config/
│   └── opsly.config.json    # Infra/dominios/planes (sin secretos)
├── docs/                    # Arquitectura, DNS, tests, VPS
├── infra/
│   ├── docker-compose.platform.yml
│   ├── docker-compose.local.yml
│   ├── templates/           # Plantilla compose por tenant
│   └── traefik/             # Estático + dynamic middlewares
├── scripts/                 # Operación, VPS, Doppler, sync-config
├── supabase/                # migrations, config CLI
├── .cursor/rules/           # Reglas Cursor (opsly.mdc)
├── .claude/                 # Contexto Claude (CLAUDE.md)
├── .github/                 # workflows, AGENTS.md espejo, Copilot, plantillas
├── .githooks/               # pre-commit (type-check), opcional Husky
├── package.json             # workspaces + turbo
├── README.md
└── AGENTS.md                # Este archivo
```
