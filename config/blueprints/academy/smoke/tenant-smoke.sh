#!/usr/bin/env bash
set -euo pipefail
test -f blueprints/academy/blueprint.yaml
test -f blueprints/academy/tenant.schema.json
test -f blueprints/academy/seed/franchise-defaults.json
npm run validate:academy-blueprint
echo "tenant-smoke: OK (blueprint contracts present)"
