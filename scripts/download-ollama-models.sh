#!/usr/bin/env bash
# Descarga modelos Ollama recomendados (phi3:mini, llama3.2:3b).
# Si el contenedor opslyquantum-ollama está en ejecución, usa docker exec;
# si no, usa el binario ollama del host.

set -euo pipefail

OLLAMA_CONTAINER="${OLLAMA_CONTAINER:-opslyquantum-ollama}"

MODELS=(
  "phi3:mini"
  "llama3.2:3b"
)

pull_one() {
  local model="$1"
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "${OLLAMA_CONTAINER}"; then
    echo "docker exec ${OLLAMA_CONTAINER} ollama pull ${model}"
    docker exec "${OLLAMA_CONTAINER}" ollama pull "${model}"
  elif command -v ollama >/dev/null 2>&1; then
    echo "ollama pull ${model}"
    ollama pull "${model}"
  else
    echo "No hay contenedor ${OLLAMA_CONTAINER} en ejecución ni ollama en PATH." >&2
    echo "Arranca Ollama (./scripts/start-opslyquantum-stack.sh --minimal) o instala https://ollama.com/download" >&2
    exit 1
  fi
}

echo "Descargando modelos Ollama..."
for m in "${MODELS[@]}"; do
  echo ""
  echo "--- ${m} ---"
  pull_one "${m}"
done

echo ""
echo "Modelos instalados:"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "${OLLAMA_CONTAINER}"; then
  docker exec "${OLLAMA_CONTAINER}" ollama list
elif command -v ollama >/dev/null 2>&1; then
  ollama list
fi
