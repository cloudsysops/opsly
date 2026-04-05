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
   - Si la raw da **404** pese a repo público: revisar org/repo/rama (`main`), probar vista web `https://github.com/cloudsysops/opsly/blob/main/AGENTS.md`, o **adjuntar / pegar** este archivo completo en el chat (alternativa válida).
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

**Fecha última actualización:** 2026-04-05 (usb-kit pendrive + plantillas profesionales `.github/` + esta sincronización de AGENTS)

**Completado ✅**

*Sesión agente Cursor — deploy staging VPS (2026-04-04 / 2026-04-05, cronología):*
- **`./scripts/validate-config.sh`:** LISTO PARA DEPLOY (JSON, DNS, Doppler críticos, SSH VPS OK).
- **`git pull` en `/opt/opsly`:** falló por `scripts/vps-first-run.sh` **untracked** (copia manual previa); merge abortado. Fix documentado: `cp scripts/vps-first-run.sh /tmp/…bak && rm scripts/vps-first-run.sh` luego `git pull origin main`.
- **Post-pull:** `fast-forward` a `main` reciente (incluye `vps-bootstrap.sh`, `vps-first-run.sh` trackeados). Primer `./scripts/vps-bootstrap.sh` falló: **Doppler CLI no estaba en PATH** en el VPS.
- **Doppler en VPS:** instalación vía `apt` requiere **root/sudo**; desde SSH no interactivo falló sin contraseña. Tras preparación en el servidor, **`doppler --version`** → `v3.75.3` (CLI operativa).
- **Service token:** `doppler configs tokens create` **desde el VPS falló** (sin sesión humana); token creado **desde Mac** (`vps-production-token`, proyecto `ops-intcloudsysops` / `prd`) y `doppler configure set token … --scope /opt/opsly` en el VPS. **Rotar** token si hubo exposición en chat/logs.
- **`doppler secrets --only-names` en VPS:** OK (lista completa de vars en `prd`).
- **`./scripts/vps-bootstrap.sh`:** OK — `doppler secrets download` → `/opt/opsly/.env`, red `traefik-public`, directorios. En el resumen de nombres del `.env` apareció una línea **ajena a convención `KEY=VALUE`** (cadena tipo `wLzJ…`); revisar `.env` en VPS por líneas sueltas o valores sin clave.
- **`./scripts/vps-first-run.sh`:** falló con **`denied`** al pull de `ghcr.io/cloudsysops/intcloudsysops-{api,admin}:latest` hasta tener **`docker login ghcr.io`**.
- **Login GHCR desde Doppler (estado inicial):** en `prd` aún no existían `GHCR_TOKEN` / `GHCR_USER`; el `get` desde VPS fallaba hasta poblar `prd` (ver actualización siguiente).
- **`context/system_state.json`:** en sesiones previas quedó bloqueo `git_pull_blocked_untracked` / `blocked_vps_git_merge`; tras GHCR + first-run + health conviene alinear `vps` / `deploy_staging` / `next_action` otra vez.

*Doppler / GHCR — cierre de brecha `prd` y login Docker (2026-04-05):*
- En **`stg`** ya existía **`GHCR_USER`**; el PAT **no** estaba como `GHCR_TOKEN` sino como **`TOKEN_GH_OSPSLY`** (en Doppler los nombres de secreto **solo** pueden usar mayúsculas, números y **`_`** — no guiones; `TOKEN-GH-OSPSLY` no es válido en CLI).
- **`GHCR_TOKEN` en `stg`:** el `get` directo falló; fuente del PAT para copiar a `prd`: **`TOKEN_GH_OSPSLY`** en `stg`.
- **Sincronización a `prd`:** `doppler secrets set GHCR_USER=… GHCR_TOKEN=… --project ops-intcloudsysops --config prd` leyendo usuario desde `stg` y token desde `TOKEN_GH_OSPSLY`. Cualquier `secrets set` que muestre el valor en tabla CLI implica **rotar el PAT en GitHub** y actualizar el secreto en Doppler si hubo exposición en logs/chat.
- **Verificación local sin imprimir valores:**  
  `doppler secrets get GHCR_TOKEN --plain --project ops-intcloudsysops --config prd >/dev/null && echo "GHCR_TOKEN prd: OK"` (igual para `GHCR_USER`).
