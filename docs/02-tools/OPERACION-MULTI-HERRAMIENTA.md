# Operación multi-herramienta y multi-máquina (Opsly)

Fuente de verdad de cómo se reparte el trabajo. Actualizado 2026-10-11.

## Máquinas
| Máquina | Rol | Acceso | Notas |
|---|---|---|---|
| `smdqcia-pc` (Windows 11 + WSL2 Ubuntu) | Stream, juego, desarrollo, workers Docker | local | OBS en vivo: comprobar `GetStreamStatus` antes de tocar nada. Nunca `wsl --shutdown`. |
| `vps-dragon` (Ubuntu 24.04) | Producción: 15 contenedores (Traefik, `opsly_*`, peskids...) | `ssh vps` (llave `id_ed25519_vps`, Tailscale) | Reinicio y 66 actualizaciones pendientes: requieren `sudo` y ventana acordada. |
| `opsly-quantum` (MacBook) | Desarrollo / Cursor | Tailscale | SSH apagado: activar Sesión remota. |

## Herramientas y dónde viven sus reglas
| Herramienta | Configuración | Contenido |
|---|---|---|
| Claude Code | `~/.claude/CLAUDE.md`, `settings.json`, `agents/` (Windows y WSL) | Reglas de usuario, permisos allow/ask/deny, 6 agentes |
| Codex | `~/.codex/AGENTS.md`, `config.toml` | Mismas reglas y roles; validar con `codex doctor` |
| Cursor | `~/.cursor/mcp.json`, `settings.json`; lee `AGENTS.md` del repo | MCP sin rutas de Mac |

Regla: las normas del proyecto viven en `AGENTS.md` del repo; las personales, en cada herramienta, con el mismo texto base.

## Reparto de trabajo
- **Arquitecto / Revisor:** lectura. **Implementador:** una rama y un PR por cambio. **DevOps/SRE:** diagnóstico, backup, cambio mínimo, verificación, rollback. **Streaming:** pre/durante/post (durante = solo lectura).
- Claude Code: tareas largas multi-paso y operación del PC. Codex: revisiones y tareas aisladas. Cursor: edición interactiva en el editor.

## Pendiente
Sesión remota en el Mac; ventana de mantenimiento del VPS; mover claves API de `~/.cursor/mcp.json` a Doppler; traer `scripts/ops/mission-control-live-preview.sh` (rama `feat/mission-control-live-obs`).
