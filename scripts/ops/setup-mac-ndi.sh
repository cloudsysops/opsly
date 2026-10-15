#!/usr/bin/env bash
# Instala NDI + DistroAV en el Mac (opsly-quantum) para que OBS pueda emitir/recibir NDI.
# Uso (desde el PC gamer o cualquier host con el alias SSH "macbook" configurado):
#   ssh macbook 'bash -s' < scripts/ops/setup-mac-ndi.sh
# o copiando y corriendo directamente en el Mac:
#   bash setup-mac-ndi.sh
#
# Contexto (2026-09-29): "NDI Tools" (el instalador principal de ndi.video) trae las
# apps de utilidad (Discovery, Scan Converter, etc.) pero NO expone libndi.dylib como
# libreria de sistema. DistroAV (el plugin OBS-NDI) necesita ademas el "NDI SDK", que
# es el paquete que realmente instala la libreria compartida. Sin el SDK, DistroAV
# carga en modo "UI-only" y reporta:
#   ERR-404 - NDI library not found
#   ERR-401 - NDI Runtime not found (link roto a distroav.org/ndi/redist-macos)
#
# Todos los .pkg se instalan con `-target CurrentUserHomeDirectory` (sin sudo) porque
# no hay forma de pasar la contrasena de admin de forma no interactiva por SSH; esto
# instala en ~/Applications y ~/Library en vez de /Applications, que es suficiente
# para uso de un solo usuario y evita el prompt de admin GUI documentado en
# docs/runbooks/STREAMING-GAMER-DJ-NDI.md.
set -euo pipefail

WORKDIR="$HOME/Downloads/ndi-setup"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

fetch() {
  local url="$1" out="$2"
  echo "-> descargando $out"
  curl -sL -o "$out" "$url" -w "   HTTP %{http_code}, %{size_download} bytes\n"
  if ! file "$out" | grep -q "xar archive"; then
    echo "!! $out no es un .pkg valido (revisa la URL, puede haber cambiado)"
    file "$out"
    return 1
  fi
}

install_pkg() {
  local pkg="$1"
  echo "-> instalando $pkg (sin sudo, CurrentUserHomeDirectory)"
  installer -pkg "$pkg" -target CurrentUserHomeDirectory
}

echo "== 1/3: NDI Tools (apps de utilidad) =="
fetch "https://downloads.ndi.tv/Tools/NDIToolsInstaller.pkg" "NDIToolsInstaller.pkg"
install_pkg "NDIToolsInstaller.pkg"

echo "== 2/3: NDI SDK (trae libndi.dylib, lo que DistroAV realmente necesita) =="
fetch "https://downloads.ndi.tv/SDK/NDI_SDK_Mac/Install_NDI_SDK_v6_Apple.pkg" "NDI_SDK_v6_Apple.pkg"
# A diferencia de NDI Tools, el SDK escribe fuera de $HOME (rutas de sistema) y el
# installer falla sin sudo: "unexpected error occurred while moving files to the
# final destination" (confirmado 2026-09-29). Este paso SI necesita la contrasena
# de admin de forma interactiva -- no se puede automatizar por SSH sin ella.
if ! install_pkg "NDI_SDK_v6_Apple.pkg" 2>/dev/null; then
  echo "!! El SDK requiere sudo (contrasena de admin). Corre esto en el Mac"
  echo "   con acceso a pantalla/GUI, o via:"
  echo "     sudo installer -pkg $WORKDIR/NDI_SDK_v6_Apple.pkg -target /"
  echo "   (pide la contrasena del usuario dragon; no se puede dar por SSH sin ella)"
fi

echo "== 3/3: DistroAV (plugin OBS-NDI) =="
DISTROAV_VER="$(curl -s https://api.github.com/repos/DistroAV/DistroAV/releases/latest | grep -oP '"tag_name":\s*"\K[^"]+')"
fetch "https://github.com/DistroAV/DistroAV/releases/download/${DISTROAV_VER}/distroav-${DISTROAV_VER}-macos-universal.pkg" "DistroAV.pkg"
install_pkg "DistroAV.pkg"

echo "== Verificando libndi.dylib instalada =="
find "$HOME" -iname "libndi*.dylib" 2>/dev/null

echo "== Reiniciando OBS para cargar el plugin =="
osascript -e 'quit app "OBS"' 2>/dev/null || true
sleep 2
pgrep -x OBS >/dev/null && killall -9 OBS 2>/dev/null || true
sleep 2
open -a OBS
sleep 8

echo "== Verificando en el log mas reciente que DistroAV encontro la libreria =="
LATEST_LOG="$(ls -t "$HOME/Library/Application Support/obs-studio/logs/"*.txt | head -1)"
grep -i distroav "$LATEST_LOG" || echo "(sin lineas de distroav en el log, revisa manualmente)"