- **`docker login` en el VPS con Doppler:** un one-liner `ssh … "doppler secrets get …"` **sin** `cd /opt/opsly` falla con **`you must provide a token`** y **`username is empty`**, porque el **service token** está configurado con **`doppler configure set token … --scope /opt/opsly`** y solo aplica bajo ese directorio. **Obligatorio:** `cd /opt/opsly &&` antes de `doppler secrets get` y el pipe a `docker login ghcr.io … --password-stdin`.
- **Resultado verificado:** `Login Succeeded` en el VPS (Docker avisa que las credenciales quedan en `~/.docker/config.json` sin credential helper; opcional configurar helper).
- **Verificación rutas en VPS:** `ls /opt` incluye `opsly`; `ls /opt/opsly` muestra árbol del repo (`apps`, `infra`, `scripts`, etc.).
- **`vps-first-run.sh` tras login GHCR (2026-04-05):** falló con **`not found`** al resolver `ghcr.io/cloudsysops/intcloudsysops-api:latest` (y pull de `admin` interrumpido). **Auth GHCR OK;** el bloqueo actual es que **esa referencia de imagen/tag no existe** en el registry (o el nombre del paquete en GHCR difiere). Alinear `APP_IMAGE` / `ADMIN_APP_IMAGE` en Doppler con paquetes reales o **publicar** imágenes con CI.
- **Inventario GHCR desde Mac (`gh api`):** sin comillas, **zsh** expande `?` en la URL → `no matches found`. Con URL entre comillas, sin scope **`read:packages`** en el token de `gh` → **HTTP 403** (*You need at least read:packages scope to list packages*). Para listar: `gh api '/orgs/cloudsysops/packages?package_type=container' --jq '.[].name'` con token adecuado.
- **Workflows en `.github/workflows/`:** `backup.yml`, `ci.yml`, `cleanup-demos.yml`, `deploy-staging.yml`, `deploy.yml`, `validate-context.yml`.
- **Dockerfiles:** existen `apps/api/Dockerfile` y `apps/admin/Dockerfile` en el repo.

*CI — `deploy.yml`: build+push GHCR y deploy por pull en VPS (commit `0e4123b`, 2026-04-05):*
- El job **`build`** (solo Node build en Actions) se sustituyó por **`build-and-push`:** `permissions: contents: read`, `packages: write`; **`docker/login-action@v3`** contra `ghcr.io` con `${{ github.actor }}` y **`${{ secrets.GITHUB_TOKEN }}`** (si el login en Actions falla por token vacío, usar **`${{ github.token }}`** según documentación de GitHub).
- Dos pasos **`docker/build-push-action@v5`:** `context: .`, `file: apps/api/Dockerfile` y `apps/admin/Dockerfile`, **`push: true`**, tags **`ghcr.io/cloudsysops/intcloudsysops-api:latest`** y **`ghcr.io/cloudsysops/intcloudsysops-admin:latest`**.
- Job **`deploy`** ahora **`needs: build-and-push`**. Script SSH en VPS: `git fetch` / `reset` en `/opt/opsly`, **`npm ci`** en raíz (sin `npm run build` en `apps/api` ni `apps/admin`); en **`infra/`** → **`docker compose -f docker-compose.platform.yml pull`** y **`docker compose up -d --no-deps app admin`** (sin **`--build`**).
- **`infra/docker-compose.platform.yml`:** imágenes por defecto pasan a **`ghcr.io/cloudsysops/intcloudsysops-api:latest`** y **`ghcr.io/cloudsysops/intcloudsysops-admin:latest`** (sustituye `tu-org` en los defaults).
- **Doppler `prd`:** **`APP_IMAGE`** y **`ADMIN_APP_IMAGE`** actualizados a esas mismas URLs para alinear `.env` del VPS tras bootstrap.
- **Contexto histórico:** antes de este cambio, `deploy.yml` hacía build Next en el VPS con **`compose --build app`** únicamente; **`vps-first-run`** y pulls manuales dependían de imágenes publicadas en GHCR que aún no existían → **`not found`**. El pipeline anterior queda **obsoleto** respecto al flujo GHCR descrito arriba.

