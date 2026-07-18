#!/usr/bin/env bash
# Verify the Peskids demo auth accounts can sign in with local temporary passwords.
# No secrets are printed. Passwords are read from /tmp or from explicit env overrides.
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
PASSWORD_DIR="${PESKIDS_DEMO_AUTH_PASSWORD_DIR:-/tmp}"
if [[ -x /usr/local/bin/doppler ]]; then
  DOPPLER_BIN="/usr/local/bin/doppler"
elif command -v doppler >/dev/null 2>&1; then
  DOPPLER_BIN="$(command -v doppler)"
else
  echo "doppler CLI not found" >&2
  exit 1
fi
if [[ -x /usr/local/bin/node ]]; then
  NODE_BIN="/usr/local/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  echo "node CLI not found" >&2
  exit 1
fi

ADMIN_EMAIL="${PESKIDS_ADMIN_DEMO_EMAIL:-peskids.admin.demo@intcloudsysops.com}"
TEACHER_EMAIL="${PESKIDS_TEACHER_DEMO_EMAIL:-peskids.teacher.demo@intcloudsysops.com}"
PARENT_EMAIL="${PESKIDS_PARENT_DEMO_EMAIL:-familia.restrepo.demo@peskids.co}"

require_password() {
  local label="$1"
  local env_name="$2"
  local file_name="$3"
  local value="${!env_name:-}"
  if [[ -n "${value:-}" ]]; then
    printf '%s' "$value"
    return 0
  fi
  local file_path="${PASSWORD_DIR%/}/${file_name}"
  if [[ ! -f "$file_path" ]]; then
    echo "Missing password source for ${label}: set ${env_name} or create ${file_path}" >&2
    exit 1
  fi
  sed -n '2p' "$file_path"
}

ADMIN_PW="$(require_password "admin demo" PESKIDS_ADMIN_DEMO_PASSWORD peskids-admin-demo-password.txt)"
TEACHER_PW="$(require_password "teacher demo" PESKIDS_TEACHER_DEMO_PASSWORD peskids-teacher-demo-password.txt)"
PARENT_PW="$(require_password "parent demo" PESKIDS_PARENT_DEMO_PASSWORD peskids-parent-demo-password.txt)"

export ADMIN_PW TEACHER_PW PARENT_PW

"$DOPPLER_BIN" run --project "$PROJECT" --config "$CONFIG" -- "$NODE_BIN" --input-type=module <<'NODE'
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
if (!url || !anon) {
  throw new Error('Missing SUPABASE_URL or anon key');
}

const client = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const checks = [
  ['peskids.admin.demo@intcloudsysops.com', process.env.ADMIN_PW, 'admin'],
  ['peskids.teacher.demo@intcloudsysops.com', process.env.TEACHER_PW, 'teacher'],
  ['familia.restrepo.demo@peskids.co', process.env.PARENT_PW, 'family'],
];

for (const [email, password, label] of checks) {
  if (!password) {
    throw new Error(`Missing password for ${email}`);
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`${email}: ${error.message}`);
  }
  console.log(`OK  ${label} login (${email}) ${data.user?.id ?? 'unknown'}`);
}
NODE
