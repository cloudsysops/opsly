#!/bin/sh
set -eu

renderer="${OPSLY_PUBLIC_RUNTIME_CONFIG_RENDERER:-/usr/local/lib/render-public-runtime-config.mjs}"
output="${OPSLY_PUBLIC_RUNTIME_CONFIG_PATH:-./public/runtime-config.js}"

node "$renderer" "$output"
exec "$@"