*Intento deploy staging → `https://api.ops.smiletripcare.com/api/health` (2026-04-05):*
- **Paso 1 — Auditoría:** revisados `config/opsly.config.json` (sin secretos), `.env.local.example` (placeholders), `infra/docker-compose.platform.yml` (solo nombres de vars), y por SSH el árbol `.env*` bajo `/opt/opsly` (`.env`, `.env.example`, `.env.local.example`, `.env.swp`).
- **Hallazgo:** en VPS y en Doppler `prd` hay claves **truncadas o placeholder** (p. ej. JWT tipo `eyJ...`, Stripe demasiado corto, `change-me` en `PLATFORM_ADMIN_TOKEN` / `REDIS_PASSWORD`). **No** se ejecutó `doppler secrets upload` desde el `.env` del VPS para no contaminar Doppler.
- **Paso 2 — `config/doppler-missing.txt`:** añadida sección *Auditoría 2026-04-05* con causa del bloqueo y orden sugerido de corrección (Supabase → Stripe → tokens plataforma → Redis / `REDIS_URL`).
- **Paso 3 — `./scripts/validate-config.sh`:** JSON y campos OK; DNS `api` / base / `admin` → IP VPS OK; SSH OK; Doppler ⚠️ `PLATFORM_ADMIN_TOKEN` y `REDIS_PASSWORD` placeholder → resultado **REVISAR** (no “LISTO PARA DEPLOY”). Pasos 4–6 (`vps-bootstrap`, `vps-first-run`, `curl` health) **no ejecutados** por política “parar si falla”.
- **Estado persistido:** `context/system_state.json` con `deploy_staging.status: blocked_secrets`, `doppler.fix_in_order`, `next_action` encadenado a corregir Doppler → validate → bootstrap; espejo en `.github/system_state.json`. Repo: commit `docs(deploy): audit staging bloqueado por secretos Doppler/VPS` (`8cb94f5`).
- **Sesión acceso / handoff (misma fecha):** comprobado con `gh repo view` que `cloudsysops/opsly` sigue **PUBLIC**; guía si `raw.githubusercontent.com` falla (URL, rama, blob, o pegar `AGENTS.md`). **Aclaración modelo de datos:** en `system_state.json`, `next_action` es campo en la **raíz** del JSON; `deploy_staging` es un **objeto aparte** (`status`, `notes`, etc.) — no son el mismo campo. **Orden antes de paso 4:** corregir Doppler → `./scripts/validate-config.sh` hasta **LISTO PARA DEPLOY** → entonces `vps-bootstrap.sh` (no arrancar bootstrap con Doppler roto). Commits de referencia: `8cb94f5` (audit deploy), `6ac453d` (docs AGENTS).
- **Segunda ola deploy (2026-04-05, tarde):** VPS `.env` en disco seguía con JWT/Stripe **truncados** (no se subió eso a Doppler). Se aplicó en Doppler `prd`: `PLATFORM_ADMIN_TOKEN`, `NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN`, `REDIS_PASSWORD`, `REDIS_URL`; `APP_IMAGE` / `ADMIN_APP_IMAGE` → `ghcr.io/cloudsysops/intcloudsysops-{api,admin}:latest`. `./scripts/validate-config.sh` → **LISTO PARA DEPLOY**. En el VPS **no** había `vps-bootstrap.sh` en el repo (luego corregido en **`9cb18cb`**); **no** hay CLI `doppler` en el servidor → `doppler secrets download` en Mac + `scp` de `.env` a `/opt/opsly/.env`. Se copió manualmente `vps-first-run.sh`; `docker compose up` falló: **`denied` al pull GHCR**. Health con `curl -k`: **404**. `context/system_state.json`: `deploy_staging.blocked_ghcr_pull`, `doppler` completo. Sync **`5c3f843`**.
- **Higiene:** tokens de plataforma/Redis usados en sesión quedaron en chat / logs; **rotar** en Doppler si hay riesgo de exposición.
- **Scripts VPS en `main` (2026-04-05):** `scripts/vps-bootstrap.sh` y `scripts/vps-first-run.sh` pasaron a estar **trackeados** y pusheados — commit **`9cb18cb`** (`chore(scripts): track vps-bootstrap and vps-first-run for VPS deploy`). En el servidor: `cd /opt/opsly && git pull origin main` antes de `./scripts/vps-bootstrap.sh`.
- **GHCR — sesiones siguientes:** flujo acordado: PAT GitHub `read:packages` → `docker login ghcr.io` en el VPS → opcional `doppler secrets set GHCR_TOKEN GHCR_USER` → bootstrap → first-run → health. **Aún no se pegó el PAT en el chat** (agente en espera); ejecutar login de forma segura (SSH interactiva o token no expuesto en historial).

