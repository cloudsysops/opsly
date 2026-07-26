#!/usr/bin/env bash
# Invita (o re-sincroniza metadata) de un super admin de plataforma en Supabase Auth.
# Uso:
#   ./scripts/bootstrap-platform-admin-invite.sh [email] [--tenant-slug SLUG] [--role owner|admin] [--no-superuser] [--dry-run]
#
# Ejemplos:
#   ./scripts/bootstrap-platform-admin-invite.sh cboteros1@gmail.com
#   ./scripts/bootstrap-platform-admin-invite.sh sierrasantiago90@gmail.com --tenant-slug peskids --role owner --no-superuser
#
# Requiere: doppler CLI + ops-intcloudsysops/prd (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

EMAIL="${1:-cboteros1@gmail.com}"
TENANT_SLUG="intcloudsysops"
ROLE="admin"
SUPERUSER="true"
DRY_RUN="false"

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant-slug)
      TENANT_SLUG="${2:-}"
      shift 2
      ;;
    --role)
      ROLE="${2:-}"
      shift 2
      ;;
    --no-superuser)
      SUPERUSER="false"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h | --help)
      grep '^#' "$0" | head -25
      exit 0
      ;;
    *)
      if [[ "$1" == *@* ]]; then
        EMAIL="$1"
      else
        die "Argumento desconocido: $1" 1
      fi
      shift
      ;;
  esac
done

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"

if ! command -v doppler >/dev/null 2>&1; then
  die "doppler CLI no encontrado" 1
fi

echo "Bootstrap super admin"
echo "  email:        ${EMAIL}"
echo "  tenant_slug:  ${TENANT_SLUG}"
echo "  role:         ${ROLE}"
echo "  superuser:    ${SUPERUSER}"
echo "  doppler:      ${PROJECT}/${CONFIG}"
echo "  dry-run:      ${DRY_RUN}"

export BOOTSTRAP_EMAIL="${EMAIL}"
export BOOTSTRAP_TENANT_SLUG="${TENANT_SLUG}"
export BOOTSTRAP_ROLE="${ROLE}"
export BOOTSTRAP_SUPERUSER="${SUPERUSER}"
export BOOTSTRAP_DRY_RUN="${DRY_RUN}"

doppler run --project "$PROJECT" --config "$CONFIG" -- node <<'NODE'
const email = process.env.BOOTSTRAP_EMAIL.trim().toLowerCase();
const tenantSlug = process.env.BOOTSTRAP_TENANT_SLUG.trim().toLowerCase();
const role = (process.env.BOOTSTRAP_ROLE || 'admin').trim().toLowerCase();
const isSuperuser = process.env.BOOTSTRAP_SUPERUSER === 'true';
const dryRun = process.env.BOOTSTRAP_DRY_RUN === 'true';

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error('FAIL: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY vacíos en Doppler');
  process.exit(1);
}

const portalBase = (process.env.PORTAL_SITE_URL || '').replace(/\/$/, '')
  || (process.env.PLATFORM_DOMAIN
    ? `https://portal.${process.env.PLATFORM_DOMAIN.trim()}`
    : 'https://portal.op-sly.com');

const displayName =
  tenantSlug === 'peskids' && role === 'owner' ? 'Peskids Owner' : 'Platform Admin';
const userMetadata = {
  full_name: displayName,
  role,
  tenant_slug: tenantSlug,
  ...(isSuperuser ? { is_superuser: true } : {}),
};
const appMetadata = {
  role,
  tenant_slug: tenantSlug,
  ...(isSuperuser ? { is_superuser: true } : {}),
};

async function listUsers() {
  const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=500`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.msg || body.message || `listUsers HTTP ${res.status}`);
  }
  return body.users || [];
}

async function updateUser(id) {
  const res = await fetch(`${url}/auth/v1/admin/users/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_metadata: userMetadata,
      app_metadata: appMetadata,
      email_confirm: true,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.msg || body.message || `updateUser HTTP ${res.status}`);
  }
  return body;
}

