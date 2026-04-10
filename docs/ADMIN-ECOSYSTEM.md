# Manual del administrador — ecosistema Opsly

**Audiencia:** operadores con acceso al VPS, Doppler `ops-intcloudsysops` / `prd`, GitHub `cloudsysops/opsly`, y (cuando aplique) token admin de la API.

**Fuente de datos no secreta:** `config/opsly.config.json` (dominios de ejemplo, usuario VPS, rutas). Sustituye `<PLATFORM_DOMAIN>` por tu dominio base real (p. ej. `ops.smiletripcare.com`).

---

## 1. Mapa del sistema

| Capa | Qué es |
|------|--------|
| **Control plane** | API Next (`app`), Admin, Portal, LLM Gateway, MCP, Orchestrator, Context Builder |
| **Edge** | Traefik v3 (TLS Let’s Encrypt, DNS Cloudflare si aplica) |
| **Datos** | Supabase (Postgres `platform` + schemas por tenant), Redis (BullMQ, caché) |
| **Secretos** | Doppler — **nunca** en git ni en este documento |
| **CI/CD** | GitHub Actions: build imágenes GHCR → deploy SSH al VPS |
| **Tenants** | Un stack Docker Compose por cliente (`--project-name tenant_<slug>`) |

---

## 2. Acceso al VPS

**Recomendado:** SSH solo por **Tailscale** (administración), no exponer SSH a Internet.

```bash
# Usuario y host por defecto en opsly.config.json: vps-dragon, ruta /opt/opsly
export SSH_HOST="${SSH_HOST:-100.120.151.91}"   # IP Tailscale típica; ajusta si tu tailnet difiere
ssh vps-dragon@${SSH_HOST}
```

Comprueba servicios Opsly en el servidor:

```bash
systemctl is-active cursor-prompt-monitor opsly-watcher
journalctl -u opsly-watcher -n 30 --no-pager
journalctl -u cursor-prompt-monitor -n 30 --no-pager
```

- **`opsly-watcher`:** vigila `docs/` y `AGENTS.md` en el clon y hace commit+push (auto-**push** a GitHub). No sustituye al deploy.
- **`cursor-prompt-monitor`:** ejecuta líneas no comentadas de `docs/ACTIVE-PROMPT.md` (riesgo si el archivo lo edita alguien no confiable).

Ver también: `docs/DEPLOY-VPS-AND-INDEX.md` (deploy CI vs watcher vs índice de conocimiento).

---

## 3. Docker y Compose (plataforma)

Ruta del compose: **`/opt/opsly/infra`**. El `.env` efectivo es **`/opt/opsly/.env`** (Doppler / `vps-bootstrap.sh`).

```bash
cd /opt/opsly/infra
COMPOSE="docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml"

# Estado de contenedores (si docker responde; si cuelga, revisar daemon: sudo systemctl status docker)
$COMPOSE ps -a

# Logs rápidos (sustituye el nombre del servicio: traefik, app, admin, portal, orchestrator, …)
docker logs --tail 80 infra-app-1 2>/dev/null || docker ps --format '{{.Names}}' | head -20
```

**Servicios típicos en compose:** `traefik`, `app` (API), `admin`, `portal`, `redis`, `mcp`, `llm-gateway`, `orchestrator`, `context-builder`, etc. Los nombres de contenedor pueden variar (`docker ps`).

**Reinicio selectivo (kill switch suave):**

```bash
cd /opt/opsly/infra
docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml up -d --no-deps --force-recreate orchestrator
```

Ajusta `orchestrator` por `app`, `llm-gateway`, `context-builder`, etc.

---

## 4. Health checks públicos (HTTPS)

Sustituye `<PLATFORM_DOMAIN>` por tu base (ej. `ops.smiletripcare.com`):

```bash
curl -sf "https://api.<PLATFORM_DOMAIN>/api/health"
curl -sfI "https://admin.<PLATFORM_DOMAIN>/"
curl -sfI "https://portal.<PLATFORM_DOMAIN>/login"
```

Opcional: orchestrator health si está expuesto internamente o vía Traefik según tu compose.

---

## 5. Doppler y `.env` en el VPS

- **Proyecto / config:** `ops-intcloudsysops` / `prd` (alineado con `config/opsly.config.json`).
- En el servidor, Doppler suele estar con token scoped a `/opt/opsly` — **`cd /opt/opsly`** antes de `doppler secrets get …`.

Regenerar `.env` tras cambiar secretos:

```bash
cd /opt/opsly
./scripts/vps-bootstrap.sh    # idempotente; revisa documentación del script si falla
```

Luego recrear servicios que lean esas variables (compose `up` como arriba).

**Nunca** pegues tokens en tickets, chat ni logs.

---

## 6. Git y despliegue

