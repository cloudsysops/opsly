#!/usr/bin/env bash
# Generic Opsly compute-worker bootstrap/doctor.
# Reuses the canonical PC-gamer worker plane; does not create a control plane.
set -euo pipefail

WORKER_ID="${OPSLY_WORKER_ID:-}"
WORKER_CLASS="${OPSLY_WORKER_CLASS:-controlled}"
DRY_RUN=false
DOCTOR=false
ENSURE=false

usage() {
  cat <<'EOF'
Usage:
  OPSLY_WORKER_ID=home-gpu-01 ./scripts/setup-compute-worker.sh --doctor
  OPSLY_WORKER_ID=home-gpu-01 ./scripts/setup-compute-worker.sh --ensure
Options:
  --worker-id=<id>              stable unique worker identity
  --class=<controlled|opportunistic|always_on>
  --doctor                      discover hardware/runtime; make no changes
  --ensure                      run canonical idempotent worker bootstrap
  --dry-run                     print mutations without applying them
EOF
}

for arg in "$@"; do
  case "$arg" in
    --worker-id=*) WORKER_ID="${arg#*=}" ;;
    --class=*) WORKER_CLASS="${arg#*=}" ;;
    --doctor) DOCTOR=true ;;
    --ensure) ENSURE=true ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown argument: $arg" >&2; usage; exit 2 ;;
  esac
done

[[ -n "$WORKER_ID" ]] || { echo "ERROR: worker id required (--worker-id or OPSLY_WORKER_ID)" >&2; exit 2; }
[[ "$WORKER_ID" =~ ^[a-z0-9][a-z0-9._-]{2,63}$ ]] || { echo "ERROR: invalid worker id" >&2; exit 2; }
case "$WORKER_CLASS" in controlled|opportunistic|always_on) ;; *) echo "ERROR: invalid worker class" >&2; exit 2;; esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v docker >/dev/null || { echo "ERROR: docker missing" >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "ERROR: docker daemon unreachable" >&2; exit 1; }

GPU_MODEL="unknown"; VRAM_MIB=0
if command -v nvidia-smi >/dev/null 2>&1; then
  GPU_MODEL="$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || true)"
  VRAM_MIB="$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d ' ' || echo 0)"
fi
RAM_GB="$(awk '/MemTotal/{printf "%.1f", $2/1024/1024}' /proc/meminfo 2>/dev/null || echo unknown)"
CPU_CORES="$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo unknown)"

printf 'worker_id=%s\nclass=%s\nhostname=%s\ngpu=%s\nvram_mib=%s\nram_gb=%s\ncpu_cores=%s\n' \
  "$WORKER_ID" "$WORKER_CLASS" "$(hostname)" "$GPU_MODEL" "$VRAM_MIB" "$RAM_GB" "$CPU_CORES"

if [[ "$GPU_MODEL" == "unknown" || ! "$VRAM_MIB" =~ ^[0-9]+$ || "$VRAM_MIB" -eq 0 ]]; then
  echo "ERROR: no truthful NVIDIA GPU/VRAM evidence; refusing READY" >&2
  exit 3
fi

# Container GPU proof is mandatory before a node can be considered GPU-ready.
if ! docker run --rm --gpus all nvidia/cuda:12.6.0-base-ubuntu24.04 nvidia-smi -L >/dev/null 2>&1; then
  echo "ERROR: Docker cannot access NVIDIA GPU; install/repair NVIDIA Container Toolkit" >&2
  exit 4
fi

echo "gpu_container=ready"

[[ "$DOCTOR" == true && "$ENSURE" == false ]] && exit 0

if [[ "$ENSURE" == true ]]; then
  export OPSLY_WORKER_ID="$WORKER_ID" OPSLY_WORKER_CLASS="$WORKER_CLASS"
  args=(--ensure-ollama --ensure-worker --assert-env)
  [[ "$DRY_RUN" == true ]] && args+=(--dry-run)
  ./scripts/setup-pc-gamer-worker.sh "${args[@]}"
fi

echo "READY_CANDIDATE: runtime heartbeat + E2E evidence still required before scheduler eligibility"
