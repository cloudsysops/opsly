# Guía de operaciones: centro de mando (`opsly-admin`)

**Estado:** Activo  
**Contexto:** Arquitectura híbrida (VPS + worker Mac 2011) + centro de desarrollo (`opsly-admin`)  
**Objetivo:** Definir el rol, la configuración y los flujos de trabajo para la máquina principal del desarrollador (`opsly-admin`).

---

## Resumen de arquitectura (roles de máquina)

| Máquina | Nombre | Rol | Servicios clave |
| :--- | :--- | :--- | :--- |
| **Mac principal** | `opsly-admin` | **Centro de mando** (humano + Cursor) | Desarrollo, Git, Docker Desktop (DragonB), CLI Opsly |
| **VPS** | `vps-dragon` | **Control plane** (cerebro de red) | Traefik, API, Admin, Portal, MCP (HTTP), Redis, LLM Gateway |
| **Worker** | `opsly-worker` | **Compute plane** (músculo) | Orchestrator (worker), Ollama, cargas pesadas opcionales |

---

## 1. Conexión Cursor ↔ MCP (en `opsly-admin`)

Para que Cursor use herramientas Opsly expuestas en el VPS, hay que alinear el **transporte** con lo que realmente implementa `apps/mcp`.

### A. Determinar el transporte (verificación requerida)

1. Revisar `apps/mcp/src/index.ts`, `apps/mcp/src/http-health.ts` y el enrutado en Traefik (`infra/docker-compose.platform.yml`, servicio `mcp`).
2. **HTTP en el contenedor:** el proceso escucha en `PORT` (por defecto **3003**) y expone al menos **`GET /health`** y rutas **OAuth** (`/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/oauth/token`). No asumir un path `/sse` si no aparece en el código ni en la documentación del cliente MCP.
3. **Público HTTPS:** Traefik publica el host **`https://mcp.${PLATFORM_DOMAIN}`** hacia el puerto 3003 del servicio. Es la URL coherente para pruebas desde fuera (`curl -sf https://mcp.<dominio>/health`).
4. **Stdio (`MCP_TRANSPORT=stdio` / `--stdio`):** integraciones locales; Cursor puede requerir un **puente** (túnel SSH, proceso local) si no usáis URL remota documentada por la versión de Cursor.

**Nota:** No asumir que `http://100.x.x.x:3003/...` expone MCP completo sin comprobarlo; preferir **`https://mcp.${PLATFORM_DOMAIN}`** cuando Traefik y DNS estén bien configurados.

### B. Autenticación (si aplica)

OAuth PKCE y metadatos están en el servidor MCP; según el cliente, puede hacer falta configurar tokens o flujo en la UI de Cursor. Variables como `PLATFORM_ADMIN_TOKEN` aplican a la **API** (`/api/...`), no sustituyen la configuración OAuth del MCP sin revisar el flujo concreto.

---

## 2. Docker y DragonB (en `opsly-admin`)

Objetivo: usar el disco externo **DragonB** como almacén principal de datos de Docker Desktop y liberar el SSD interno.

1. Montar DragonB (p. ej. `/Volumes/DragonB`).
2. **Docker Desktop:** Settings → Resources → Advanced → **Disk image location** → elegir una carpeta bajo DragonB (p. ej. `/Volumes/DragonB/docker-data`) → **Move** si ya había imágenes locales.
3. Esperar a que termine la migración sin interrumpir.

**Aclaración:** el data-root de Docker en la Mac **no** reemplaza las imágenes en el VPS ni en el worker; cada host tiene su propio daemon.

---

## 3. Flujo Git (desde `opsly-admin`)

`opsly-admin` es la fuente habitual de cambios en el código.

1. **Desarrollo:** editar en el clon del repo (DragonB o disco interno).
2. **Commit / push:** `git commit`, `git push origin main` (ver `docs/SESSION-GIT-SYNC.md`).
3. **Despliegue al VPS:**
   - **CI:** GitHub Actions construye y publica imágenes GHCR; el job de deploy hace `compose pull` + `up` en `/opt/opsly`.
   - **Manual:** `ssh vps-dragon`, `cd /opt/opsly && git pull --ff-only`, luego desde `infra/` con `--env-file /opt/opsly/.env`:
     ```bash
     docker compose -f docker-compose.platform.yml pull
     docker compose -f docker-compose.platform.yml up -d
     ```
   - Usar **`--build`** solo si construís imágenes en el VPS; en el flujo típico las imágenes vienen de GHCR.

---

## 4. Acceso SSH (desde `opsly-admin`)

Detalle de usuarios y hosts: **`docs/SSH-USERS-FOR-AGENTS.md`**.

### `~/.ssh/config` (ejemplo)

```sshconfig
Host vps-dragon
    HostName 100.120.151.91
    User vps-dragon
```

(O MagicDNS: `HostName vps-dragon.<tailnet>.ts.net`.)

### Uso típico

Desde `/opt/opsly/infra` en el VPS (ajustar rutas si el proyecto difiere):

```bash
# Logs del orchestrator (nombre de contenedor en compose: opsly_orchestrator)
ssh vps-dragon "docker logs -f opsly_orchestrator"

# Reiniciar la API (servicio compose: app — no confundir con nombre DNS api.*)
ssh vps-dragon "cd /opt/opsly/infra && docker compose --env-file /opt/opsly/.env -f docker-compose.platform.yml restart app"
```

**Redis:** el servicio en compose se llama `redis`; el nombre del contenedor depende del proyecto Compose (p. ej. `infra-redis-1`). Para una orden rápida: `docker ps` en el VPS y `docker exec -it <contenedor_redis> redis-cli -a ...`.

---

## 5. Flujo operativo realista (agente)

1. **Usuario (`opsly-admin`):** pide una tarea en Cursor.
2. **Cursor / MCP / API:** según configuración, las herramientas pueden encolar trabajo en **Redis** (VPS) vía orchestrator.
3. **Worker (`opsly-worker`):** consumidores BullMQ contra el mismo `REDIS_URL` (Tailscale); ejecuta OAR/orchestrator en modo worker cuando aplique.
4. **`POST /api/tools/execute`:** acciones `fs_read`, `list_adrs`, etc., requieren **`Authorization` / `x-admin-token`** alineado con `PLATFORM_ADMIN_TOKEN` y `OPSLY_REPO_ROOT` resuelto en el servicio `app`.

### Checklist herramientas que leen/escriben código

- [ ] `PLATFORM_ADMIN_TOKEN` coherente entre quien llama a la API y el entorno del contenedor `app`.
- [ ] `OPSLY_REPO_ROOT` (o default `/opt/opsly`) coincide con el volumen montado en el servicio `app`.
- [ ] **Escritura en el monorepo:** el volumen del servicio `app` puede montar **`../:/opt/opsly`** (RW) para OAR/`fs_write`; ver **`docs/runbooks/e2e-hybrid-write.md`** (E2E y endurecimiento).

---

## Referencias

- **ADR-020:** Separación orchestrator/worker — `docs/adr/ADR-020-orchestrator-worker-separation.md`
- **SSH / usuarios:** `docs/SSH-USERS-FOR-AGENTS.md`
- **VPS + workers remotos:** `docs/ARCHITECTURE-DISTRIBUTED.md`, `docs/WORKER-SETUP-MAC2011.md`
- **Git / sesión:** `docs/SESSION-GIT-SYNC.md`
- **OAR:** `docs/design/OAR.md`
- **OpenClaw (MCP, colas):** `docs/OPENCLAW-ARCHITECTURE.md`
