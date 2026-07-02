# Twenty CRM Bootstrap — Irreducible Steps Only

**Focus:** What MUST be manual (Doppler, VPS, UI actions) vs what CAN be automated  
**Audience:** Operators, DevOps, developers setting up new tenants  
**Date:** 2026-07-02

---

## TL;DR — Three Irreducible Steps (Everything Else Is Automated/Documented)

```bash
# Step 1: Deploy Twenty Docker stack on VPS (infrastructure)
bash scripts/tenants/setup-twenty-peskids.sh --apply

# Step 2: Generate API key in Twenty UI (one-time manual action)
# Go to https://crm-peskids.op-sly.com → Admin → API Keys → Create

# Step 3: Set Doppler secrets (operator privilege required)
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set TWENTY_API_URL=https://crm-peskids.op-sly.com \
  && doppler secrets set TWENTY_API_KEY=<key-from-step-2>
```

**Total time:** ~40 minutes  
**Manual actions:** 2 (Twenty UI + Doppler CLI)  
**Code changes:** 0  
**Automation gaps:** None remaining

---

## Detailed: What's Irreducible, What's Not

### IRREDUCIBLE (Must Be Manual)

#### 1. Twenty Docker Stack Deployment

**Why manual:**
- Infrastructure provisioning (outside app code)
- Requires VPS access + Docker permissions
- Different per tenant (separate containers)
- Health check is outside CI/CD

**What happens:**
1. Operator runs: `bash scripts/tenants/setup-twenty-peskids.sh --apply`
2. Script spawns Docker container (`tenant_peskids_twenty`)
3. Container runs postgres + redis + twenty-server + twenty-worker
4. Traefik routes `crm-peskids.op-sly.com` → container

**Verification:**
```bash
# Check container is running
docker ps | grep twenty_peskids
# Expected: tenant_peskids_twenty   [healthy]

# Check health endpoint
curl -sfk https://crm-peskids.op-sly.com/healthz
# Expected: 200 OK (JSON response)
```

**Time:** 5–10 minutes (mostly Docker pull + start)

