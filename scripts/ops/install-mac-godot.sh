#!/usr/bin/env bash
set -euo pipefail

GODOT_VERSION="${GODOT_VERSION:-4.7.2}"
INSTALL_ROOT="${INSTALL_ROOT:-$HOME/Applications}"
INSTALL_EXPORT_TEMPLATES="${INSTALL_EXPORT_TEMPLATES:-1}"

if [[ "$GODOT_VERSION" != "4.7.2" ]]; then
  echo "This script pins Godot 4.7.2. Update checksums before changing GODOT_VERSION." >&2
  exit 2
fi

editor_asset="Godot_v4.7.2-stable_macos.universal.zip"
editor_sha="c58a24e31d720be9d62f60cb5627c4e695fb72f21b0cfe1bc9ccaa9a3b3ba63e"
templates_asset="Godot_v4.7.2-stable_export_templates.tpz"
templates_sha="f298490b8d44d934be425a5a65a51bf15f422428b229a06a6e11d9ffea248011"
base_url="https://github.com/godotengine/godot/releases/download/4.7.2-stable"

mkdir -p "$INSTALL_ROOT"

install_editor() {
  local tmp="/tmp/$editor_asset"
  echo "Downloading Godot 4.7.2 for macOS..."
  curl --fail --location --retry 3 "$base_url/$editor_asset" -o "$tmp"
  echo "$editor_sha  $tmp" | shasum -a 256 -c -

  local unpack="/tmp/godot-macos-4.7.2"
  rm -rf "$unpack"
  mkdir -p "$unpack"
  ditto -x -k "$tmp" "$unpack"

  local app
  app="$(find "$unpack" -maxdepth 2 -type d -name 'Godot.app' -print -quit)"
  [[ -n "$app" ]] || { echo "Godot.app not found in archive" >&2; exit 1; }

  rm -rf "$INSTALL_ROOT/Godot.app"
  ditto "$app" "$INSTALL_ROOT/Godot.app"
  xattr -dr com.apple.quarantine "$INSTALL_ROOT/Godot.app" 2>/dev/null || true

  "$INSTALL_ROOT/Godot.app/Contents/MacOS/Godot" --version
}

install_templates() {
  local tmp="/tmp/$templates_asset"
  echo "Downloading Godot 4.7.2 export templates (~1.3 GB)..."
  curl --fail --location --retry 3 "$base_url/$templates_asset" -o "$tmp"
  echo "$templates_sha  $tmp" | shasum -a 256 -c -

  local unpack="/tmp/godot-export-templates-4.7.2"
  rm -rf "$unpack"
  mkdir -p "$unpack"
  unzip -q "$tmp" -d "$unpack"

  local target="$HOME/Library/Application Support/Godot/export_templates/4.7.2.stable"
  rm -rf "$target"
  mkdir -p "$target"

  if [[ -d "$unpack/templates" ]]; then
    cp -a "$unpack/templates/." "$target/"
  else
    cp -a "$unpack/." "$target/"
  fi

  test -n "$(find "$target" -maxdepth 1 -type f -print -quit)"
  echo "Export templates installed: $target"
}

if [[ -x "$INSTALL_ROOT/Godot.app/Contents/MacOS/Godot" ]]; then
  current="$("$INSTALL_ROOT/Godot.app/Contents/MacOS/Godot" --version | head -n 1 || true)"
  if [[ "$current" == 4.7.2* ]]; then
    echo "Godot 4.7.2 already installed at $INSTALL_ROOT/Godot.app"
  else
    install_editor
  fi
else
  install_editor
fi

if [[ "$INSTALL_EXPORT_TEMPLATES" == "1" ]]; then
  template_dir="$HOME/Library/Application Support/Godot/export_templates/4.7.2.stable"
  if [[ -n "$(find "$template_dir" -maxdepth 1 -type f -print -quit 2>/dev/null || true)" ]]; then
    echo "Godot export templates already installed."
  else
    install_templates
  fi
fi

echo
echo "Godot ready:"
echo "  $INSTALL_ROOT/Godot.app/Contents/MacOS/Godot"
