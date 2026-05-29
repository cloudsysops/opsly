---
status: client-ready
type: quick-start
date: 2026-05-29
---

# Peskids: Quick Start to Production

**Live app:** https://peskids.op-sly.com/ ✅ READY NOW  
**Status:** 99% ready (3 final infrastructure steps)  
**Timeline:** 2-3 hours to full production

---

## 🚀 ONE COMMAND TO DEPLOY INFRASTRUCTURE

Run this on your local machine (must have Tailscale + SSH access):

```bash
cd /path/to/opsly
./scripts/peskids-production-deploy.sh
```

**What it does automatically:**
1. ✅ Verifies SSH connectivity to VPS
2. ✅ Deploys N8N container (~5 min)
3. ✅ Applies RLS security policies (~5 min)
4. ✅ Tests N8N dashboard access

**After script completes:** You'll see a checklist of remaining manual steps

---

## 📋 MANUAL STEPS (60 minutes)

After running the script above:

### Step 1: Create lead-capture workflow (30 min)
1. Go to: https://peskids.op-sly.com/n8n/
2. Click **+ New Workflow**
3. Add trigger: **HTTP Webhook** (POST)
4. Add action: **Supabase - Insert Row** 
   - Table: `peskids.leads`
   - Map fields from webhook payload
5. Save & copy webhook URL
6. Add URL to `.env.local` as `NEXT_PUBLIC_N8N_LEAD_WEBHOOK`

**Reference:** See `N8N-WORKFLOWS-GUIDE.md` for exact steps

### Step 2: Create hot-lead-alert workflow (20 min, optional)
1. New workflow in N8N
2. Add trigger: **Cron Job** (every 5 minutes)
3. Add action: **PostgreSQL - Execute Query**
   ```sql
   SELECT * FROM peskids.leads 
   WHERE status = 'new' 
   AND created_at > now() - interval '5 minutes'
   ```
4. Add action: **Slack - Send Message**
   - Channel: #peskids-leads
   - Message: "New lead: {{name}} from {{neighborhood}}"

### Step 3: Test everything (10 min)
1. Submit a test lead via form at https://peskids.op-sly.com/
2. Check Supabase: should see new row in `peskids.leads`
3. Check Slack: should get alert (if workflow created)

---

## ✅ SUCCESS: WHAT YOU GET

After completing above:

```
Customer visits form
        ↓
Submits lead (name, email, phone, etc)
        ↓
API validates + stores in Supabase
        ↓
N8N webhook triggers automatically
        ↓
Slack notification sent instantly
        ↓
Data visible in dashboard
```

**Result:** Leads captured in real-time, zero manual data entry.

---

## 📂 KEY FILES

| Document | Purpose |
|----------|---------|
| `PRODUCTION-READINESS-CHECKLIST.md` | Full feature matrix |
| `CLIENT-PRODUCTION-SUMMARY.md` | Executive overview |
| `PHASE-2-WEEK-1-HANDOFF-FOR-VPS-EXECUTION.md` | Detailed step-by-step |
| `N8N-WORKFLOWS-GUIDE.md` | N8N node specifications |
| `PHASE-2-WEEK-1-RLS-POLICIES.sql` | Security policies (auto-applied) |

---

## 🔧 TROUBLESHOOTING

**N8N container won't start:**
```bash
# SSH to VPS and check logs
ssh vps-dragon@100.120.151.91
docker logs tenant_peskids
```

**Webhook not receiving data:**
```bash
# Test webhook manually
curl -X POST https://peskids.op-sly.com/n8n/webhook/lead-capture \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'
```

**Form not submitting:**
1. Check browser console (F12)
2. Verify `.env.local` has `NEXT_PUBLIC_N8N_LEAD_WEBHOOK`
3. Check N8N webhook URL is correct

---

## 📞 SUPPORT

All documentation in `/docs/tenants/peskids/`

**For:** → **See:**
- Workflow setup → `N8N-WORKFLOWS-GUIDE.md`
- Security → `PHASE-2-WEEK-1-RLS-POLICIES.sql`
- Full guide → `PHASE-2-WEEK-1-HANDOFF-FOR-VPS-EXECUTION.md`
- Overview → `CLIENT-PRODUCTION-SUMMARY.md`

---

## ⏱️ TIMELINE

| Task | Time | Status |
|------|------|--------|
| **Setup script** | 15 min | `./scripts/peskids-production-deploy.sh` |
| **Create lead workflow** | 30 min | Manual UI in N8N |
| **Create alert workflow** | 20 min | Optional, manual UI |
| **Test end-to-end** | 10 min | Submit test lead |
| **TOTAL** | ~75 min | **FULL PRODUCTION** |

---

**Ready to go live?** Run the script, then follow the 60-minute manual checklist above.  
**Form already live:** https://peskids.op-sly.com/ (you can test right now)

🎉 **You're 2-3 hours away from fully automated lead capture.**