| Acción | Dónde |
|--------|--------|
| Código fuente | `main` en `github.com/cloudsysops/opsly` |
| Imágenes | GHCR `ghcr.io/cloudsysops/intcloudsysops-*` |
| Deploy automático | Workflow **Deploy** en `.github/workflows/deploy.yml` (tras push a `main` y build OK) |
| Estado operativo humano | `AGENTS.md` (URL raw para agentes) |

En el VPS el deploy hace `git fetch` + `reset --hard` a `main` y `docker compose pull/up` — no confundir con `opsly-watcher` (eso empuja docs **desde** el VPS a GitHub).

---

## 7. Scripts útiles (desde raíz del repo)

Ejecutar en **Mac** con repo clonado o en **`/opt/opsly`** en el VPS según el script.

| Script | Uso |
|--------|-----|
| `./scripts/validate-config.sh` | Comprueba JSON, DNS, SSH, Doppler (sin volcar secretos) |
| `./scripts/vps-bootstrap.sh` | Genera/actualiza `/opt/opsly/.env` desde Doppler |
| `./scripts/vps-first-run.sh` | Primer arranque / pulls (ver prerequisitos en repo) |
| `./scripts/index-knowledge.sh` | Regenera `config/knowledge-index.json` (Context Builder / RAG) |
| `./scripts/onboard-tenant.sh` | Alta de tenant + stack (ver `--help`) |
| `./scripts/opsly.sh` | `status`, `start-tenant`, `create-tenant` (wrapper; `SSH_HOST` por defecto Tailscale) |
| `./scripts/notify-discord.sh` | Notificación (requiere webhook en Doppler) |

**Dry-run** donde el script lo soporte: `--dry-run` o `DRY_RUN=true`.

---

## 8. Tenants (stacks por cliente)

Los compose por tenant viven bajo `tenants/` (en el VPS, rutas montadas según compose). Comandos típicos:

```bash
./scripts/opsly.sh status
./scripts/opsly.sh start-tenant <slug> --wait
# Onboarding completo (email/plan alineados a Supabase):
./scripts/onboard-tenant.sh --slug <slug> --email <owner@correo> --plan startup|business|enterprise --yes
```

URLs esperadas (plantilla): `https://n8n-<slug>.<PLATFORM_DOMAIN>/`, `https://uptime-<slug>.<PLATFORM_DOMAIN>/`.

---

## 9. GitHub Actions

- Revisa **Actions → Deploy** (y **CI**) en el repo: último run en verde antes de asumir que el VPS tiene la última imagen.
- Secretos del workflow: `PLATFORM_DOMAIN`, `VPS_*`, tokens de build, etc. — documentados en cabeceras de `.github/workflows/deploy.yml`.

---

## 10. Supabase y API admin

- Operaciones de datos: schema `platform`, tablas `tenants`, etc. — ver `supabase/migrations` y runbooks.
- API admin: rutas bajo `/api/tenants`, métricas, etc., con `Authorization: Bearer` + `PLATFORM_ADMIN_TOKEN` (valor solo en Doppler).

---

## 11. Incidencias y límites

- **Disco:** `df -h`, `docker system df`; prune con cuidado (no borrar volúmenes de datos sin criterio).
- **Traefik / ACME:** certificados y DNS; ver `docs/DNS_SETUP.md`, ADR-002/005.
- **Redis:** contraseña en `.env`; orquestador y workers dependen de Redis.
- **Incidentes:** `docs/runbooks/incident.md`.

---

## 12. Documentación relacionada

| Doc | Contenido |
|-----|-----------|
| `AGENTS.md` | Estado vivo del proyecto, bloqueantes, URL raw |
| `VISION.md` | Producto y fases |
| `docs/runbooks/admin.md` | Runbook corto admin |
| `docs/runbooks/incident.md` | Incidentes |
| `docs/AUTO-PUSH-WATCHER.md` | Servicio `opsly-watcher` |
| `docs/DEPLOY-VPS-AND-INDEX.md` | Deploy CI vs índice de conocimiento |
| `docs/SECURITY_CHECKLIST.md` | Seguridad |
| `docs/CONTEXT-BUILDER.md` | Context builder + índice |
| `docs/OPENCLAW-ARCHITECTURE.md` | OpenClaw / colas |

---

## 13. Checklist rápido post-cambio

1. `npm run type-check` en local antes de merge a `main` (o confiar en CI).
2. Push a `main` → esperar **Deploy** verde.
3. En VPS: health `curl` API + smoke admin/portal.
4. Si cambiaste muchos `.md`: `./scripts/index-knowledge.sh` en el entorno que alimenta al Context Builder.

---

*Última revisión alineada al monorepo Opsly; las IPs y dominios de ejemplo deben sustituirse por los de tu entorno.*
