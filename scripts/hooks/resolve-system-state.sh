#!/bin/bash
# Resuelve la ruta a system_state.json
# Primero intenta runtime/context/system_state.json (nuevo)
# Si no existe, usa context/system_state.json (legacy con symlink a .github/)

if [ -f "runtime/context/system_state.json" ]; then
  echo "runtime/context/system_state.json"
elif [ -f "context/system_state.json" ]; then
  echo "context/system_state.json"
else
  echo "context/system_state.json"  # default fallback
fi
