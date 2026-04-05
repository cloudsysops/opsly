#!/usr/bin/env bash
# Guía interactiva de recuperación Opsly: solo muestra comandos para copiar/pegar.
# No automatiza cambios en red, VPS ni Terraform.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/usb-kit/lib/usb-common.sh
source "${SCRIPT_DIR}/lib/usb-common.sh"

export USB_KIT_DIR="${SCRIPT_DIR}"

pause() {
  read -r -p "Enter para volver al menú..." _ || true
}

scenario_1() {
  cat <<'EOS'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Escenario 1 — Mac nueva sin nada
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Qué necesitás del USB (p. ej. partición datos / disk4):
  • Clon del repo opsly o al menos tools/usb-kit/
  • Carpeta tools/usb-kit/secrets/*.age si usás pen-secrets (opcional hasta restore)

Tiempo estimado: 45–90 min (descargas + clone + Doppler).

Comandos (en orden):

  # Herramientas (macOS con Homebrew)
  brew install git docker gh age jq terraform

  gh auth login

  git clone https://github.com/cloudsysops/opsly ~/opsly
  cd ~/opsly && git config core.hooksPath .githooks

  ./tools/usb-kit/pen-secrets.sh restore
  # Luego seguí las instrucciones en pantalla (archivos en /tmp/opsly-restore/)

  # Con red: configurar Doppler (proyecto ops-intcloudsysops, config prd)
  doppler login
  doppler setup
  # Sin Doppler: usá emergency.env según instrucciones del restore

Validar antes de seguir:
  • gh auth status
  • test -d ~/opsly/.git
  • Si restauraste secrets: ls -la /tmp/opsly-restore/
EOS
  pause
}

scenario_2() {
  cat <<'EOS'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Escenario 2 — VPS caído o reseteado (misma IP / droplet existente)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Qué necesitás del USB:
  • Acceso SSH (root o usuario con sudo) al 157.245.223.7
  • Repo en GitHub alcanzable desde el servidor

Tiempo estimado: 30–60 min.

Comandos:

  ssh root@157.245.223.7

  apt update && apt install -y git docker.io docker-compose-plugin

  git clone https://github.com/cloudsysops/opsly /opt/opsly
  cd /opt/opsly && ./scripts/vps-bootstrap.sh
  ./scripts/vps-first-run.sh

  curl -sf https://api.ops.smiletripcare.com/api/health | jq .

Validar antes de dar por cerrado:
  • docker ps (traefik, app, admin según compose)
  • Health HTTP 200 o el cuerpo esperado de /api/health
  • Doppler/.env en /opt/opsly coherente con prd
EOS
  pause
}

scenario_3() {
  cat <<'EOS'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Escenario 3 — Sin acceso a Doppler
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Qué necesitás del USB:
  • tools/usb-kit/secrets/*.age y la passphrase de age
  • Clave SSH en el equipo local para scp (vps-dragon)

Tiempo estimado: 15–30 min + rotación de secretos después.

Comandos:

  cd /ruta/al/repo/opsly
  ./tools/usb-kit/pen-secrets.sh restore

  scp /tmp/opsly-restore/emergency.env vps-dragon@157.245.223.7:/opt/opsly/.env

ADVERTENCIA:
  Rotá TODOS los secretos expuestos (.env en disco, PAT, claves) vía Doppler y
  paneles (GitHub, Stripe, Supabase, etc.) en cuanto recuperes acceso normal.
  Borrá /tmp/opsly-restore/ cuando termines: rm -rf /tmp/opsly-restore

Validar:
  • Permisos del .env en el VPS (no world-readable)
  • Servicios arrancan con el .env restaurado
EOS
  pause
}

scenario_4() {
  cat <<'EOS'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Escenario 4 — VPS destruido, recrear con Terraform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Qué necesitás del USB / equipo:
  • Repo con infra/terraform/ inicializado (terraform init)
  • TF_VAR_do_token (desde Doppler; NO guardar en .tf)
  • TF_VAR_ssh_fingerprint (clave SSH ya cargada en DigitalOcean)
  • Opcional: si tenés do-token.txt claro en /tmp/opsly-restore/ (solo si lo
    guardaste aparte; pen-secrets por defecto no lo crea — usá Doppler)

Tiempo estimado: 30–120 min (plan, apply, DNS, bootstrap).

Comandos:

  cd ~/opsly/infra/terraform

  export TF_VAR_do_token="$(doppler secrets get DO_TOKEN --plain --project ops-intcloudsysops --config prd)"
  export TF_VAR_ssh_fingerprint="$(doppler secrets get DO_SSH_FINGERPRINT --plain --project ops-intcloudsysops --config prd)"
  # O, solo si tenés archivo seguro local (evitar historial):
  # export TF_VAR_do_token="$(cat /ruta/segura/do-token.txt)"

  terraform init && terraform plan
  terraform apply

Luego en el servidor NUEVO ejecutá el Escenario 2 (ajustá IP si cambió).

Validar entre pasos:
  • terraform plan sin destrucciones no deseadas en producción
  • outputs: production_ip / DNS alineados con config/opsly.config.json
  • Tras apply: SSH al nuevo droplet y repetir bootstrap/first-run
EOS
  pause
}

scenario_5() {
  cat <<'EOS'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Escenario 5 — Peor caso (todo junto)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Secuencia recomendada: 1 → 3 → 4 → 2 (con validación entre pasos).

  1. Prepará máquina local (Escenario 1): git, gh, age, terraform, clone.
  2. Recuperá material cifrado si aplica (Escenario 3): restore + entender .env / claves.
  3. Si el droplet no existe: Terraform (Escenario 4); si existe: saltá al 4bis.
  4bis. Si solo falta OS en el mismo droplet: Escenario 2 directo.
  5. Escenario 2 en el VPS final: bootstrap, first-run, health.

Qué necesitás del USB:
  • Clon completo del repo (32 GB típico incluye historia)
  • secrets/*.age + passphrase
  • Documentación: AGENTS.md, infra/terraform/README.md

Tiempos: suma de cada escenario; reservá varias horas con pausas.

Validación entre pasos:
  • Tras 1: herramientas y clone OK
  • Tras 3: archivos en /tmp/opsly-restore/ solo mientras operás; rotar después
  • Tras 4: nueva IP en DNS/opsly.config si aplica
  • Tras 2: health check y revisión de logs Docker
EOS
  pause
}

menu() {
  clear 2>/dev/null || true
  cat <<'EOM'
╔════════════════════════════════════════════════════════════════╗
║  Opsly — Guía de recuperación (solo texto; no ejecuta nada)   ║
╚════════════════════════════════════════════════════════════════╝

  1) Mac nueva sin nada
  2) VPS caído o reseteado (mismo servidor)
  3) Sin acceso a Doppler (restore + scp .env)
  4) VPS destruido — recrear con Terraform
  5) Peor caso — secuencia 1 → 3 → 4 → 2

  q) Salir

EOM
}

main_loop() {
  while true; do
    menu
    read -r -p "Elegí una opción: " choice || exit 0
    case "${choice}" in
      1) scenario_1 ;;
      2) scenario_2 ;;
      3) scenario_3 ;;
      4) scenario_4 ;;
      5) scenario_5 ;;
      q | Q) log_info "Salida."; exit 0 ;;
      *) log_warn "Opción no válida: ${choice}" ;;
    esac
  done
}

main_loop
