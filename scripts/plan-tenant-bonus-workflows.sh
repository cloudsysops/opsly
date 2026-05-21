#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BONUS_CONFIG="$ROOT_DIR/config/n8n-workflows/tenant-bonus-packs.json"
INSTALLER="$ROOT_DIR/scripts/install-crm-workflows.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/plan-tenant-bonus-workflows.sh [--tenant <slug>] [--commands]

Prints the safe rollout plan for Opsly tenant bonus workflow packs.
This script does not install workflows. It only validates config and prints
the dry-run/install commands to run tenant-by-tenant.

Options:
  --tenant <slug>   Show one tenant only
  --commands        Print install commands after the summary
EOF
}

TENANT_FILTER=""
PRINT_COMMANDS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant)
      TENANT_FILTER="${2:-}"
      shift 2
      ;;
    --commands)
      PRINT_COMMANDS=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$BONUS_CONFIG" ]]; then
  echo "Missing bonus config: $BONUS_CONFIG" >&2
  exit 1
fi

if [[ ! -x "$INSTALLER" ]]; then
  echo "Installer is not executable: $INSTALLER" >&2
  echo "Run: chmod +x scripts/install-crm-workflows.sh" >&2
  exit 1
fi

node - "$BONUS_CONFIG" "$TENANT_FILTER" "$PRINT_COMMANDS" <<'NODE'
const fs = require('fs');
const [configPath, tenantFilter, printCommandsRaw] = process.argv.slice(2);
const printCommands = printCommandsRaw === 'true';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (!Array.isArray(config.tenants)) {
  throw new Error('tenant-bonus-packs.json must include tenants[]');
}

const tenants = config.tenants
  .filter((tenant) => !tenantFilter || tenant.tenant_slug === tenantFilter)
  .sort((a, b) => Number(a.demo_priority ?? 999) - Number(b.demo_priority ?? 999));

if (tenants.length === 0) {
  throw new Error(`No tenants matched filter: ${tenantFilter}`);
}

console.log(`Bonus workflow rollout policy: ${config.rollout_policy.install_mode}`);
console.log(`Activation: ${config.rollout_policy.activation_mode}`);
console.log('');

for (const tenant of tenants) {
  console.log(`${tenant.demo_priority}. ${tenant.tenant_slug} - ${tenant.bonus_label}`);
  console.log(`   status: ${tenant.status}`);
  console.log(`   packs: ${tenant.pack_ids.join(', ')}`);
  console.log(`   outcomes: ${tenant.primary_outcomes.join('; ')}`);
}

if (printCommands) {
  console.log('');
  console.log('Dry-run commands:');
  for (const tenant of tenants) {
    console.log(`./scripts/install-crm-workflows.sh --tenant ${tenant.tenant_slug} --dry-run`);
  }
  console.log('');
  console.log('Install commands after human approval:');
  for (const tenant of tenants) {
    console.log(`./scripts/install-crm-workflows.sh --tenant ${tenant.tenant_slug}`);
  }
}
NODE
