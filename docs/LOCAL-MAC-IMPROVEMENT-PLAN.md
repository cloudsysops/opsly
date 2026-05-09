# Plan: máquina local Mac (Opsly / intcloudsysops)

Objetivo: secretos vía Doppler, Claude Code alineado, comprobaciones repetibles.

## Fase 0 — Una sola vez (manual corto)

1. **Doppler CLI** instalado y sesión iniciada: `doppler login` y proyecto configurado en el repo si aplica (`doppler setup`).
2. **Claude Code** (`~/.claude/settings.json`) con `"apiKey": "${ANTHROPIC_API_KEY}"` (sin pegar la key en el fichero).

## Fase 1 — Automatizado (script)

Desde la raíz del repo:

```bash
./scripts/local-mac-improve.sh              # chequeos + qué haría --apply-zsh
./scripts/local-mac-improve.sh --apply-zsh  # añade bloque idempotente a ~/.zshrc
```

El bloque define `claude-dop` y `opsly-doppler-run` usando `ops-intcloudsysops` y config `prd` por defecto (sobrescribible con `OPSLY_DOPPLER_PROJECT` / `OPSLY_DOPPLER_CONFIG`).

Tras `--apply-zsh`: `source ~/.zshrc` o abrir terminal nueva. Usar **`claude-dop`** en lugar de `claude` para que `ANTHROPIC_API_KEY` venga de Doppler.

## Fase 2 — Flujo diario

| Acción | Comando |
|--------|---------|
| Claude Code con Doppler | `claude-dop` |
| Cualquier comando con env prd | `opsly-doppler-run -- <cmd>` |
| Sync repo (ver `docs/SESSION-GIT-SYNC.md`) | `./scripts/utils/git-sync.sh` o `git pull --ff-only` |

## Fase 3 — Mejoras opcionales (cuando puedas)

1. **`~/.ssh/config`**: bloque `Host` para el VPS (Tailscale), `IdentityFile` explícito.
2. **Un solo runtime Docker**: Colima *o* Docker Desktop, documentado para el equipo.
3. **`direnv`** en el repo: `use doppler` o script de entrada (evita mezclar envs entre proyectos).
4. **Homebrew**: `brew update` periódico; herramientas útiles: `jq`, `ripgrep`, `fd` si faltan.

## Referencias

- Variables: `docs/DOPPLER-VARS.md`
- Reglas Cursor / modelos: `.cursor/rules/opsly.mdc`
- Stack completo local: `scripts/local-setup.sh` (Docker, Supabase, etc.)
- **Mac como worker del orchestrator + autopilot:** `docs/04-infrastructure/MAC-ADMIN-ORCHESTRATOR-WORKER.md` y `./scripts/mac-admin-orchestrator-worker.sh`