async function inviteUser() {
  const res = await fetch(`${url}/auth/v1/invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      data: userMetadata,
      redirect_to: `${portalBase}/invite`,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.msg || body.message || JSON.stringify(body));
  }
  return body;
}

async function generateInviteLink() {
  const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'invite',
      email,
      options: {
        data: userMetadata,
        redirect_to: `${portalBase}/invite`,
      },
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.msg || body.message || `generate_link HTTP ${res.status}`);
  }
  return body;
}

async function generateRecoveryLink(adminBase) {
  const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'recovery',
      email,
      options: {
        redirect_to: `${adminBase}/auth/recovery`,
      },
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.msg || body.message || `recovery link HTTP ${res.status}`);
  }
  return body;
}

function parseToken(actionLink) {
  try {
    return new URL(actionLink).searchParams.get('token');
  } catch {
    return null;
  }
}

(async () => {
  const users = await listUsers();
  const existing = users.find((u) => (u.email || '').toLowerCase() === email);

  if (existing) {
    console.log('USER_EXISTS:', existing.id);
    console.log('confirmed:', existing.email_confirmed_at ? 'yes' : 'no');
    console.log('last_sign_in:', existing.last_sign_in_at || 'never');
    if (dryRun) {
      console.log('DRY_RUN: actualizaría metadata y enviaría recovery a admin (no invite)');
      process.exit(0);
    }
    await updateUser(existing.id);
    console.log('OK: metadata actualizada (admin + superuser + tenant_slug)');
    console.log('SKIP: invite API (usuario ya registrado — usar recovery abajo)');
  } else if (dryRun) {
    console.log('DRY_RUN: crearía usuario e invitaría por email');
    process.exit(0);
  } else {
    try {
      await inviteUser();
      console.log('OK: invite enviado por Supabase Auth (revisa bandeja de entrada)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/already|registered|exists/i.test(msg)) {
        throw err;
      }
      console.log('WARN: invite API:', msg);
    }
  }

  const platformAdminBase = (process.env.ADMIN_SITE_URL || '').replace(/\/$/, '')
    || (process.env.PLATFORM_DOMAIN
      ? `https://admin.${process.env.PLATFORM_DOMAIN.trim()}`
      : 'https://admin.op-sly.com');
  const peskidsAdminBase = (process.env.PESKIDS_SITE_URL || 'https://www.peskids.com').replace(
    /\/$/,
    ''
  );
  const recoveryBase =
    tenantSlug === 'peskids' && !isSuperuser ? peskidsAdminBase : platformAdminBase;

  if (!dryRun) {
    if (existing) {
      const recoveryPayload = await generateRecoveryLink(recoveryBase);
      const recoveryLink =
        recoveryPayload?.action_link || recoveryPayload?.properties?.action_link;
      if (recoveryLink) {
        console.log('');
        console.log('Recovery admin (abrir una vez, ~1h):');
        console.log(recoveryLink);
        console.log('');
        console.log('Si Supabase redirige al portal: añade en Dashboard → Auth → URL:');
        console.log(`  ${recoveryBase}/auth/recovery`);
        console.log(`  ${recoveryBase}/update-password`);
      }
    } else {
      const linkPayload = await generateInviteLink();
      const actionLink = linkPayload?.action_link || linkPayload?.properties?.action_link;
      if (actionLink) {
        const token = parseToken(actionLink);
        if (token) {
          const manual = `${portalBase}/invite/${encodeURIComponent(token)}?email=${encodeURIComponent(email)}`;
          console.log('');
          console.log('Enlace manual invite (si el correo no llega):');
          console.log(manual);
        }
      }
    }
  }

  console.log('');
  console.log('Acceso esperado tras activar contraseña:');
  console.log(`  admin:  ${platformAdminBase}/login  ← superuser / plataforma`);
  if (isSuperuser || tenantSlug === 'peskids') {
    console.log('  peskids: https://www.peskids.com/admin/login');
  }
  console.log(`  portal (${tenantSlug}): https://portal.op-sly.com/login`);
})().catch((e) => {
  console.error('FAIL:', e.message || e);
  process.exit(1);
});
NODE

echo "✅ Listo."
