---
status: guide
owner: operations
type: peskids-deployment
---

# Phase 2 Week 1: VPS Setup Guide for N8N + Lead Workflows

**Timeline:** ~4-6 hours from your local machine  
**Prerequisites:** Tailscale access to `vps-dragon@100.120.151.91` (already configured)  
**Owner:** cboteros1@gmail.com  
**Status:** Ready to execute

---

## ✅ Quick Start (5 Commands)

If you've done this before or want the fast path:

```bash
# 1. Connect to VPS via Tailscale
ssh vps-dragon@100.120.151.91

# 2. Inside VPS, set up n8n
cd /opt/opsly
./scripts/setup-n8n-tenant.sh --vps-host 100.120.151.91 --tenant peskids

# 3. Verify n8n container is running
docker ps | grep tenant_peskids

# 4. Access n8n UI and create workflows manually
# https://peskids.op-sly.com/n8n/

# 5. Create RLS policies in Supabase
# (see "Database RLS Setup" section below)
```

---

## 📋 Detailed Steps

### Step 1: SSH to VPS and Verify Access (5 min)

From your local machine (macOS/Linux with Tailscale):

```bash
# Test Tailscale connection
ping 100.120.151.91

# SSH to VPS
ssh vps-dragon@100.120.151.91

# Inside VPS, verify Docker is running
docker ps | head -5

# Navigate to project root
cd /opt/opsly
git status
```

Expected output:
```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

### Step 2: Deploy N8N Container for Peskids (15 min)

**From inside VPS SSH session:**

```bash
cd /opt/opsly

# Run the setup script (creates docker-compose override + starts container)
./scripts/setup-n8n-tenant.sh --vps-host 100.120.151.91 --tenant peskids

# Expected output:
# ✅ SSH connection verified
# ✅ Container tenant_peskids is running
# ✅ N8N Setup Complete
# 📍 Next Steps:
#    1. Access n8n UI: https://peskids.op-sly.com/n8n/
#    2. Create first workflow: 'lead-capture'
```

Verify container is running:

```bash
docker ps | grep tenant_peskids
# Should show: tenant_peskids image n8nio/n8n:latest running
```

---

### Step 3: Create N8N Workflows (Manually via UI) (90 min)

**Timeline:** Suggested order for learning + validation

#### Workflow 1: Lead Capture (`lead-capture`) — 45 min

**Purpose:** Form submissions → Supabase leads table  
**Trigger:** Webhook (landing page form POST)  
**Actions:** Validate → Insert → Respond

1. Open browser: **https://peskids.op-sly.com/n8n/**
2. Create new workflow: `New` → Workflow name: `lead-capture`
3. Add **Webhook trigger** node:
   - Method: `POST`
   - Path: `/lead-capture`
   - ✅ Save (n8n generates: `https://peskids.op-sly.com/webhooks/lead-capture`)
4. Add **Supabase** node (Insert):
   - Database: `jkwykpldnitavhmtuzmo` (from Doppler: `NEXT_PUBLIC_SUPABASE_URL`)
   - Table: `leads`
   - Fields to map:
     ```
     full_name ← {{ $json.payload.full_name }}
     email ← {{ $json.payload.email }}
     phone ← {{ $json.payload.phone }}
     source ← "web" (fixed)
     status ← "new" (fixed)
     tenant_slug ← "peskids" (fixed)
     notes ← {{ $json.payload.notes }} (optional)
     ```
5. Add **Respond to Webhook** node:
   - Status: `200`
   - Body:
     ```json
     {
       "ok": true,
       "message": "Gracias por tu interés. Nos contactaremos pronto.",
       "lead_id": "{{ $json.id }}"
     }
    ```
6. **Publish workflow**
7. **Test locally:**
   ```bash
   curl -X POST https://peskids.op-sly.com/webhooks/lead-capture \
     -H 'Content-Type: application/json' \
     -d '{
       "full_name": "Test Parent",
       "email": "test@example.com",
       "phone": "573001234567",
       "notes": "Interested in swimming classes"
     }'
   ```
   Should respond: `{"ok": true, "message": "...", "lead_id": "..."}`

#### Workflow 2: Hot Lead Alert (`hot-lead-alert`) — 45 min

**Purpose:** Notify owner when new web lead arrives  
**Trigger:** Polling (`leads` table every 5 min)  
**Actions:** Filter → Format → Send Discord + Email

1. Create new workflow: `hot-lead-alert`
2. Add **Supabase** trigger (Read):
   - Table: `leads`
   - Watch field: `created_at`
   - Polling interval: `5 minutes`
3. Add **IF** node:
   ```
   FILTER: {{ $json.source == "web" && $json.status == "new" }}
   ```
4. Add **Supabase** node to update status:
   - Action: `Update`
   - Set: `status = "contacted"`
5. Add **HTTP** node (Discord webhook):
   - Method: `POST`
   - URL: (get from Doppler: `DISCORD_WEBHOOK_URL`)
   - Body (JSON):
     ```json
     {
       "embeds": [{
         "title": "🔥 Hot Lead: {{ $json.full_name }}",
         "color": 16711680,
         "fields": [
           { "name": "Email", "value": "{{ $json.email }}", "inline": true },
           { "name": "Phone", "value": "{{ $json.phone }}", "inline": true },
           { "name": "Source", "value": "{{ $json.source }}", "inline": false },
           { "name": "Notes", "value": "{{ $json.notes || 'N/A' }}", "inline": false }
         ]
       }]
     }
     ```