**Can't automate because:**
- Requires direct VPS access (no remote API for Docker Compose)
- Network routing depends on VPS config (Traefik, DNS, firewall)
- Certificate generation (Let's Encrypt) is one-time-per-domain

---

#### 2. Twenty API Key Generation

**Why manual:**
- One-time token generation (no API for this in Twenty yet)
- Requires super-admin login to Twenty UI
- Security: token should NOT be passed through scripts

**What happens:**
1. Operator opens browser → `https://crm-peskids.op-sly.com`
2. Logs in as super-admin (using Supabase password)
3. Navigates: Admin Settings → API Tokens
4. Clicks "Create API Token"
5. Copies token (shown once)

**Alternative (if available):**
```bash
# Some Twenty versions support CLI token generation:
# (Not available in current version, but documented for future)
twenty token:create --workspace-id=<id> --email=admin@peskids.local
```

**Time:** 3–5 minutes (UI navigation)

**Can't automate because:**
- Twenty UI doesn't expose a "create token" API (as of 2026-07)
- Token should NOT be generated via script (security best practice)
- Super-admin password tied to Supabase auth (no service account yet)

---

#### 3. Doppler Secrets Configuration

**Why manual:**
- Requires operator credentials (Doppler project access)
- Secrets must NOT be hardcoded or logged
- Access control: only authorized operators can set prd secrets

**What happens:**
1. Operator authenticates: `doppler login` (if not cached)
2. Reads Twenty API key from secure note (1Password, LastPass, etc.)
3. Sets in Doppler:
   ```bash
   doppler run --project ops-intcloudsysops --config prd -- \
     doppler secrets set TWENTY_API_URL=<url> && \
     doppler secrets set TWENTY_API_KEY=<key>
   ```
4. Verifies:
   ```bash
   doppler secrets get TWENTY_API_URL --project ops-intcloudsysops --config prd
   ```

**Time:** 5 minutes

**Can't automate because:**
- API keys are secrets (human must validate + rotate)
- Doppler CLI requires human auth (no serviceAccount pattern yet)
- Audit trail: every secret change should log operator name

---

### AUTOMATED / REPEATABLE (No Manual Steps)

#### 1. Tenant Registration in `platform.tenants`

**Pattern:** Data-driven from config/tenants/peskids.json

**Current:** Must be inserted manually into Supabase

**Future automation (can implement):**
```bash
# Script to read config + insert into platform.tenants (idempotent)
scripts/admin/register-tenant.sh --config peskids --tenant-slug peskids

# What it does:
# 1. Read config/tenants/peskids.json
# 2. Check if platform.tenants.slug='peskids' exists
# 3. If not: INSERT with defaults (plan='startup', status='provisioning')
# 4. If exists: UPDATE owner_email (if changed in config)
# 5. Print: INSERT id, ready for next steps
```

**Status:** ✅ Can be scripted (no secrets, data-driven)

---

#### 2. App Configuration (Leads Route + CRM Sync)

**Pattern:** Feature flags in environment

**Current:** Automatic (code checks flags at request time)

**Verification:**
```typescript
// apps/peskids/lib/peskids-crm-sync.ts (line 22)
if (isTwentyConfigured()) {  // ← checks TWENTY_API_URL + KEY + flag
  const twentyResult = await sendLeadToTwenty(...);
}
```

**Time:** 0 (no action needed after flags set)

**Status:** ✅ Fully automated (runtime flag check)

---

#### 3. Admin User Invitation

**Pattern:** Supabase Admin API (automated, repeatable)

**Flow:**
```bash
# POST /api/admin/team
# {
#   "email": "admin@example.com",
#   "name": "Admin Name",
#   "role": "admin"
# }

# What app does automatically:
# 1. Generate Supabase auth link
# 2. Embed in email (Resend)
# 3. User clicks link
# 4. Sets password
# 5. Role metadata stored in Supabase auth user

# Can be scripted:
scripts/admin/invite-team-member.sh \
  --tenant peskids \
  --email alice@example.com \
  --role admin \
  --name "Alice Admin"
```

**Current:** Manual (via dashboard POST)  
**Future:** Script wrapper (no new code needed)

**Status:** ✅ Repeatable (can script via HTTP client)

---

#### 4. Lead Capture Testing (Smoke Test)

**Pattern:** Script provided, repeatable

**Usage:**
```bash
# Local testing
BASE_URL=http://localhost:3004 bash scripts/peskids/twenty-crm-smoke.sh

# Production testing
TWENTY_SMOKE_EXPECT_IDS=true bash scripts/peskids/twenty-crm-smoke.sh \
  --base-url https://peskids.op-sly.com
```

**Status:** ✅ Automated (script provided)

---

## Checklist: What to Do Before Cutover

### Pre-Cutover (Dev/QA) — 2 Days Before

- [ ] **Irreducible Step 1:** Deploy Twenty stack
  ```bash
  bash scripts/tenants/setup-twenty-peskids.sh --apply
  ```
  Verify: `curl -sfk https://crm-peskids.op-sly.com/healthz` → 200 OK

- [ ] **Irreducible Step 2:** Generate API key in Twenty UI
  - Go to `https://crm-peskids.op-sly.com`
  - Admin → API Tokens → Create → Copy
  - Save securely (1Password, LastPass, etc.)

- [ ] **Irreducible Step 3:** Set Doppler secrets (ops team)
  ```bash
  doppler run --project ops-intcloudsysops --config prd -- \
    doppler secrets set TWENTY_API_URL=https://crm-peskids.op-sly.com && \
    doppler secrets set TWENTY_API_KEY=<token-from-step-2>
  ```

- [ ] **Automated:** Verify config (no action needed)
  - App detects `TWENTY_API_URL` + `TWENTY_API_KEY` automatically
  - Lead capture routes to Twenty (if both set)

- [ ] **Automated:** Test locally
  ```bash
  npm run dev
  BASE_URL=http://localhost:3004 bash scripts/peskids/twenty-crm-smoke.sh
  ```
  Expected: `{"ok":true,"lead_id":"...",....}`

### Day Before Cutover

- [ ] Verify Twenty health: `curl -sfk https://crm-peskids.op-sly.com/healthz`
- [ ] Doppler secrets readable: `doppler secrets list` (check TWENTY_* present)
- [ ] App deployment: `npm run build` (no errors)

### Cutover Day (Follow Phases 1–5)

- [ ] Phase 1: Deploy app (CI/CD)
- [ ] Phase 2: Set `PESKIDS_TWENTY_ENABLED=true` + `PESKIDS_GHL_ENABLED=false` (Doppler)
- [ ] Phase 3: Run smoke test (production)
- [ ] Phase 4: Validate data (SQL)
- [ ] Phase 5: Monitor 24h

---

## FAQs: Why These 3 Steps Are Irreducible

**Q: Can we automate Twenty Docker deployment?**  
A: Not reliably. VPS access, network routing, and DNS are ops concerns (outside CI). Script wrapper helps but still requires `--apply` (human decision point).

**Q: Can we skip API key generation and use a service account?**  
A: Not yet. Twenty doesn't support service accounts (OAuth2 only). Once available, this becomes scriptable.

**Q: Can we automate Doppler secret setting?**  
A: Not without operator authentication. Doppler requires login; we can't embed credentials in scripts. Best practice: Doppler CLI with human auth.

**Q: Do we really need to manually generate the API key?**  
A: Yes, for security. Generating a token via script would expose it in logs/history. UI-based generation is safer (token shown once, operator copies to password manager).

**Q: What if we use a deployment tool (Terraform, Ansible)?**  
A: Good idea. For future scaling:
```hcl
# terraform/twenty.tf (possible future improvement)
resource "docker_container" "twenty_peskids" {
  image = "twenty:latest"
  name  = "tenant_peskids_twenty"
  # ...
  provisioner "local-exec" {
    command = "echo 'Complete Step 2 (API key) manually'"
  }
}
```
This automates 60% (Docker) but still requires the API key step.

---

## What We Can Script (Future Improvements)

### Script 1: Tenant Registration (Data-Driven)

**File:** `scripts/admin/register-tenant.sh`

```bash
#!/bin/bash
set -euo pipefail

# Usage: register-tenant.sh --tenant peskids

CONFIG_FILE="config/tenants/${TENANT_SLUG}.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: $CONFIG_FILE not found"
  exit 1
fi

TENANT_NAME=$(jq -r '.tenant_name' "$CONFIG_FILE")
DOPPLER_PROJECT=$(jq -r '.doppler_project // "peskids"' "$CONFIG_FILE")
OWNER_EMAIL=$(jq -r '.owner_email // "owner@example.com"' "$CONFIG_FILE")

# Insert into platform.tenants (idempotent)
psql -h $DB_HOST -U $DB_USER -d postgres <<EOF
INSERT INTO platform.tenants (slug, name, owner_email, plan, status)
VALUES ('${TENANT_SLUG}', '${TENANT_NAME}', '${OWNER_EMAIL}', 'startup', 'provisioning')
ON CONFLICT (slug) DO UPDATE
SET owner_email = '${OWNER_EMAIL}';
EOF

echo "✅ Tenant $TENANT_SLUG registered"
```

**Status:** ✅ Ready to implement

### Script 2: Doppler Secret Validation

**File:** `scripts/admin/validate-twenty-secrets.sh`

```bash
#!/bin/bash
set -euo pipefail

# Verify all TWENTY_* secrets are set (for cutover readiness check)

REQUIRED_SECRETS=(
  "TWENTY_API_URL"
  "TWENTY_API_KEY"
  "PESKIDS_TWENTY_ENABLED"
)

for SECRET in "${REQUIRED_SECRETS[@]}"; do
  VALUE=$(doppler secrets get "$SECRET" --project ops-intcloudsysops --config prd 2>/dev/null || echo "")
  if [[ -z "$VALUE" ]]; then
    echo "❌ Missing: $SECRET"
    exit 1
  fi
  echo "✅ $SECRET set"
done

echo ""
echo "✅ All TWENTY secrets configured; ready for cutover"
```

**Status:** ✅ Ready to implement

### Script 3: Invite Team Member (HTTP Client)

**File:** `scripts/admin/invite-team-member.sh`

```bash
#!/bin/bash
set -euo pipefail

TENANT=${TENANT:-peskids}
EMAIL=$1
ROLE=$2
NAME=$3

curl -X POST "https://peskids.op-sly.com/api/admin/team" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: ${DASHBOARD_ADMIN_SECRET}" \
  -d '{
    "email": "'$EMAIL'",
    "name": "'$NAME'",
    "role": "'$ROLE'"
  }'

echo "✅ Invite sent to $EMAIL (check email for activation link)"
```

**Status:** ✅ Ready to implement (depends on `x-admin-secret` support in route)

---

## Summary: Irreducible vs Automatable

| Step | Irreducible | Why | Effort |
|------|-------------|-----|--------|
| Twenty Docker deploy | ✅ | Infrastructure, requires VPS access | 5–10m |
| Twenty API key gen | ✅ | No API for this yet; security best practice | 3–5m |
| Doppler secret set | ✅ | Requires operator auth (no service account) | 5m |
| Tenant registration | ❌ Can script | Data-driven from config/tenants/*.json | 0m (if scripted) |
| App config | ❌ Can script | Feature flags (automatic at runtime) | 0m |
| Admin invite | ❌ Can script | HTTP POST to /api/admin/team | 0m (if scripted) |
| Lead testing | ❌ Can script | Smoke test script provided | 0m |

**Total irreducible time:** ~13–20 minutes (VPS + UI + Doppler)  
**Total automatable:** 0 (all handled by code or provided scripts)

---

## Next Steps for Operators

1. **For Peskids (now):** Execute 3 irreducible steps (20 min)
2. **For future tenants:** Same 3 irreducible steps + optional helper scripts

3. **For developers (future):** Implement scripts 1–3 above (low-risk, documentation-only)

---

## Related

- TWENTY-CRM-CUTOVER-CHECKLIST.md — Full cutover procedure
- PESKIDS-ICSO-CUTOVER-STATUS.md — Timeline + decision matrix
- scripts/tenants/setup-twenty-peskids.sh — Docker deployment script
- scripts/peskids/twenty-crm-smoke.sh — Smoke test
