# Claude Code + WSL + SSH + GitHub (PC smdqcia-pc)

Configurado el 2026-10-11 con `tools/stream-overlay/configure-wsl-pro.sh` (idempotente, hace copias `*.bak-<fecha>`).

| Pieza | Estado |
|---|---|
| Claude Code CLI en WSL | 2.1.292 |
| GitHub | SSH (`git@github.com`, `~/.ssh/id_ed25519`); `url.insteadOf` convierte https->ssh; `gh git_protocol=ssh` |
| `~/.ssh/config` | bloque `>>> opsly pro defaults`: keepalive, ControlMaster/Persist 10m, AddKeysToAgent, hosts `github.com` y `vps` |
| Git global | autoSetupRemote, autoStash, rerere, zdiff3, histogram, autocrlf=input |
| `~/.claude/settings.json` | permisos allow/ask/deny fusionados (deny: force-push, leer .env/llaves, `wsl --shutdown`) |
| `~/.claude/CLAUDE.md` | reglas de usuario (WSL-first, hooks, secretos, no tocar OBS en vivo) |

## Pendiente: VPS (`ssh vps`)
Ninguna llave conocida autentica en `vps-dragon@100.120.151.91`. Se creo `~/.ssh/id_ed25519_vps` (publica en la salida del script). Autorizarla desde una maquina que ya entre al VPS (p. ej. el MacBook `opsly-quantum`):
`echo '<clave publica>' | ssh vps-dragon@100.120.151.91 'cat >> ~/.ssh/authorized_keys'`

## Revertir
Restaurar los `~/.ssh/config.bak-*`, `~/.gitconfig.bak-*`, `~/.claude/settings.json.bak-*` o borrar el bloque delimitado.
