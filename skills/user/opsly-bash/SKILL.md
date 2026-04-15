# Opsly Bash Script Skill

> **Triggers:** `script bash`, `shell`, `automatización`, `bash script`, `shellscript`, `bash`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-tenant`, `opsly-discord`, `opsly-supabase`

## Cuándo usar

Al crear o modificar scripts en `scripts/`.

## Plantilla obligatoria

```bash
#!/usr/bin/env bash
# nombre-script.sh — descripción en una línea
# Uso: ./scripts/nombre-script.sh [--dry-run] [--skip-X]
#
# Variables requeridas (Doppler prd o export):
#   VAR_REQUERIDA — para qué sirve

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO  $*"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN  $*" >&2; }
die()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR $*" >&2; exit 1; }

main() {
  if $DRY_RUN; then
    log "DRY-RUN: pasos que se ejecutarían"
    return 0
  fi
  # ejecución real
}

main "$@"
```

## Reglas

- `set -euo pipefail` siempre.
- `--dry-run` cuando el script modifique infra o datos.
- Nunca secretos en el repo ni en `echo` de producción.
- **Nunca** `docker system prune --volumes` en producción sin runbook explícito.
- Helpers `log` / `warn` / `die` y `main` al final.
- Notificaciones Discord: `notify-discord.sh` debe poder hacer no-op si falta webhook (ya implementado en Opsly).

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| pipefail exit | Comando falla sin `set -e` | Añadir `set -euo pipefail` |
| secrets leaked | echo sin sanitizar | Usar `log` sin valores sensibles |
| docker prune | Sin --dry-run | Siempre `--dry-run` primero |

## Testing

```bash
# Dry-run sin modificar nada
./scripts/mi-script.sh --dry-run

# Verificar exit code
./scripts/mi-script.sh && echo "OK" || echo "FAIL"

# Lint bash
shellcheck scripts/mi-script.sh
```
