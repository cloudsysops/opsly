# RTK (Rust Token Killer) — menos tokens en contexto de agente

[RTK](https://github.com/rtk-ai/rtk) es un **CLI en Rust** que comprime la salida de comandos (`git`, tests, `docker`, etc.) **antes** de que entre en el contexto del LLM. Es **complementario** al LLM Gateway de Opsly (cache/routing en servidor): RTK reduce tokens en **sesiones de Cursor / Claude Code / terminal**, no en las llamadas HTTP de la API de producto.

- Documentación upstream: [rtk-ai.app/guide](https://rtk-ai.app/guide) · [README](https://github.com/rtk-ai/rtk)

---

## Instalación

### macOS / Linux (usuario)

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
# Binario: ~/.local/bin/rtk
```

Asegurar `PATH` (típico en `~/.zshrc` o `~/.bashrc`):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Homebrew (macOS): `brew install rtk`.

### Cursor (hooks globales)

Tras instalar el binario:

```bash
rtk init -g --agent cursor
```

Registra el hook en **`~/.cursor/hooks.json`** (global). Cursor recarga los hooks; probar con `git status` en un terminal integrado.

Opciones útiles: `rtk init -g --auto-patch` (no interactivo), `rtk init -g --uninstall` para quitar.

### Claude Code

```bash
rtk init -g
```

Ajusta `~/.claude/settings.json` y añade referencia a `RTK.md`. Reiniciar Claude Code.

---

## Plataforma Opsly (VPS + worker)

RTK **no** es un servicio Docker del control plane: se instala en la cuenta Linux si desarrollás **por SSH** o ejecutás agentes CLI en ese host.

**Instalación ya aplicada en:**

| Host | Usuario | Binario |
|------|---------|---------|
| Worker Mac 2011 (Tailscale) | `opslyquantum` | `~/.local/bin/rtk` |
| VPS (Tailscale) | `vps-dragon` | `~/.local/bin/rtk` |

`PATH` debe incluir `~/.local/bin` (p. ej. en `~/.bashrc`). Comprobar: `rtk --version`.

En servidores **sin Cursor**, los hooks de IDE no aplican; RTK sigue siendo útil si invocás comandos vía `rtk git status`, `rtk cargo test`, etc.

### OpenClaw (opcional)

El repo RTK incluye integración para [OpenClaw](https://github.com/rtk-ai/rtk/tree/master/openclaw) (`openclaw plugins install …`). Validar versión frente a `apps/mcp` antes de activar en producción.

---

## Comandos útiles

```bash
rtk --version
rtk gain              # estadísticas de ahorro
rtk git status        # salida compacta
```

---

## Privacidad

La telemetría RTK está **desactivada por defecto**; opt-in explícito. Ver [docs/TELEMETRY](https://github.com/rtk-ai/rtk/blob/master/docs/TELEMETRY.md) en el repo RTK.

---

## Relación con Opsly

| Componente | RTK |
|------------|-----|
| `apps/llm-gateway` | No integrado; distinto propósito |
| Desarrollo local / Cursor | Sí: hooks + binario |
| Tenants / portal | No aplica |
