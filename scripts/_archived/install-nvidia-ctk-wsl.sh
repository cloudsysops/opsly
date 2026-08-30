#!/usr/bin/env bash
# Install NVIDIA Container Toolkit on Ubuntu WSL (interactive sudo).
# Run ONCE on PC-gamer WSL before GPU Ollama containers work.
#
#   ./scripts/install-nvidia-ctk-wsl.sh
#   ./scripts/install-nvidia-ctk-wsl.sh --dry-run
#
set -euo pipefail

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "nvidia-smi missing in WSL — install NVIDIA Windows driver with WSL support first." >&2
  exit 1
fi

nvidia-smi -L

if command -v nvidia-ctk >/dev/null 2>&1; then
  echo "nvidia-ctk already installed: $(nvidia-ctk --version 2>/dev/null | head -1 || true)"
else
  echo "Installing nvidia-container-toolkit (sudo)…"
  # Official apt repo (Ubuntu)
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
    run sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    run sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list >/dev/null
  run sudo apt-get update
  run sudo apt-get install -y nvidia-container-toolkit
fi

run sudo nvidia-ctk runtime configure --runtime=docker
# WSL: restart docker service inside distro
if command -v systemctl >/dev/null 2>&1; then
  run sudo systemctl restart docker || run sudo service docker restart
else
  run sudo service docker restart
fi

echo "Verify:"
echo "  docker run --rm --gpus all nvidia/cuda:12.6.0-base-ubuntu24.04 nvidia-smi -L"
