#!/bin/bash
set -euo pipefail

###############################################################################
# Peskids Admin User Setup
#
# Validates and creates admin user: peskids.admin@gmail.com
# Configures permissions and RLS policies
#
# Usage: bash scripts/peskids-admin-user-setup.sh [--validate|--create|--full]
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

ADMIN_EMAIL="peskids.admin@gmail.com"
OWNER_EMAIL="sierrasantiago90@gmail.com"
TENANT_SLUG="peskids"
ACTION="${1:-validate}"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Peskids Admin User Setup                                      ║"
echo "║  Email: $ADMIN_EMAIL                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# VALIDATE — Check if user exists and has correct permissions
###############################################################################
validate_user() {
  log_info "Validating admin user configuration..."
  echo ""

  # Check 1: User exists in Supabase auth
  log_info "1. Checking if user exists in Supabase auth..."

  # Note: This requires Supabase CLI or psql access
  # For now, provide instructions
  cat <<'EOF'

To validate in Supabase:

  Option A: Via Supabase Dashboard
  ─────────────────────────────────
  1. Go: https://supabase.com/dashboard
  2. Project: jkwykpldnitavhmtuzmo (ops-intcloudsysops)
  3. Authentication → Users
  4. Search: peskids.admin@gmail.com
  5. Verify email is verified ✓

  Option B: Via psql (if you have DB access)
  ──────────────────────────────────────────
  psql -h aws-0-us-east-1.pooler.supabase.com \
       -U postgres \
       -d postgres

  Then query:
  SELECT id, email, email_confirmed_at, user_metadata
  FROM auth.users
  WHERE email = 'peskids.admin@gmail.com';

  Expected output:
  ─────────────────
  id                    | <uuid>
  email                 | peskids.admin@gmail.com
  email_confirmed_at    | 2026-06-XX (not null = verified ✓)
  user_metadata         | {"tenant_slug": "peskids", "role": "admin"}

EOF

  # Check 2: User has correct metadata
  log_info "2. Checking user metadata..."
  cat <<'EOF'

Required metadata (in Supabase auth user_metadata):
{
  "tenant_slug": "peskids",
  "role": "admin"
}

To set metadata:

  Via Supabase Dashboard:
    1. Users → peskids.admin@gmail.com
    2. User metadata (JSON editor)
    3. Add/update:
       {
         "tenant_slug": "peskids",
         "role": "admin"
       }
    4. Save

EOF

  # Check 3: RLS policies
  log_info "3. Checking RLS policies in database..."
  cat <<'EOF'

Required RLS policies:

Table: leads (tenant scope)
  SELECT: auth.jwt() ->> 'user_metadata' ->> 'tenant_slug' = 'peskids'
  INSERT: auth.jwt() ->> 'user_metadata' ->> 'tenant_slug' = 'peskids'
  UPDATE: auth.jwt() ->> 'user_metadata' ->> 'tenant_slug' = 'peskids'
  DELETE: auth.jwt() ->> 'user_metadata' ->> 'tenant_slug' = 'peskids'

Table: students (tenant scope)
  Same as above

Check in Supabase Dashboard:
  1. SQL Editor
  2. Run:
     SELECT policy_name, qual, cmd
     FROM pg_policies
     WHERE tablename = 'leads';

  Verify policies are active (USING clause matches tenant_slug)

EOF

  # Check 4: Email verification
  log_info "4. Email verification status..."
  cat <<'EOF'

User must have verified email:
  - Supabase sends verification link on signup
  - User must click link in email
  - email_confirmed_at must be NOT NULL

If not verified:
  1. Ask user to check spam folder
  2. Resend verification email via Supabase Dashboard
  3. User clicks link
  4. Verify in Users list (email_confirmed_at filled)

EOF

  log_success "Validation checklist created above"
}

