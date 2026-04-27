---
title: 'Bash Script Template'
description: 'Plantilla para scripts bash idempotentes y seguros'
category: devops
tags: [bash, script, idempotent, cli]
created_at: 2026-04-15
updated_at: 2026-04-15
---

# Plantilla: Script Bash Idempotente

## Estructura del Script

```bash
#!/bin/bash
# ============================================================
# SCRIPT: {{script-name}}.sh
# DESC:    Descripción breve del script
# AUTHOR:  Opsly Team
# VERSION: 1.0.0
# ============================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# ============================================================
# CONFIGURACIÓN: Variables de entorno y constantes
# ============================================================

# Color codes para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables configurables
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# ============================================================
# FUNCIONES DE LOG: Helpers para output formateado
# ============================================================

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_debug() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo -e "[DEBUG] $1"
  fi
}

# ============================================================
# VALIDACIONES: Verificar precondiciones
# ============================================================

check_dependencies() {
  local deps=("$@")
  for cmd in "${deps[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
      log_error "Required dependency not found: $cmd"
      exit 1
    fi
  fi
  log_debug "All dependencies satisfied"
}

check_prerequisites() {
  # Verificar permisos, archivos, etc.
  if [[ ! -d "/required/path" ]]; then
    log_error "Required directory not found"
    exit 1
  fi
}

# ============================================================
# FUNCIONES PRINCIPALES: Lógica del script
# ============================================================

do_something() {
  local arg="$1"

  log_info "Executing main logic..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "DRY RUN: Would have executed with arg: $arg"
    return 0
  fi

  # Implementar lógica aquí
  # Usar idempotency: verificar si ya existe antes de crear
  if [[ -f "/path/to/file" ]]; then
    log_info "File already exists, skipping"
    return 0
  fi

  # Log the action
  log_debug "Creating file: /path/to/file"
}

# ============================================================
# FLAGS DE LINEA DE COMANDO: Parsear argumentos
# ============================================================

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  -h, --help          Show this help message
  -v, --verbose      Enable verbose output
  -n, --dry-run      Show what would be done without executing
  -f, --force        Force execution even if already done

Examples:
  $(basename "$0") --dry-run
  $(basename "$0") --verbose --force
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      -h|--help)
        usage
        exit 0
        ;;
      -v|--verbose)
        VERBOSE=true
        shift
        ;;
      -n|--dry-run)
        DRY_RUN=true
        shift
        ;;
      -f|--force)
        FORCE=true
        shift
        ;;
      *)
        log_error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done
}

# ============================================================
# PUNTO DE ENTRADA: Main function
# ============================================================

main() {
  log_info "Starting {{script-name}}.sh"

  # Parsear argumentos
  parse_args "$@"

  # Validar precondiciones
  check_dependencies "jq" "curl"  # Agregar dependencias necesarias
  check_prerequisites

  # Ejecutar lógica principal
  do_something "some-arg"

  log_info "Completed successfully"
}

# Ejecutar main pasándole todos los argumentos
main "$@"
```

## Ejemplos de Uso

### Ejecución Normal

```bash
chmod +x {{script-name}}.sh
./{{script-name}}.sh
```

### Dry Run (ver qué harías sin ejecutar)

```bash
./{{script-name}}.sh --dry-run
```

### Verbose Mode

```bash
./{{script-name}}.sh --verbose
```

### Combinar opciones

```bash
DRY_RUN=true VERBOSE=true ./{{script-name}}.sh --force
```

## Principios de Idempotencia

1. **Verificar antes de actuar**: Siempre check if resource exists
2. **Usar --force con cuidado**: Solo cuando sea necesario re-ejecutar
3. **Loguear acciones**: Registrar qué se hizo
4. **No fallar si ya está hecho**: Usar `|| true` o verificar primero
5. **Transacciones reversibles**: Poder rollback si algo falla

## Checklist de Validación

- [ ] El script usa `set -euo pipefail` al inicio
- [ ] Los colores están definidos como variables
- [ ] Hay funciones de log (info, warn, error, debug)
- [ ] Las dependencias se validan con `check_dependencies`
- [ ] Hay función `--help` / `-h` que muestra usage
- [ ] Soporta `--dry-run` / `-n` para testing
- [ ] Soporta `--verbose` / `-v` para debugging
- [ ] El script es idempotente (se puede ejecutar múltiples veces)
- [ ] Los paths usan variables configurables
- [ ] Los errores propergados al exterior con `exit 1`
- [ ] El script tiene permisos de ejecución (`chmod +x`)
- [ ] Se probó en dry-run antes de producción
