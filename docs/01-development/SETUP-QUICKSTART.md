---
status: canon
owner: operations
last_review: 2026-05-15
---

# Opsly — guía rápida de setup (desarrollo)

Onboarding compacto: clone, Node, hooks, MCP, Slack (manual), entorno local y scripts reales. **Fuente de verdad de scripts:** `package.json` (`npm run`).

## 1. Prerrequisitos

```bash
node --version    # v20+; el repo usa Node 22 (ver `.nvmrc`)
command -v nvm    # https://github.com/nvm-sh/nvm
docker --version  # Si usas Compose local
git --version     # 2.30+
```

## 2. Clone y setup inicial

```bash
git clone https://github.com/cloudsysops/opsly.git
cd opsly

nvm install
nvm use

npm ci

# Hooks locales (post-commit: update-state, symlink AGENTS, context → .github, Discord,
# NotebookLM/Drive condicionales, agent-hooks, phase-detector — ver sección 8)
git config core.hooksPath .githooks

# Verificar
git config --get core.hooksPath   # Debe imprimir: .githooks
```

## 3. Configs de agentes — revisar

```bash
cat AGENTS.md
npm run   # o: jq '.scripts' package.json
npm run validate-structure
```

| Agente | Ruta | Notas |
| --- | --- | --- |
| Claude | `.claude/` | `settings.json`, skills en `skills/user/` |
| Codex | `.codex/` | OAuth Slack ↔ Codex es paso manual (web) |
| Cursor | `.cursor/rules/` | Reglas del IDE; MCP según versión de Cursor |
| Copilot | `.vscode/`, `.github/copilot-instructions.md` | Requiere suscripción Copilot |
| Hermes | `.hermes/` | Metering/routing; ver `docs/03-agents/HERMES-*.md` |

## 4. MCP (Model Context Protocol)

En el repo, `.mcp.json` define el servidor OpenClaw (stdio):

```json
{
  "mcpServers": {
    "opsly-openclaw": {
      "command": "npm",
      "args": ["run", "opsly:mcp:stdio"],
      "cwd": "${CLAUDE_PROJECT_DIR}"
    }
  }
}
```

**Claude Desktop (macOS/Linux):** destino típico `~/.config/Claude/claude_desktop_config.json` (Windows: `%APPDATA%\Claude\claude_desktop_config.json`).

**Importante:** si ya tienes otros `mcpServers` en ese archivo, **no sobrescribas** con `cp .mcp.json …` sin hacer backup y fusionar JSON a mano.

```bash
# Ejemplo solo si el archivo no existe o aceptas reemplazo total:
# cp .mcp.json ~/.config/Claude/claude_desktop_config.json
```

Reinicia Claude Desktop tras cambiar la config.

**Probar el servidor MCP desde el repo:**

```bash
npm run opsly:mcp:stdio
# Arranca stdio MCP; Ctrl+C para salir. Listado exacto de tools: apps/mcp/src/
```

## 5. Slack — pasos manuales

### a) OAuth en Codex (navegador)

1. <https://chatgpt.com/codex/cloud/settings/connectors>
2. Slack → **Connect more**
3. Workspace `intcloudsysops` (o el tuyo)
4. Aceptar permisos

### b) Instalar la app en el workspace (Slack)

1. Abre el workspace en el cliente web.
2. **Settings → Manage apps → Install** (flujo según UI actual).
3. Revisa scopes necesarios para tu caso (`chat:write`, `app_mentions:read`, etc.).

### c) Tokens en el dashboard de la app

1. <https://api.slack.com/apps> → app **op-sly** (o la tuya).
2. **OAuth & Permissions** → **Bot User OAuth Token** → `SLACK_BOT_TOKEN`
3. **Basic Information** → **Signing Secret** → `SLACK_SIGNING_SECRET`
4. Si usas **Socket Mode** (`apps/slack-bot` con Bolt): **App-Level Token** con scope `connections:write` → `SLACK_APP_TOKEN`

Guardar en **`.env` o `.env.local` no commiteados**, o en **Doppler** (`ops-intcloudsysops` / `prd` o el config que uses). Referencia de nombres: `.env.example` (sección Comunicación / Slack).

**Nota:** `apps/slack-bot` por defecto carga `dotenv` desde `.env.mcp` en código; alinear rutas con tu despliegue o variables de entorno del contenedor.

## 6. Variables de entorno