###############################################################################
# CREATE — Create the admin user in Supabase
###############################################################################
create_user() {
  log_info "Creating admin user..."
  echo ""

  # Note: Actual creation requires Supabase Admin API or direct DB access
  # For security, we provide instructions instead of automated script

  cat <<'EOF'

To create admin user: peskids.admin@gmail.com

Option A: Via Supabase Dashboard (Recommended - GUI)
─────────────────────────────────────────────────────
  1. Go: https://supabase.com/dashboard
  2. Project: jkwykpldnitavhmtuzmo
  3. Authentication → Users → "Invite user"
  4. Email: peskids.admin@gmail.com
  5. Auto-send invite link: YES
  6. User will receive email with verification link
  7. User clicks link → Sets password → Logged in
  8. Then: Set user metadata (see METADATA section below)

Option B: Via Supabase Admin API (Programmatic)
────────────────────────────────────────────────
  # Requires: Supabase Admin API key + curl

  curl -X POST 'https://jkwykpldnitavhmtuzmo.supabase.co/auth/v1/admin/users' \
    -H 'apikey: <ANON_KEY>' \
    -H 'Authorization: Bearer <SERVICE_ROLE_KEY>' \
    -H 'Content-Type: application/json' \
    -d '{
      "email": "peskids.admin@gmail.com",
      "password": "<temporary_password>",
      "email_confirm": true,
      "user_metadata": {
        "tenant_slug": "peskids",
        "role": "admin"
      }
    }'

  Note: <SERVICE_ROLE_KEY> is in Supabase Project Settings → API
        Keep it SECRET!

Option C: Via psql (Direct DB)
──────────────────────────────
  # If you have direct psql access:

  psql -h aws-0-us-east-1.pooler.supabase.com \
       -U postgres \
       -d postgres

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    user_metadata
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'peskids.admin@gmail.com',
    crypt('<temporary_password>', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object(
      'tenant_slug', 'peskids',
      'role', 'admin'
    )
  );

METADATA (Required after user creation)
──────────────────────────────────────
  In Supabase Dashboard → Users → peskids.admin@gmail.com:

  JSON metadata:
  {
    "tenant_slug": "peskids",
    "role": "admin"
  }

Roles available:
  - admin: Full access to all Peskids features
  - staff: Can manage leads, send messages
  - teacher: Can view classes, submit feedback
  - parent: Can view student progress, messages

EOF

  log_warn "User creation requires Supabase Dashboard or Admin API"
  log_warn "Ask user to check email for verification link"
}

###############################################################################
# FULL SETUP — Validate + Create + Configure
###############################################################################
full_setup() {
  log_info "Running full admin user setup..."
  echo ""

  log_info "Step 1: Validation"
  validate_user

  echo ""
  log_info "Step 2: User Creation"
  create_user

  echo ""
  log_info "Step 3: Configuration Checklist"
  cat <<'EOF'

After user creation, verify:

1. ☐ User received verification email
2. ☐ User clicked verification link
3. ☐ User set password
4. ☐ User can log in to https://peskids.op-sly.com/admin
5. ☐ Dashboard loads (not 403 Forbidden)
6. ☐ User metadata shows: {"tenant_slug": "peskids", "role": "admin"}
7. ☐ User can access leads table
8. ☐ User can access other admin features

If any fails:
  - Review RLS policies
  - Check email verification status
  - Verify JWT contains tenant_slug in payload
  - Ask owner (sierrasantiago90@gmail.com) to verify settings

EOF

  log_success "Admin user setup instructions complete"
}

###############################################################################
# Show help
###############################################################################
show_help() {
  cat <<EOF
Usage: bash scripts/peskids-admin-user-setup.sh [ACTION]

Actions:
  validate    Check if user exists and has permissions (default)
  create      Create new admin user (provides instructions)
  full        Run validate + create + configure

Examples:
  bash scripts/peskids-admin-user-setup.sh validate
  bash scripts/peskids-admin-user-setup.sh create
  bash scripts/peskids-admin-user-setup.sh full

Notes:
  - Actual creation requires Supabase Dashboard or Admin API
  - This script provides checklist + instructions
  - No destructive operations performed

EOF
}

###############################################################################
# MAIN
###############################################################################
case "$ACTION" in
  validate)
    validate_user
    ;;
  create)
    create_user
    ;;
  full)
    full_setup
    ;;
  help|--help|-h)
    show_help
    exit 0
    ;;
  *)
    log_error "Unknown action: $ACTION"
    show_help
    exit 1
    ;;
esac

echo ""
log_success "Setup complete"
echo ""
