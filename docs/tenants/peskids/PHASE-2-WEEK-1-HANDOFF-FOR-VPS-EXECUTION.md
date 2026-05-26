---
status: handoff
owner: cboteros1@gmail.com
date: 2026-05-26
phase: Phase 2 Week 1
type: vps-execution-guide
---

# Phase 2 Week 1: Handoff for VPS Execution

**STATUS:** All code is complete and ready. This document is for an agent with SSH access to execute the VPS deployment portion.

**REQUIREMENTS:** SSH access to `vps-dragon@100.120.151.91` (Tailscale)

---

## What's Already Done (Code-Complete)

✅ Lead capture form fully implemented  
✅ Lead API endpoint with referral tracking  
✅ N8N webhook configuration  
✅ RLS policies complete (475 lines)  
✅ Environment variables configured  
✅ All documentation in place  
✅ Peskids app: lint-clean, TypeScript strict  

**Reference:** PR #425 on branch `claude/peskids-scope-review-3xAZz`

---

## What This Agent Must Execute (3 Tasks)

### TASK 1: Deploy N8N Container to VPS (5-10 minutes)

**Command:**
```bash
# From your local machine with Tailscale SSH
cd /path/to/opsly
./scripts/setup-n8n-tenant.sh --vps-host 100.120.151.91 --tenant peskids
```

**Expected output:**
```
✅ N8N Setup Complete
✅ Container tenant_peskids is running
✅ Accessible at: https://peskids.op-sly.com/n8n/
```

**Verification:**
```bash
ssh vps-dragon@100.120.151.91
docker ps | grep tenant_peskids
docker logs tenant_peskids  # Check for errors
```

---

### TASK 2: Create N8N Workflows (1 hour, Manual UI)

**Access:** https://peskids.op-sly.com/n8n/

**Create Workflow 1: lead-capture**
- Trigger: Webhook (POST)
- Webhook URL: Get from N8N UI after creation
- Input: Lead form data from `/api/leads`
- Action: Insert into Supabase `peskids.leads` table
- Store webhook URL in `.env` as `NEXT_PUBLIC_N8N_LEAD_WEBHOOK`

**Create Workflow 2: hot-lead-alert** (Optional but recommended)
- Trigger: Database polling (every 5 min)
- Query: Select leads with `status = 'new'` from last 5 minutes
- Action: Send Slack alert to owner
- Slack channel: #peskids-leads or similar

**Reference:** See `docs/tenants/peskids/N8N-WORKFLOWS-GUIDE.md` for detailed node specifications.

---

### TASK 3: Apply RLS Policies to Supabase (5 minutes)

**Steps:**
1. Open Supabase SQL Editor: https://app.supabase.com/project/jkwykpldnitavhmtuzmo/sql
2. Create new query
3. Copy entire contents of: `docs/tenants/peskids/PHASE-2-WEEK-1-RLS-POLICIES.sql`
4. Paste into SQL Editor
5. Click **Run**
6. Verify: Go to Auth → Policies tab, should see 7 tables with policies

**Expected tables with RLS:**
- leads
- parents
- students
- classes
- feedback
- followups
- messages

---

## Verification Checklist (After All Tasks)

Run these to confirm everything works:

### 1. Test N8N Webhook
```bash
curl -X POST https://peskids.op-sly.com/n8n/webhook/lead-capture \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead",
    "email": "test@example.com",
    "phone": "1234567890",
    "grade_interested": "7",
    "consent_treatment": true
  }'
```

**Expected:** 200 OK, N8N workflow executes

### 2. Test Lead Form
- Open https://peskids.op-sly.com/
- Submit test lead via form
- Check Supabase `leads` table: should see new row
- Check N8N logs: `docker logs tenant_peskids` should show webhook execution

### 3. Test RLS Policies
```sql
-- Run in Supabase SQL Editor
-- Should return 0 rows (parent cannot see all leads)
SELECT * FROM peskids.leads WHERE tenant_slug = 'peskids';
```

---

## Rollback / Troubleshooting

### If N8N container fails to start
```bash
ssh vps-dragon@100.120.151.91
docker logs tenant_peskids  # See error details
./scripts/setup-n8n-tenant.sh --vps-host 100.120.151.91 --tenant peskids --force  # Retry
```

### If webhook is unreachable
```bash
# Check Traefik routing
ssh vps-dragon@100.120.151.91
curl http://localhost:8000/n8n/  # Should work internally
curl https://peskids.op-sly.com/n8n/  # Should work externally
```

### If RLS policies fail to apply
- Check Supabase database logs
- Verify `is_owner()` helper function created
- Run individual policy statements in order (see SQL file for dependencies)

---

## Environment Variables to Update

After N8N container is running, update `.env.local` (or Doppler):

```bash
# Get from N8N UI after creating lead-capture workflow
NEXT_PUBLIC_N8N_LEAD_WEBHOOK=https://peskids.op-sly.com/n8n/webhook/lead-capture

# Already set in Doppler
N8N_WEBHOOK_BASE_URL=http://tenant_peskids:5678  # Internal Docker URL
```

---

## Timeline

**Expected total time:** 2-3 hours

- Task 1 (N8N deploy): 10 min
- Task 2 (Workflows): 60 min
- Task 3 (RLS): 5 min
- Verification: 15 min
- Buffer: 30 min

---

## Success Criteria (Phase 2 Week 1 Complete)

- [x] Code is deployed to `branch/claude-peskids-scope-review-3xAZz`
- [ ] N8N container running on VPS
- [ ] lead-capture workflow active
- [ ] hot-lead-alert workflow active (optional)
- [ ] RLS policies applied to all 7 tables
- [ ] Test lead submitted via form
- [ ] Lead appears in Supabase
- [ ] N8N webhook received data
- [ ] No errors in logs

---

## Important Notes

1. **Tenant isolation:** All queries filter by `tenant_slug = 'peskids'` — do NOT remove
2. **Secrets:** Never commit N8N webhook URL — keep in Doppler
3. **RLS owner function:** Uses `sierrasantiago90@gmail.com` as admin — parameterize in Phase 1 extraction
4. **Service role:** N8N uses Supabase service role (full access) — restrict in Phase 1+

---

## References

- PR #425: Phase 2 Week 1 ESLint fixes & RLS policies
- `PHASE-2-WEEK-1-READINESS-REPORT.md` — Full status report
- `N8N-WORKFLOWS-GUIDE.md` — Detailed workflow specifications
- `PHASE-2-WEEK1-EXECUTION-GUIDE.md` — Step-by-step walkthrough

---

**Handoff date:** 2026-05-26  
**Code branch:** `claude/peskids-scope-review-3xAZz`  
**PR:** #425 (draft)  
**Status:** Ready for VPS execution

Agent: Execute these 3 tasks in order. Verify each step. Document any issues in AGENTS.md.
