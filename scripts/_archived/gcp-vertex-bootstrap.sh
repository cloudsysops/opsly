#!/usr/bin/env bash
# Bootstrap Vertex AI service account + optional Doppler upload.
# Safe: never prints the service account JSON to stdout.
#
# Prerequisites: gcloud authenticated; Doppler CLI when not using --skip-doppler.
# Billing: Vertex (aiplatform) suele requerir facturación enlazada al proyecto para uso real.
# compute.googleapis.com exige billing al activarse; por defecto NO se activa Compute (ver VERTEX_ENABLE_COMPUTE_API).
#
# Docs: docs/04-infrastructure/VERTEX-AI-SETUP.md
#
# Usage:
#   GCP_PROJECT_ID=opslyquantum ./scripts/gcp-vertex-bootstrap.sh
#   GCP_PROJECT_ID=my-proj VERTEX_AI_REGION=us-east1 ./scripts/gcp-vertex-bootstrap.sh --dry-run
#   GCP_PROJECT_ID=my-proj ./scripts/gcp-vertex-bootstrap.sh --skip-doppler
#
# Optional: VERTEX_ENABLE_COMPUTE_API=1 también activa compute.googleapis.com (requiere billing).
#
set -euo pipefail

DRY_RUN=false
SKIP_DOPPLER=false
PROJECT_ID="${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT_ID:-}}"
REGION="${VERTEX_AI_REGION:-us-central1}"
DOPPLER_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-prd}"

usage() {
  echo "Usage: GCP_PROJECT_ID=<id> $0 [--dry-run] [--skip-doppler]" >&2
  echo "  --dry-run       Print planned steps only (no gcloud mutations)." >&2
  echo "  --skip-doppler  Run gcloud only (APIs, SA, IAM); no key, no Doppler." >&2
  echo "  VERTEX_ENABLE_COMPUTE_API=1  También habilita Compute API (requiere billing en el proyecto)." >&2
}

while (($#)); do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --skip-doppler) SKIP_DOPPLER=true ;;
    -h | --help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT_ID" >&2
  usage
  exit 1
fi

SA_EMAIL="opsly-vertex-ai@${PROJECT_ID}.iam.gserviceaccount.com"

if $DRY_RUN; then
  echo "[dry-run] gcloud projects describe ${PROJECT_ID}"
  echo "[dry-run] gcloud services enable aiplatform logging --project=${PROJECT_ID}"
  if [[ "${VERTEX_ENABLE_COMPUTE_API:-0}" == "1" ]]; then
    echo "[dry-run] gcloud services enable compute.googleapis.com --project=${PROJECT_ID} (billing requerido)"
  fi
  echo "[dry-run] create SA ${SA_EMAIL} if missing"
  echo "[dry-run] gcloud projects add-iam-policy-binding ${PROJECT_ID} member=serviceAccount:${SA_EMAIL} role=roles/aiplatform.user"
  if $SKIP_DOPPLER; then
    echo "[dry-run] stop (--skip-doppler)"
  else
    echo "[dry-run] create temp JSON key + doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON < keyfile"
    echo "[dry-run] doppler set GOOGLE_CLOUD_PROJECT_ID VERTEX_AI_REGION"
  fi
  exit 0
fi

gcloud projects describe "${PROJECT_ID}" --format='value(projectId)' >/dev/null
echo "OK: proyecto ${PROJECT_ID} accesible"

# Compute API exige billing; no incluirlo en el mismo enable que aiplatform o falla todo el comando.
gcloud services enable aiplatform.googleapis.com logging.googleapis.com \
  --project="${PROJECT_ID}"
echo "OK: APIs aiplatform + logging (idempotente)"

if [[ "${VERTEX_ENABLE_COMPUTE_API:-0}" == "1" ]]; then
  gcloud services enable compute.googleapis.com --project="${PROJECT_ID}"
  echo "OK: API compute.googleapis.com habilitada"
else
  echo "INFO: compute.googleapis.com omitido (evita UREQ_PROJECT_BILLING_NOT_FOUND sin billing)."
  echo "      Con billing: VERTEX_ENABLE_COMPUTE_API=1 $0 ..."
fi

if gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" &>/dev/null; then
  echo "OK: cuenta de servicio ya existe (${SA_EMAIL})"
else
  gcloud iam service-accounts create opsly-vertex-ai \
    --project="${PROJECT_ID}" \
    --display-name="Opsly Vertex AI"
  echo "OK: cuenta de servicio creada"
fi

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user" \
  --quiet >/dev/null
echo "OK: rol roles/aiplatform.user enlazado a la SA"

if $SKIP_DOPPLER; then
  echo "Listo (solo GCP). Para clave + Doppler, ejecuta de nuevo sin --skip-doppler."
  exit 0
fi

if ! command -v doppler >/dev/null 2>&1; then
  echo "ERROR: doppler no está en PATH; instala Doppler o usa --skip-doppler y sube la clave a mano." >&2
  exit 1
fi

KEYFILE="$(mktemp "/tmp/opsly-vertex-XXXXXXXX.json")"
cleanup() {
  rm -f "${KEYFILE}"
}
trap cleanup EXIT

gcloud iam service-accounts keys create "${KEYFILE}" \
  --project="${PROJECT_ID}" \
  --iam-account="${SA_EMAIL}" >/dev/null
echo "OK: clave JSON en archivo temporal (no se muestra contenido)"

doppler secrets set GOOGLE_CLOUD_PROJECT_ID "${PROJECT_ID}" \
  --project "${DOPPLER_PROJECT}" --config "${DOPPLER_CONFIG}"
doppler secrets set VERTEX_AI_REGION "${REGION}" \
  --project "${DOPPLER_PROJECT}" --config "${DOPPLER_CONFIG}"
doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON \
  --project "${DOPPLER_PROJECT}" --config "${DOPPLER_CONFIG}" <"${KEYFILE}"

echo "OK: Doppler (${DOPPLER_PROJECT}/${DOPPLER_CONFIG}): GOOGLE_CLOUD_PROJECT_ID, VERTEX_AI_REGION, GOOGLE_SERVICE_ACCOUNT_JSON"
echo "Hecho."
