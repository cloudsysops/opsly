#!/bin/bash

set -euo pipefail

# Opsly — Repeatable Client Onboarding
# Purpose: Automate full stack provisioning for new tenant
# Usage: ./scripts/onboard-new-client.sh <tenant_slug> <ghl_location_id> [--owner-email <email>] [--dry-run]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Defaults
TENANT_SLUG=""
GHL_LOCATION_ID=""
OWNER_EMAIL=""
DRY_RUN=false

log_info() {
  echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

log_success() {
  echo -e "${GREEN}✅ OK${NC}: $1"
}

log_warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

log_error() {
  echo -e "${RED}❌ ERROR${NC}: $1"
}

# Parse arguments
if [ $# -lt 2 ]; then
  echo "Usage: $0 <tenant_slug> <ghl_location_id> [--owner-email <email>] [--dry-run]"
  echo ""
  echo "Example:"
  echo "  $0 icso 12345 --owner-email sales@icso.com"
  echo "  $0 acme 67890 --owner-email admin@acme.com --dry-run"
  exit 1
fi

TENANT_SLUG="$1"
GHL_LOCATION_ID="$2"
shift 2

while [ $# -gt 0 ]; do
  case "$1" in
    --owner-email)
      OWNER_EMAIL="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      log_error "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# Validation
if [ -z "$TENANT_SLUG" ] || [ -z "$GHL_LOCATION_ID" ]; then
  log_error "tenant_slug and ghl_location_id are required"
  exit 1
fi

if [ ${#TENANT_SLUG} -lt 3 ] || [ ${#TENANT_SLUG} -gt 20 ]; then
  log_error "tenant_slug must be 3-20 characters"
  exit 1
fi

if ! [[ "$GHL_LOCATION_ID" =~ ^[0-9]+$ ]]; then
  log_error "ghl_location_id must be numeric"
  exit 1
fi

if [ -z "$OWNER_EMAIL" ]; then
  OWNER_EMAIL="${TENANT_SLUG}@example.com"
  log_warn "No owner email provided, using: $OWNER_EMAIL"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 OPSLY CLIENT ONBOARDING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Tenant Slug:       $TENANT_SLUG"
echo "GHL Location ID:   $GHL_LOCATION_ID"
echo "Owner Email:       $OWNER_EMAIL"
echo "Dry Run:           $DRY_RUN"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 1: Tenant configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
log_info "Step 1: Creating tenant configuration..."

TENANT_CONFIG_FILE="$PROJECT_ROOT/config/tenants/$TENANT_SLUG.json"

if [ -f "$TENANT_CONFIG_FILE" ]; then
  log_warn "Tenant config already exists: $TENANT_CONFIG_FILE"
else
  TENANT_CONFIG=$(cat <<EOF
{
  "slug": "$TENANT_SLUG",
  "owner_email": "$OWNER_EMAIL",
  "domain": "$TENANT_SLUG.op-sly.com",
  "status": "active",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "ghl_location_id": "$GHL_LOCATION_ID",
  "features": {
    "lead_capture": true,
    "ghl_integration": true,
    "calendar": false,
    "email": false,
    "sms": false,
    "whatsapp": false
  },
  "plan": "starter"
}
EOF
)

  if [ "$DRY_RUN" = false ]; then
    mkdir -p "$(dirname "$TENANT_CONFIG_FILE")"
    echo "$TENANT_CONFIG" > "$TENANT_CONFIG_FILE"
    log_success "Created tenant config: $TENANT_CONFIG_FILE"
  else
    log_info "[DRY-RUN] Would create: $TENANT_CONFIG_FILE"
  fi
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 2: Database schema migration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
log_info "Step 2: Creating database migration template..."

MIGRATION_NAME="$(date +%Y%m%d)_create_${TENANT_SLUG}_schema.sql"
MIGRATION_FILE="$PROJECT_ROOT/supabase/migrations/$MIGRATION_NAME"

if [ "$DRY_RUN" = false ]; then
  mkdir -p "$(dirname "$MIGRATION_FILE")"

  # Copy from Peskids template
  cat > "$MIGRATION_FILE" << 'SQL'
-- Create tenant-specific schema
-- Replace 'TENANT_SLUG' with actual tenant slug

-- Tables (copied from Peskids MVP)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null default 'TENANT_SLUG',
  source text,
  status text default 'new',
  full_name text,
  email text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null default 'TENANT_SLUG',
  email text unique,
  phone text,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null default 'TENANT_SLUG',
  parent_id uuid references public.parents(id),
  full_name text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null default 'TENANT_SLUG',
  author_type text,
  subject_type text,
  rating int,
  status text default 'new',
  created_at timestamptz default now()
);

-- Indexes
create index idx_leads_tenant on public.leads(tenant_slug);
create index idx_parents_tenant on public.parents(tenant_slug);
create index idx_students_tenant on public.students(tenant_slug);
create index idx_feedback_tenant on public.feedback(tenant_slug);

-- RLS Policies
alter table public.leads enable row level security;
alter table public.parents enable row level security;
alter table public.students enable row level security;
alter table public.feedback enable row level security;

-- Simplified RLS: assume service role (backend) handles tenant isolation
-- Production: add JWT claims-based RLS for client-side access
SQL

  log_success "Created migration: $MIGRATION_FILE"
  log_warn "⚠️  MANUAL STEP: Replace 'TENANT_SLUG' placeholder in migration file"
  log_warn "    Then run: supabase migration up"
else
  log_info "[DRY-RUN] Would create: $MIGRATION_FILE"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 3: Landing page template
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
log_info "Step 3: Creating landing page template..."

LANDING_PAGE="$PROJECT_ROOT/apps/web/$TENANT_SLUG/page.tsx"

if [ "$DRY_RUN" = false ]; then
  mkdir -p "$(dirname "$LANDING_PAGE")"

  cat > "$LANDING_PAGE" << 'TSX'
import { Button } from '@intcloudsysops/components/ui/button';

export default function LandingPage() {
  const tenantSlug = 'TENANT_SLUG';
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      tenant_slug: tenantSlug,
      full_name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      source: 'landing_page',
      status: 'new'
    };

    const response = await fetch(`/api/${tenantSlug}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      alert('Thank you! We\'ll be in touch soon.');
      (e.target as HTMLFormElement).reset();
    } else {
      alert('Error submitting form. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Lead Capture for TENANT_NAME
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Simple, fast, and connected to your workflow
          </p>
        </section>

        {/* Form */}
        <section className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Get Started Today</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Submit
            </Button>
          </form>
        </section>

        {/* Features */}
        <section className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">📝 Easy Form</h3>
            <p className="text-gray-600">Simple lead capture form</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">🔄 Auto Sync</h3>
            <p className="text-gray-600">Automatic contact creation</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">⚡ Fast</h3>
            <p className="text-gray-600">Leads synced in seconds</p>
          </div>
        </section>
      </div>
    </main>
  );
}
TSX

  log_success "Created landing page: $LANDING_PAGE"
  log_warn "⚠️  MANUAL STEP: Replace TENANT_NAME and TENANT_SLUG placeholders"
else
  log_info "[DRY-RUN] Would create: $LANDING_PAGE"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 4: Doppler secrets template
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
log_info "Step 4: Creating Doppler secrets template..."

DOPPLER_TEMPLATE="$PROJECT_ROOT/.env.${TENANT_SLUG}.example"

if [ "$DRY_RUN" = false ]; then
  cat > "$DOPPLER_TEMPLATE" << EOF
# $TENANT_SLUG Environment Variables
# Copy to Doppler project: ops-intcloudsysops / prd

NEXT_PUBLIC_SUPABASE_URL=https://jkwykpldnitavhmtuzmo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from Doppler prd]
SUPABASE_SERVICE_ROLE_KEY=[from Doppler prd]

# GoHighLevel Integration
GOHIGHLEVEL_API_KEY=[from Doppler prd]
GOHIGHLEVEL_LOCATION_ID=$GHL_LOCATION_ID
GOHIGHLEVEL_PIPELINE_ID=[lookup from GHL API]
GOHIGHLEVEL_PIPELINE_STAGE_ID=[lookup from GHL API]

# Tenant
NEXT_PUBLIC_TENANT_ID=$TENANT_SLUG
TENANT_SLUG=$TENANT_SLUG

# n8n (VPS container)
N8N_WEBHOOK_BASE_URL=http://n8n-$TENANT_SLUG:5678/webhook

# Email/SMS (Week 2)
TWILIO_ACCOUNT_SID=[TBD]
TWILIO_AUTH_TOKEN=[TBD]
TWILIO_PHONE_NUMBER=[TBD]
EOF

  log_success "Created Doppler template: $DOPPLER_TEMPLATE"
  log_warn "⚠️  MANUAL STEP: Copy template to Doppler project"
  log_warn "    Doppler project: ops-intcloudsysops"
  log_warn "    Config: prd"
else
  log_info "[DRY-RUN] Would create: $DOPPLER_TEMPLATE"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 5: n8n Docker Compose template
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
log_info "Step 5: Creating n8n Docker Compose template..."

N8N_COMPOSE="$PROJECT_ROOT/infra/docker-compose.${TENANT_SLUG}-n8n.yml"

if [ "$DRY_RUN" = false ]; then
  cat > "$N8N_COMPOSE" << 'YAML'
# n8n for TENANT_SLUG
# Deploy: docker-compose -f infra/docker-compose.TENANT_SLUG-n8n.yml up -d

version: '3.8'

services:
  n8n-TENANT_SLUG:
    image: n8nio/n8n:latest
    container_name: n8n-TENANT_SLUG
    environment:
      - DB_TYPE=sqlite
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_ADMIN_EMAIL:-admin@TENANT_SLUG.com}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_ADMIN_PASSWORD:-changeme}
      - N8N_HOST=n8n-TENANT_SLUG.DOMAIN
      - N8N_PROTOCOL=https
      - WEBHOOK_TUNNEL_URL=https://n8n-TENANT_SLUG.DOMAIN/
    volumes:
      - n8n-TENANT_SLUG-data:/home/node/.n8n
    networks:
      - traefik-public
    labels:
      - 'traefik.enable=true'
      - 'traefik.docker.network=traefik-public'
      - 'traefik.http.routers.n8n-TENANT_SLUG.rule=Host(`n8n-TENANT_SLUG.DOMAIN`)'
      - 'traefik.http.routers.n8n-TENANT_SLUG.entrypoints=websecure'
      - 'traefik.http.routers.n8n-TENANT_SLUG.tls.certresolver=letsencrypt'
      - 'traefik.http.services.n8n-TENANT_SLUG.loadbalancer.server.port=5678'
    restart: unless-stopped

volumes:
  n8n-TENANT_SLUG-data:

networks:
  traefik-public:
    external: true
YAML

  log_success "Created n8n template: $N8N_COMPOSE"
  log_warn "⚠️  MANUAL STEP: Deploy with: docker-compose -f $N8N_COMPOSE up -d"
else
  log_info "[DRY-RUN] Would create: $N8N_COMPOSE"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 6: API route template
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
log_info "Step 6: Creating API route template..."

API_ROUTE="$PROJECT_ROOT/apps/api/app/api/$TENANT_SLUG/leads/route.ts"

if [ "$DRY_RUN" = false ]; then
  mkdir -p "$(dirname "$API_ROUTE")"

  cat > "$API_ROUTE" << 'TSX'
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantSlug = 'TENANT_SLUG';

    // Validate required fields
    if (!body.full_name || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert lead
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          tenant_slug: tenantSlug,
          full_name: body.full_name,
          email: body.email,
          phone: body.phone,
          source: body.source || 'api',
          status: body.status || 'new'
        }
      ])
      .select();

    if (error) throw error;

    // TODO: Dispatch to GHL
    // TODO: Apply tags
    // TODO: Trigger n8n workflows

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Lead creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
TSX

  log_success "Created API route: $API_ROUTE"
else
  log_info "[DRY-RUN] Would create: $API_ROUTE"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ONBOARDING SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Templates created:"
echo "   1. Tenant config: config/tenants/$TENANT_SLUG.json"
echo "   2. DB migration: supabase/migrations/*_create_${TENANT_SLUG}_schema.sql"
echo "   3. Landing page: apps/web/$TENANT_SLUG/page.tsx"
echo "   4. Doppler template: .env.${TENANT_SLUG}.example"
echo "   5. n8n Docker: infra/docker-compose.${TENANT_SLUG}-n8n.yml"
echo "   6. API route: apps/api/app/api/$TENANT_SLUG/leads/route.ts"
echo ""
echo "🔧 Next manual steps:"
echo "   [ ] Replace TENANT_NAME and TENANT_SLUG placeholders"
echo "   [ ] Run supabase migration: supabase migration up"
echo "   [ ] Copy Doppler secrets to production"
echo "   [ ] Deploy n8n: docker-compose -f infra/docker-compose.${TENANT_SLUG}-n8n.yml up -d"
echo "   [ ] Configure Traefik routing for ${TENANT_SLUG}.op-sly.com"
echo "   [ ] Test lead capture → GHL sync"
echo "   [ ] Deploy landing page to production"
echo ""
echo "⏱️  Estimated time to full deployment: 2-4 hours"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "✅ Dry run complete — No actual changes made"
else
  echo "✅ Onboarding templates created — Ready for configuration"
fi