*USB kit / pendrive (2026-04-05):*
- Carpeta **`tools/usb-kit/`** con `pen-check-tools.sh`, `pen-sync-repo.sh`, `pen-ssh-vps.sh`, `pen-hint-disks.sh`, `lib/usb-common.sh`, `pen.config.example.json`, `README.md`. Convención: **disk3** (macOS `diskutil`) = instalador Ubuntu booteable; en el pen de datos, **clon completo del repo** (no solo la carpeta kit). `pen.local.json` (copia del example) para `ssh.target` tipo `vps-dragon`; archivo **gitignored**. Commits en `main`: `feat(tools): usb-kit…` (`99faa96`) + sync contexto (`8326b68`).

*Plantillas y gobernanza GitHub (2026-04-05):*
- **`.github/CODEOWNERS`:** rutas `apps/api/`, `scripts/`, `supabase/` → `@cloudsysops/backend`; `apps/admin/`, `apps/web/` → `@cloudsysops/frontend`; `infra/`, `infra/terraform/` → `@cloudsysops/infra`; fallback `*` → `@cboteros`. Cabecera en español explica orden (última regla que coincide gana). **Pendiente org:** crear equipos en GitHub si no existen o sustituir handles.
- **`.github/PULL_REQUEST_TEMPLATE.md`:** reemplaza `pull_request_template.md` (nombre estándar en mayúsculas); bloque inicial en español; secciones tipo de cambio, impacto en tenants, checklist (type-check, Doppler, `./scripts/validate-config.sh`, `AGENTS.md` si arquitectura, `terraform plan` si `infra/terraform/`), Terraform/infra, notas al revisor.
- **`.github/ISSUE_TEMPLATE/bug_report.yml`:** entornos `vps-prod` / `staging` / `local`; campo impacto en tenants; comentarios YAML sobre diferencia **formulario .yml** vs **plantilla .md**.
- **`feature_request.yml`:** problema, propuesta, alternativas; desplegable **fase** (Fase 1–3, No aplica); **área** (api, admin, infra, billing, onboarding, terraform).
- **`config.yml`:** `blank_issues_enabled: false`; `contact_links` → URL raw de `AGENTS.md` como contexto.
- **`tenant_issue.yml`:** cabecera explicativa añadida (formulario sin cambio funcional).
- **`.github/copilot-instructions.md`:** convenciones Opsly, archivos de referencia, sección **qué NO hacer** (K8s/Swarm/nginx, secretos en código, saltear validate-config, terraform sin plan). Contenido saneado (sin volcado accidental de AGENTS).
- **`.github/README-github-templates.md`:** guía en español (tabla archivo → propósito → cuándo → quién; reutilización en otros repos).
- **Workflows** en `.github/workflows/` **no** se modificaron en esta tarea.
- Commit de referencia: `docs(github): add professional templates and explain each file` (`a82180e`).

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
- **GitHub:** repo `cloudsysops/opsly` **público** para que Claude u otros lean sin clonar; plantillas en `.github/` documentadas en `README-github-templates.md`
- `docs/adr/` — ADR-001 (compose por tenant), ADR-002 (Traefik v3), ADR-003 (Doppler), ADR-004 (Supabase schema por tenant)
- `agents/prompts/` — `claude-architect.md`, `cursor-executor.md`
- `context/system_state.json` — fase, VPS, DNS, `deploy_staging`, `doppler`, `repo` (vía `update-state.js`); `next_action` según bloqueo actual; espejo `.github/system_state.json` vía `update-agents.sh` / post-commit
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
  cleanup-demos.yml, validate-context.yml); CODEOWNERS; PULL_REQUEST_TEMPLATE.md;
  ISSUE_TEMPLATE/*.yml; copilot-instructions.md; README-github-templates.md
- config/opsly.config.json (fuente de verdad central)
- docs/ (ARCHITECTURE.md, TEST_PLAN.md, DNS_SETUP.md, VPS-ARCHITECTURE.md)
- README.md completo
- .githooks/ (pre-commit type-check, post-commit contexto) + plantillas GitHub
  (CODEOWNERS, issue forms, PR template, guía README-github-templates)
- AGENTS.md (este archivo)
- Auditoría secrets: `doppler secrets upload` desde `/opt/opsly/.env` (18 claves
  de la lista audit) + alineación `PLATFORM_*` / `NEXT_PUBLIC_*` dominio con
  `config/opsly.config.json` (2026-04-05)
- `config/doppler-missing.txt` (instrucciones + auditoría 2026-04-05 deploy bloqueado)
- `tools/usb-kit/` (scripts portátiles pendrive: chequeo CLI, sync git, SSH VPS, hints disco; README **disk3** Ubuntu booteable)
- `.github/copilot-instructions.md`, `.github/README-github-templates.md`,
  `.github/AGENTS.md` (espejo de este archivo cuando está sincronizado)

**En progreso 🔄**
- **CI `Deploy` en GitHub Actions:** tras push a `main`, **`build-and-push`** debe publicar las dos imágenes en GHCR y **`deploy`** debe hacer **`pull` + `up`** en el VPS; revisar run en *Actions → Deploy* si falla login GHCR, permisos `packages:write` o SSH/health.
- Deploy staging — imágenes **`ghcr.io/cloudsysops/intcloudsysops-{api,admin}:latest`** quedan definidas en compose + Doppler; en VPS conviene **`./scripts/vps-bootstrap.sh`** (o `doppler secrets download`) para refrescar `.env` y **`docker login ghcr.io`** con credenciales con pull.
- Con Doppler CLI + token con scope `/opt/opsly`: **`./scripts/vps-bootstrap.sh`** regenera `.env`; ejecutar tras cambiar imágenes o secretos en `prd`.
- DNS: ops.smiletripcare.com → 157.245.223.7 ✅

**Pendiente ⏳**
- En GitHub: comprobar que existen los equipos `@cloudsysops/backend`, `@cloudsysops/frontend`, `@cloudsysops/infra` (o ajustar `CODEOWNERS`) para que las solicitudes de revisión no fallen.
- Confirmar **health 200** tras un deploy verde; si Traefik/Redis no están arriba, **`vps-first-run.sh`** o compose completo antes de solo `app admin`.
- Revisar `/opt/opsly/.env` por línea corrupta / nombre falso en listados de bootstrap.
- Rotación de tokens de servicio Doppler / PAT si hubo exposición en historial.
- `DOPPLER_TOKEN` en `/etc/doppler.env` — opcional si se usa solo `doppler configure set token --scope` (como en esta sesión).
- `NEXTAUTH_*`: no usado en el código actual; ver `doppler-missing.txt`
- Primer tenant de prueba: smiletripcare

---

## 🔄 Próximo paso inmediato

<!-- Una sola tarea concreta. Actualizar al final de cada sesión -->
```bash
# Mac — comprobar prd sin imprimir valores:
doppler secrets get GHCR_TOKEN --plain --project ops-intcloudsysops --config prd >/dev/null && echo "GHCR_TOKEN prd: OK"
doppler secrets get GHCR_USER --plain --project ops-intcloudsysops --config prd >/dev/null && echo "GHCR_USER prd: OK"

# VPS — obligatorio cd /opt/opsly (scope del token de servicio):
ssh vps-dragon 'cd /opt/opsly && echo "$(doppler secrets get GHCR_TOKEN --plain)" | docker login ghcr.io -u "$(doppler secrets get GHCR_USER --plain)" --password-stdin'
# → Login Succeeded

ssh vps-dragon 'cd /opt/opsly && ./scripts/vps-first-run.sh'   # requiere imágenes existentes en GHCR o ajustar .env/compose
curl -sf https://api.ops.smiletripcare.com/api/health | jq .
# Tras health OK: actualizar context/system_state.json + ./scripts/update-agents.sh
./scripts/validate-config.sh   # local; debe seguir en LISTO PARA DEPLOY
# Listar paquetes GHCR (Mac): gh auth refresh -s read:packages; gh api '/orgs/cloudsysops/packages?package_type=container' --jq '.[].name'
# Tras cambios en deploy.yml: push a main dispara build+push; VPS recibe imágenes vía job deploy (pull).
```

---

## 🔄 Bloqueantes activos

<!-- Qué está roto o bloqueado ahora mismo -->

- [x] Bulk upload Doppler desde VPS `.env` (lista audit) — hecho 2026-04-05
- [x] **validate-config** → LISTO PARA DEPLOY (2026-04-05, tras tokens plataforma/Redis + imágenes GHCR en Doppler)
- [x] **GHCR en `prd` + login Docker en VPS** (2026-04-05): `GHCR_USER` / `GHCR_TOKEN` en `prd`; `docker login ghcr.io` con Doppler **solo** con `cd /opt/opsly`.
- [x] **Publicación de imágenes a GHCR** vía **`deploy.yml`** (`build-and-push`, 2026-04-05, commit `0e4123b`). Verificar en UI de Packages que existan los paquetes y que el último run de **Deploy** sea **success**.
- [x] **`.env` VPS** alineado con Doppler vía **`vps-bootstrap.sh`** + Doppler en VPS (sesión 2026-04-05); repetir bootstrap tras cambios en `prd`
- [x] **Doppler CLI + token con scope `/opt/opsly`** en VPS (sesión 2026-04-05) — alternativa a solo `scp`

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
| 2026-04-05 | No `doppler secrets upload` desde VPS mientras haya JWT/Stripe truncados | Evitar sobrescribir Doppler prd con valores inválidos del `.env` de `/opt/opsly` |
| 2026-04-05 | No `vps-bootstrap` hasta `validate-config` en verde | Bootstrap solo propaga lo que Doppler ya tiene bien |
| 2026-04-05 | Deploy `.env` al VPS sin Doppler CLI: `doppler secrets download` local + `scp` | VPS no tenía `doppler` en PATH; `vps-bootstrap.sh` ausente en disco remoto |
| 2026-04-05 | Stack bloqueado hasta `docker login ghcr.io` en VPS | Pull `ghcr.io/cloudsysops/*` devolvió `denied` |
| 2026-04-05 | `vps-bootstrap.sh` + `vps-first-run.sh` en git (`9cb18cb`) | El VPS puede `git pull`; antes faltaban en disco remoto |
| 2026-04-05 | Untracked `scripts/vps-first-run.sh` en VPS bloquea `git pull` | Git no puede sobrescribir archivo sin track; backup + `rm` antes de merge |
| 2026-04-05 | Service token Doppler creado en Mac si falla `tokens create` en VPS | VPS sin login humano a Doppler; `configure set token --scope /opt/opsly` |
| 2026-04-05 | `doppler secrets get GHCR_*` debe coincidir con secretos en `prd` | Login GHCR automatizado solo si nombres y config son correctos en Doppler UI |
| 2026-04-05 | PAT en `stg` como `TOKEN_GH_OSPSLY`; en `prd` usar `GHCR_TOKEN` + `GHCR_USER` | La CLI no admite guiones en nombres; los scripts de deploy esperan `GHCR_*` en `prd` |
| 2026-04-05 | En VPS, `doppler secrets get` con token scoped requiere `cd /opt/opsly` | Sin ese cwd, Doppler responde *you must provide a token* y `docker login` ve usuario vacío |
| 2026-04-05 | `deploy.yml`: job `build-and-push` publica API+Admin a GHCR; VPS hace `compose pull` + `up app admin` | Unifica imágenes con `vps-first-run`/Doppler; commit `0e4123b` |
| 2026-04-05 | (Histórico) `deploy.yml` solo `compose --build app` en VPS sin push GHCR | Sustituido por flujo build+push + pull; ver fila anterior |
| 2026-04-05 | `gh api` URL con `?` debe ir entre comillas en zsh | Evita *no matches found* por glob del `?` |
| 2026-04-05 | Listar paquetes org en GHCR requiere `read:packages` en token `gh` | Sin scope → HTTP 403 |
| 2026-04-05 | `tools/usb-kit/` en repo: clon completo en USB; **disk3** = Ubuntu booteable (macOS); sin secretos en pen | Flujo rescate/otras máquinas alineado a `opsly.config.json` + `pen.local.json` opcional |
| 2026-04-05 | Plantillas `.github/`: CODEOWNERS por equipo/ruta; issues en formulario YAML; PR con checklist validate-config + AGENTS + Terraform; Copilot con límites explícitos; `blank_issues_enabled: false` + enlace raw `AGENTS.md` | Gobernanza homogénea; workflows no tocados (`a82180e`) |

---

## Estructura del repo

```
.
├── tools/
│ └── usb-kit/        # Scripts portátiles pendrive (disk3 Ubuntu booteable; ver README)
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
├── .github/                 # workflows, espejo AGENTS/VISION/system_state, Copilot,
│                            # CODEOWNERS, ISSUE_TEMPLATE, PULL_REQUEST_TEMPLATE, README-github-templates
├── .githooks/               # pre-commit (type-check), post-commit (sync contexto)
├── package.json             # workspaces + turbo
├── README.md
├── VISION.md                # Norte del producto (fases, ICP, límites agentes)
└── AGENTS.md                # Este archivo
```