**Slack:** `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, y si aplica Socket Mode `SLACK_APP_TOKEN`.

**Doppler:** preferir `doppler login` + `doppler setup` (o token con scope al directorio del proyecto). **Evitar** pegar `DOPPLER_TOKEN` en `.env` que pueda acabar en copias o screenshots.

**Next / local:** según app, p. ej. `NEXT_PUBLIC_API_URL`, `PLATFORM_DOMAIN` — ver `.env.example`.

```bash
cp .env.example .env.local
# Editar; no commitear secretos
```

## 7. Stack local de desarrollo

**Opción A — Turbo dev**

```bash
npm run dev
```

**Opción B — Docker más cercano a prod**

```bash
./scripts/local-setup.sh
# o, según doc de infra:
docker network create traefik-public 2>/dev/null || true
docker compose -f infra/docker-compose.local.yml up -d
curl -sf http://api.opsly.local/api/health || curl -sf http://localhost:3000/api/health
```

(Hosts `*.opsly.local` dependen de tu `/etc/hosts` o resolver local.)

## 8. Post-commit — qué hace realmente `.githooks/post-commit`

En orden aproximado:

1. **`update-state.js`** — Si el commit tocó `infra/`, `scripts/`, `apps/` o `supabase/`: actualiza `context/system_state.json`.
2. **Symlink `.github/AGENTS.md`** → `../AGENTS.md` (ADR-034).
3. **Copia** `context/system_state.json` → `.github/system_state.json`.
4. **`notify-discord.sh`** — Si está configurado.
5. **NotebookLM** — Si `NOTEBOOKLM_ENABLED=true` y cambiaron `AGENTS.md`, `VISION.md`, `docs/`, `context/`.
6. **Drive** — Si el commit tocó `AGENTS.md`, `VISION.md` o `docs/` (`drive-sync` / rclone si aplica).
7. **`scripts/agent-hooks.sh` post-commit`**
8. **`scripts/phase-detector.sh`** — Si el script existe.

**No** ejecuta `npm run sync:agents` (no existe en `package.json`). Sincronización explícita cuando la necesites:

```bash
npm run sync:all
```

Estado de agentes / asignaciones:

```bash
npm run agents:status
# Genera y muestra docs/AGENTS-ASSIGNMENTS.md (no está en la raíz del repo)
```

## 9. Scripts útiles (orientativo; confirmar con `npm run`)

```bash
npm run dev
npm run build
npm run type-check
npm run lint
npm run validate-structure
npm run validate-config      # Doppler, DNS, SSH según scripts del repo
npm run test:e2e             # Turbo; workspaces con script e2e
npm run opsly:mcp:stdio
npm run sync:all
npm run agents:status
npm run sprint:burndown      # Si está definido en package.json raíz
```

## 10. Primeras comprobaciones

```bash
npm run opsly:mcp:stdio      # Smoke MCP (manual, Ctrl+C)
npm run agents:status        # Asignaciones
```

Slack (tras paso 5): en un canal del workspace, mencionar el bot según el nombre configurado.

API local (si Compose/Turbo levantó API):

```bash
curl -sf http://api.opsly.local/api/health || curl -sf http://127.0.0.1:3000/api/health
```

## 11. Checklist

- [ ] Clone + `nvm use` + `npm ci`
- [ ] `git config core.hooksPath .githooks` y `git config --get` verifica `.githooks`
- [ ] MCP en Claude Desktop (merge manual si ya había config)
- [ ] OAuth Slack en Codex (web)
- [ ] App instalada en workspace Slack
- [ ] Tokens en Doppler o `.env.local` (no git)
- [ ] `npm run dev` o Compose local
- [ ] Prueba Slack / health API según tu entorno

## Obsidian (vault en `docs/`, no en la raíz)

- **Abrir como vault la carpeta `docs/`** (Brain + runbooks), **no** la raíz del monorepo (`intcloudsysops/`).
- La raíz tiene `.obsidian/` en `.gitignore`; no commitees `workspace.json` (pestañas y `lastOpenFiles` — cambia en cada sesión).
- Config compartida del vault: `docs/.obsidian/` (`file-index.json`, plugins, etc.). `docs/.obsidian/workspace.json` está ignorado en git.
- Regenerar índice: `npm run obsidian:file-index`.

## `logs/` en la raíz y pre-commit bloqueado

El repo **prohíbe** el directorio `logs/` en la raíz (`npm run validate-structure`). Los logs operativos van en **`runtime/logs/`**.

Si reaparece `logs/` con `launchd-validate-structure.*.log`, suele haber un LaunchAgent antiguo en macOS:

```bash
./scripts/install-validate-structure-launchd.sh
# ./scripts/install-validate-structure-launchd.sh --unload

rm -rf logs/
npm run validate-structure
```

Plantilla: `infra/launchd/com.opsly.validate-structure.plist`.

## Troubleshooting

| Problema | Qué revisar |
| --- | --- |
| `nvm: command not found` | Instalar nvm; abrir shell login |
| `npm ci` falla | `node -v` = 22 según `.nvmrc`; borrar `node_modules` y reintentar |
| MCP no en Claude | Reinicio de Claude Desktop; JSON válido; path `cwd` al repo |
| `core.hooksPath` vacío | Ejecutar de nuevo `git config core.hooksPath .githooks` desde la raíz del repo |
| Slack 401 / invalid | Token del workspace correcto; Signing Secret coincide con la app |
| Compose falla | Docker/Colima arriba; red `traefik-public`; puertos libres |
| `Forbidden root directories: logs` | LaunchAgent o carpeta `logs/` en raíz; ver sección anterior |
| `.obsidian/workspace.json` en `git status` | No commitear; vault = `docs/` |

---

Al cambiar prerequisitos u onboarding, actualizar este archivo y ejecutar `npm run validate-structure`.
