#!/usr/bin/env bash
# Verificar estado de GCP para Opsly Failover (proyecto opslyquantum por defecto).
# Uso: ./scripts/verify-gcp-setup.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$REPO_ROOT/config/gcp.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/gcp.env" && set +a
elif [[ -f "$REPO_ROOT/config/gcp-opslyquantum.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/gcp-opslyquantum.env" && set +a
fi

PROJECT_ID="${GCP_PROJECT_ID:-${PROJECT_ID:-opslyquantum}}"
ZONE="${GCP_ZONE:-${ZONE:-us-central1-a}}"
# Región a partir de zona (p. ej. us-central1-a → us-central1)
REGION="${ZONE%-*}"

echo "Verificando GCP para Opsly"
echo "  Proyecto: $PROJECT_ID"
echo "  Zona:     $ZONE (región: $REGION)"
echo ""

command -v gcloud >/dev/null 2>&1 || {
  echo "Instala Google Cloud SDK: https://cloud.google.com/sdk" >&2
  exit 1
}

echo "1) Acceso al proyecto..."
if gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  PROJECT_NAME="$(gcloud projects describe "$PROJECT_ID" --format='get(name)')"
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='get(projectNumber)')"
  echo "   OK  Nombre: $PROJECT_NAME"
  echo "   OK  Número: $PROJECT_NUMBER"
else
  echo "   ERROR: sin acceso al proyecto (o no existe)."
  echo "   Prueba: gcloud auth login && gcloud projects describe $PROJECT_ID"
  exit 1
fi

echo ""
echo "2) Compute Engine API..."
if gcloud services list --enabled --project="$PROJECT_ID" --format='value(config.name)' 2>/dev/null | grep -q '^compute.googleapis.com$'; then
  echo "   OK  compute.googleapis.com habilitada"
else
  echo "   PENDIENTE: habilitar API"
  echo "   gcloud services enable compute.googleapis.com --project=$PROJECT_ID"
fi

echo ""
echo "3) Facturación..."
BILLING_ENABLED="false"
BILLING_ACCOUNT="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingAccountName)' 2>/dev/null || true)"
if [[ -n "$BILLING_ACCOUNT" ]]; then
  BILLING_ENABLED="true"
fi
if [[ "$BILLING_ENABLED" == "true" ]]; then
  echo "   OK  Facturación enlazada ($BILLING_ACCOUNT)"
else
  echo "   PENDIENTE: enlazar facturación"
  echo "   https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
fi

echo ""
echo "4) Instancias Compute..."
if INST_LINES="$(gcloud compute instances list --project="$PROJECT_ID" --format='table(name,zone,status)' 2>/dev/null)"; then
  if [[ -z "$(echo "$INST_LINES" | tail -n +2)" ]]; then
    echo "   (ninguna instancia)"
  else
    echo "$INST_LINES"
  fi
else
  echo "   (no se pudo listar — ¿API habilitada?)"
fi

echo ""
echo "5) Quotas (región $REGION)..."
if ! QOUT="$(gcloud compute regions describe "$REGION" --project="$PROJECT_ID" --format='yaml(quotas)' 2>/dev/null)"; then
  echo "   No se pudo leer quotas (¿API Compute habilitada?)."
else
  echo "$QOUT" | head -25 || true
  echo "   (fragmento arriba)"
fi

echo ""
echo "6) Redes VPC..."
gcloud compute networks list --project="$PROJECT_ID" --format='value(name)' 2>/dev/null | while read -r net; do
  echo "   - $net"
done || true

echo ""
echo "7) gcloud config (local)..."
echo "   project: $(gcloud config get-value project 2>/dev/null || echo none)"
echo "   zone:    $(gcloud config get-value compute/zone 2>/dev/null || echo none)"

echo ""
echo "========================================"
echo "Resumen: proyecto=$PROJECT_ID  facturación enlazada=$BILLING_ENABLED"
echo ""
echo "Próximos pasos:"
echo "  ./infra/provision-gcp-failover.sh --dry-run"
echo "  ./infra/provision-gcp-failover.sh"
echo "  docs/GCP-ACTIVATION-CHECKLIST.md"
echo ""
echo "Verificación completada."