6. (Optional) Add **Email** node:
   - To: `sierrasantiago90@gmail.com`
   - Subject: `🔥 Nuevo lead: {{ $json.full_name }}`
   - Body: Template with all lead details
7. **Publish workflow**

---

### Step 4: Update Landing Page Form Webhook (10 min)

In your local repo, update the landing page form to POST to n8n:

**File:** `apps/peskids/components/marketing/lead-capture-form.tsx` (or equivalent)

```typescript
const submitForm = async (data) => {
  const response = await fetch(
    'https://peskids.op-sly.com/webhooks/lead-capture',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        notes: data.message,
      }),
    }
  );
  const result = await response.json();
  if (result.ok) {
    showSuccess(`Lead registrado: ${result.lead_id}`);
  }
};
```

Test end-to-end:
1. Open https://peskids.op-sly.com/
2. Submit lead capture form
3. Check Discord channel (should see hot lead alert)
4. Check Supabase: `leads` table should have new row

**Commit:** 
```bash
git add apps/peskids/components/marketing/lead-capture-form.tsx
git commit -m "feat(peskids): wire lead form to n8n webhook"
git push origin claude/peskids-scope-review-3xAZz
```

---

### Step 5: Database RLS Policies (90 min)

**Access:** Supabase Dashboard → `jkwykpldnitavhmtuzmo` → SQL Editor

Create policies for **admin** (owner), **staff**, **teachers**, **parents**:

#### Policy 1: Admin Can Read All Data

```sql
-- Create admin role function (if not exists)
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.email() = 'sierrasantiago90@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_all_leads" ON leads
  FOR SELECT
  USING (is_owner());

CREATE POLICY "admin_insert_leads" ON leads
  FOR INSERT
  WITH CHECK (is_owner() OR (SELECT COUNT(*) FROM leads WHERE tenant_slug = 'peskids') = 0);
```

#### Policy 2: Staff Read Leads They Created

```sql
CREATE POLICY "staff_read_own_leads" ON leads
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR created_by = auth.uid()
    )
  );
```

#### Policy 3: Teachers Read Their Classes Only

```sql
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_read_own_classes" ON classes
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR teacher_id = auth.uid()
    )
  );
```

#### Policy 4: Parents See Their Children Only

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_read_own_children" ON students
  FOR SELECT
  USING (
    tenant_slug = 'peskids'
    AND (
      is_owner()
      OR parent_id = auth.uid()
    )
  );
```

**Test RLS:**
```sql
-- Test as owner: should return all leads
SELECT COUNT(*) FROM leads WHERE tenant_slug = 'peskids';

-- Test as specific parent (simulate):
-- Set session role: SET ROLE parent_role;
-- SELECT * FROM students WHERE parent_id = '{parent_uid}';
-- Should only return their children
```

**Commit:**
```bash
git add docs/tenants/peskids/PHASE-2-WEEK-1-RLS-POLICIES.sql
git commit -m "feat(db): add RLS policies for peskids multi-user support"
git push origin claude/peskids-scope-review-3xAZz
```

---

## 🧪 Validation Checklist

- [ ] SSH to VPS: `ssh vps-dragon@100.120.151.91`
- [ ] N8N container running: `docker ps | grep tenant_peskids`
- [ ] N8N UI accessible: https://peskids.op-sly.com/n8n/
- [ ] `lead-capture` workflow created and published
- [ ] `hot-lead-alert` workflow created and published
- [ ] Test webhook: Form submission → Supabase insert ✓
- [ ] Test alert: Discord notification appears ✓
- [ ] RLS policies applied (test with different user roles)
- [ ] Landing page form now POSTs to `https://peskids.op-sly.com/webhooks/lead-capture`

---

## 📚 Next: Week 2 (Teacher Dashboard + WhatsApp)

Once this is done:
1. Week 2 focuses on **Teacher Dashboard** (audit existing components, complete missing parts)
2. Then **WhatsApp integration** via Jelou API

See: `PHASE-2-IMPLEMENTATION-PLAN.md` lines 71-100

---

## 🆘 Troubleshooting

**N8N container won't start:**
```bash
# Check logs
docker logs tenant_peskids

# Restart container
docker restart tenant_peskids

# Check docker-compose file
cat /opt/opsly/docker-compose.peskids.yml
```

**Webhook not responding (404):**
- Verify workflow is **Published** (not Draft)
- Check Traefik config: should route `peskids.op-sly.com/webhooks/*` to n8n port 5678
- Check n8n logs: `docker logs tenant_peskids | tail -50`

**Supabase connection fails:**
- Verify secrets in Doppler: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Test connection manually:
  ```bash
  curl https://jkwykpldnitavhmtuzmo.supabase.co/rest/v1/leads?limit=1 \
    -H "apikey: YOUR_ANON_KEY"
  ```

**RLS policies blocking queries:**
- Check policy definitions: Supabase UI → Auth → Policies
- Test with `auth.uid()` logging: Add `RAISE NOTICE` in policy function
- Remember: All queries **must** filter by `tenant_slug = 'peskids'`

---

**Estimated total time:** 4-6 hours  
**Next review:** After you complete and test

