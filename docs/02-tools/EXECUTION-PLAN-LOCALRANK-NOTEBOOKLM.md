# 🚀 EXECUTION PLAN - LocalRank + NotebookLM (Tonight)

**Date:** 2026-04-09  
**Status:** Ready to execute  
**Owner:** @cboteros

---

## BLOCK 1: CLEANUP (Already Done ✅)

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops
git status --short  # Should be clean
```

---

## BLOCK 2: LOCALRANK ONBOARDING

### 2.1 Prepare Environment (Local Mac)

```bash
export SUPABASE_URL="$(doppler secrets get SUPABASE_URL --project ops-intcloudsysops --config prd --plain)"
export SUPABASE_SERVICE_ROLE_KEY="$(doppler secrets get SUPABASE_SERVICE_ROLE_KEY --project ops-intcloudsysops --config prd --plain)"
export PLATFORM_DOMAIN="ops.smiletripcare.com"
export TENANTS_PATH="/opt/opsly/runtime/tenants/"
export TEMPLATE_PATH="/opt/opsly/infra/templates/docker-compose.tenant.yml"

# Verify
echo "SUPABASE_URL length: ${#SUPABASE_URL}"
echo "SUPABASE_SERVICE_ROLE_KEY length: ${#SUBABASE_SERVICE_ROLE_KEY}"
```

### 2.2 Dry-Run Onboard (Test)

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops

./scripts/onboard-tenant.sh \
  --slug localrank \
  --email jkbotero78@gmail.com \
  --plan startup \
  --name "JK Botero Labs - LocalRank" \
  --dry-run
```

### 2.3 Execute Onboard (Real)

```bash
./scripts/onboard-tenant.sh \
  --slug localrank \
  --email jkbotero78@gmail.com \
  --plan startup \
  --name "JK Botero Labs - LocalRank"
```

### 2.4 Verify Onboard (SSH to VPS)

```bash
ssh vps-dragon@100.120.151.91
  # Inside VPS:
  cd /opt/opsly
  doppler run -- npx supabase query "SELECT slug, plan, status FROM platform.tenants WHERE slug = 'localrank'"
  docker compose --project-name tenant_localrank ps
  curl -sfk https://n8n-localrank.ops.smiletripcare.com/healthz
  curl -sfk https://uptime-localrank.ops.smiletripcare.com/api/ping
```

---

## BLOCK 3: SEND INVITATION

### 3.1 Get Admin Token

```bash
ADMIN_TOKEN=$(doppler secrets get PLATFORM_ADMIN_TOKEN --project ops-intcloudsysops --config prd --plain)
```

### 3.2 Send Invitation

```bash
curl -X POST https://api.ops.smiletripcare.com/api/invitations \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "jkbotero78@gmail.com", "slug": "localrank", "name": "JK Botero Labs", "mode": "developer"}'
```

### 3.3 Discord Notification

```bash
./scripts/notify-discord.sh \
  "🚀 LocalRank Tenant Ready" \
  "✅ Onboard complete!\n📍 n8n: https://n8n-localrank.ops.smiletripcare.com\n🎉 Invite sent" \
  "success"
```

---

## BLOCK 4: NOTEBOOKLM SETUP

### 4.1 Enable in Doppler

```bash
doppler secrets set NOTEBOOKLM_ENABLED true --project ops-intcloudsysops --config prd
doppler secrets set NOTEBOOKLM_STORAGE_PATH "/opt/opsly/.notebooklm_storage" --project ops-intcloudsysops --config prd
```

### 4.2 SSH Setup on VPS

```bash
ssh vps-dragon@100.120.151.91
  # Inside VPS:
  cd /opt/opsly
  mkdir -p .notebooklm_storage
  python3 -m pip install --upgrade -r apps/notebooklm-agent/requirements.txt
  python3 -c "import notebooklm; print('OK')"
```

### 4.3 Google Auth (Manual - one-time)

Get service account JSON from Google Cloud and run:

```bash
doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON --project ops-intcloudsysops --config prd
# Paste the service account JSON when prompted
```

---

## BLOCK 5: TEST NOTEBOOKLM WORKFLOW

### 5.1 Create Test PDF

```bash
echo "LocalRank Q1 Report
- Campaign CTR: +45%
- Leads: 230
- Video engagement: 89%" > /tmp/report.txt

textutil -convert txt /tmp/report.txt -output /tmp/localrank-report.pdf
```

### 5.2 Test Locally (Dry-Run)

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops
NOTEBOOKLM_ENABLED=true ./scripts/test-notebooklm.sh --pdf-path /tmp/localrank-report.pdf --dry-run
```

### 5.3 Execute Workflow (SSH)

```bash
ssh vps-dragon@100.120.151.91
  # Inside VPS:
  cd /opt/opsly
  doppler run -- python3 apps/notebooklm-agent/src/workflows/report-to-podcast.py \
    --pdf-path /tmp/localrank-report.pdf \
    --notebook-name "LocalRank Q1 Report" \
    --storage-path /opt/opsly/.notebooklm_storage \
    --output-dir /tmp/localrank-output
```

---

## BLOCK 6: COMMIT

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops
git add -A
git commit -m "feat(notebooklm): improve agent, add LocalRank guide, MCP tool

- Updated requirements.txt: PIL, python-pptx
- Improved ADR-014 with implementation details
- Created LOCALRANK-TESTER-GUIDE.md
- Added test-notebooklm.sh script
- Confirmed MCP tool registration"

git push origin main
```

---

## VERIFICATION CHECKLIST

- [ ] Supabase: localrank tenant exists
- [ ] Docker: n8n + uptime running
- [ ] n8n: HTTPS 200 OK
- [ ] Uptime: HTTPS 200 OK
- [ ] Invitation: Email sent
- [ ] NotebookLM: NOTEBOOKLM_ENABLED=true
- [ ] Python deps: notebooklm-py installed
- [ ] Tests: npm run test (green)

---

**Generated:** 2026-04-09  
**Status:** 🟢 Ready to execute
