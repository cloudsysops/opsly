#!/usr/bin/env bash
# Muestra metadata Supabase de un email (sin contraseña). Para validar acceso agente.
set -euo pipefail

EMAIL="${1:-cboteros1@gmail.com}"
PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"

usage() {
  cat <<EOF
Usage: ./scripts/agent-validator-check-user.sh [email]

Default email: cboteros1@gmail.com
Requires: doppler CLI + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in $PROJECT/$CONFIG
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v doppler >/dev/null 2>&1; then
  echo "FAIL: doppler CLI not found" >&2
  exit 1
fi

doppler run --project "$PROJECT" --config "$CONFIG" -- node -e "
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const target = process.argv[1].trim().toLowerCase();
fetch(url + '/auth/v1/admin/users?page=1&per_page=500', {
  headers: { Authorization: 'Bearer ' + key, apikey: key },
}).then((r) => r.json()).then((d) => {
  const users = d.users || [];
  const u = users.find((x) => (x.email || '').toLowerCase() === target);
  if (!u) {
    console.error('USER_NOT_FOUND:', process.argv[1]);
    process.exit(1);
  }
  const meta = u.user_metadata || {};
  const app = u.app_metadata || {};
  console.log('email:', u.email);
  console.log('confirmed:', Boolean(u.email_confirmed_at));
  console.log('tenant_slug:', meta.tenant_slug || app.tenant_slug || '(none)');
  console.log('role:', meta.role || app.role || '(none)');
  console.log('is_superuser:', meta.is_superuser === true || app.is_superuser === true);
  console.log('');
  console.log('Expected access:');
  const isSuper = meta.is_superuser === true || app.is_superuser === true
    || meta.role === 'admin' || app.role === 'admin';
  const slug = String(meta.tenant_slug || app.tenant_slug || '').toLowerCase();
  const role = String(meta.role || app.role || '').toLowerCase();
  console.log('  admin.op-sly.com:', isSuper || target.includes('cboteros') ? 'likely YES' : 'check OPSLY_SUPER_ADMIN_EMAILS');
  console.log('  peskids /admin:', slug === 'peskids' && (isSuper || ['owner','admin','support','teacher'].includes(role)) ? 'YES' : 'NO unless metadata fixed');
  console.log('  portal.op-sly.com:', isSuper ? 'NO (superuser blocked from portal tenant UX)' : (slug ? 'maybe YES if tenant user' : 'NO'));
}).catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
" "$EMAIL"
