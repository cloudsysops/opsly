---
status: operational-runbook
mission: Client Launch Support (Week 1-4)
date: 2026-06-07
owner: Support Lead / Operations
---

# Client Launch Runbook

**Objective:** Rapid response support during Week 1-4 customer validation phase

**Target SLA:** 24h response, 4h critical issues

---

## Quick Reference

| Issue | Severity | Fix | Time |
|-------|----------|-----|------|
| Form won't submit | 🔴 Critical | Check GHL API key | 15min |
| No GHL contact created | 🔴 Critical | Verify pipeline ID | 20min |
| Dashboard won't load | 🟠 High | Clear browser cache | 5min |
| Missing lead data | 🟠 High | Check form field names | 10min |
| Slow lead sync | 🟡 Medium | Check Redis queue | 30min |
| Email notification missing | 🟡 Medium | Check SMTP config | 20min |
| Calendar not working | 🟡 Medium | Calendar not in Week 1 scope | — |

---

## CRITICAL PATH TROUBLESHOOTING

### Scenario 1: Lead Form Won't Submit

**Symptoms:**
- User clicks submit → nothing happens
- Browser console shows error

**Diagnosis:**
```bash
# Check CloudFlare/SSL
curl -I https://<tenant>.op-sly.com
# Expected: HTTP 200

# Check API endpoint
curl -X POST https://api.op-sly.com/api/<tenant>/leads \
  -H "Content-Type: application/json" \
  -d '{"full_name":"test","email":"test@example.com","phone":"1234567890"}'
# Expected: HTTP 200 + lead ID
```

**Solutions (in order):**
1. Clear browser cache (Cmd+Shift+R)
2. Check form field names match API schema
3. Verify CORS headers in Traefik
4. Restart API container: `docker restart opsly-api`
5. Escalate: Check `/opt/opsly/.env` GHL credentials

---

### Scenario 2: GHL Contact Not Created

**Symptoms:**
- Lead appears in Peskids dashboard
- No contact in GHL
- Dashboard shows "Pending sync"

**Diagnosis:**
```bash
# Check GHL API key
curl -X GET "https://api.gohighlevel.com/v1/contacts" \
  -H "Authorization: Bearer $GOHIGHLEVEL_API_KEY" \
  -H "locationId: $GOHIGHLEVEL_LOCATION_ID"
# Expected: HTTP 200 + contacts list

# Check Redis queue for failed jobs
redis-cli -a $REDIS_PASSWORD LRANGE openclaw:queue 0 -1
# Look for failed job with GHL error
```

**Solutions (in order):**
1. Verify GHL API key is still active (GHL UI → Settings → API)
2. Check pipeline ID is correct: `echo $GOHIGHLEVEL_PIPELINE_ID`
3. Check location ID matches GHL account
4. Check Supabase database has webhook trigger enabled
5. Escalate: Debug n8n workflow or GHL API quota

---

### Scenario 3: Dashboard Won't Load

**Symptoms:**
- Admin page shows blank
- Network tab shows failed requests
- 500 error in console

**Diagnosis:**
```bash
# Check API health
curl -s https://api.op-sly.com/api/health | jq .

# Check Supabase connection
psql "postgresql://..." -c "SELECT COUNT(*) FROM leads WHERE tenant_slug='<tenant>';"

# Check admin auth token
# Look for: Authorization: Bearer <token> in request headers
```

**Solutions (in order):**
1. Hard refresh: Cmd+Shift+R + clear site data
2. Check admin user is created in Supabase (select * from auth.users)
3. Verify JWT token hasn't expired (< 1 hour old)
4. Restart admin container: `docker restart opsly-admin`
5. Escalate: Check Supabase RLS policy for admin table

---

### Scenario 4: Missing Lead Data

**Symptoms:**
- Form submits successfully
- Lead appears in dashboard
- Missing one or more fields (phone, service, etc.)

**Diagnosis:**
```sql
-- Check lead record
SELECT * FROM leads 
WHERE tenant_slug = '<tenant>' 
  AND email = 'test@example.com';

-- Check form schema
SELECT * FROM form_fields 
WHERE form_id = '<form_id>' 
ORDER BY order_index;
```

**Solutions (in order):**
1. Check landing page form has all required fields
2. Verify form fields match database schema
3. Check field names in API request match database columns
4. Escalate: Regenerate form from template

---

### Scenario 5: Slow Lead Sync (>5 seconds)

**Symptoms:**
- Form takes >5s to confirm
- Redis queue is backed up
- Multiple leads getting "pending" status

**Diagnosis:**
```bash
# Check Redis queue depth
redis-cli -a $REDIS_PASSWORD LLEN openclaw:queue

# Check orchest health
curl -s http://localhost:3011/health | jq .

# Check GHL rate limits
# (GHL API: 600 requests/min = 10 requests/sec)
```

**Solutions (in order):**
1. Check Redis memory: `redis-cli -a $REDIS_PASSWORD INFO memory`
2. Flush old jobs: `redis-cli -a $REDIS_PASSWORD FLUSHDB` (careful!)
3. Scale orchestrator: Increase worker count
4. Escalate: Check GHL API quota usage

---

## MONITORING & HEALTH CHECKS

### Daily Checklist (5 minutes)

```bash
#!/bin/bash
set -e

# All systems
echo "🔍 Daily health check..."

# 1. API health
curl -s https://api.op-sly.com/api/health | jq .

# 2. Admin health
curl -s https://admin.op-sly.com/api/health | jq .

# 3. Portal health
curl -s https://portal.op-sly.com/api/health | jq .

# 4. Orchestrator health
curl -s http://localhost:3011/health | jq .

# 5. Redis ping
redis-cli -a $REDIS_PASSWORD ping

# 6. Supabase connection
psql "$DATABASE_URL" -c "SELECT NOW();" > /dev/null

# 7. VPS disk usage
df -h / | tail -1

# 8. VPS memory
free -h | grep Mem

echo "✅ All systems operational"
```

### Weekly Review (30 minutes)

```
[ ] Customer feedback: Any complaints?
[ ] Error logs: Any new failure patterns?
[ ] Performance: Any regressions?
[ ] Security: Any suspicious activity?
[ ] Cost: Any unexpected usage?
[ ] Backups: All recent?
```

---

## CUSTOMER COMMUNICATION TEMPLATES

### Issue Acknowledged (within 30 minutes)

```
Hi [Customer],

Thanks for reporting this issue. We're investigating [issue description].

Expected resolution time: [2-4 hours / 24 hours]

In the meantime: [workaround if available, or "please standby"]

We'll update you within [timeframe].

Best regards,
[Support Lead]
```

### Issue Resolved

```
Hi [Customer],

We've resolved the issue: [brief explanation of what was wrong and what we fixed].

[How to verify it's fixed]

Please let us know if you encounter any further issues.

Thanks,
[Support Lead]
```

### Feature Request (for Week 2+ features)

```
Hi [Customer],

Great idea! Calendar integration is on our roadmap for Week 2.

We'll prioritize it based on customer demand. If this is critical for your workflow,
please let us know and we can potentially accelerate it.

Timeline: [estimated when available]

Best regards,
[Product Lead]
```

---

## ESCALATION PATH

| Level | Who | Response Time | When |
|-------|-----|----------------|------|
| **L1** | Support Assistant | 1h | Initial response |
| **L2** | Engineer (Primary) | 4h | Technical issue |
| **L3** | CTO (cboteros) | 24h | Critical issue |
| **L4** | External vendor | 48h | 3rd-party API issue |

**Escalation triggers:**
- Customer can't submit leads (blocking revenue)
- Data loss or corruption
- Security concern
- Multiple customers affected

---

## WEEK 1 CUSTOMER FEEDBACK COLLECTION

### Feedback Form (Email to Customer)

```
Subject: Peskids Week 1 Feedback Request

Hi [Customer Name],

Thank you for using Peskids this week! We'd love to hear how it's going.

Quick feedback questions:
1. Is lead capture working smoothly? (1-10)
2. Is GHL sync reliable? (1-10)
3. What feature would help most in Week 2? (calendar/email/sms/other)
4. Any bugs or issues? (describe)
5. Price feedback? (too high/fair/too low)

Reply to this email or fill out: [feedback form link]

Thanks for helping us improve!
```

### Feedback Analysis (Friday EOD)

```
[ ] Tally feedback responses
[ ] Identify top 3 missing features
[ ] Identify any blockers
[ ] Note customer sentiment (happy/neutral/frustrated)
[ ] Update Week 2 priorities based on feedback
[ ] Share findings in team standup
```

---

## WEEK 1 LAUNCH MILESTONES

| Day | Milestone | Owner | Status |
|-----|-----------|-------|--------|
| **Mon** | Peskids passes smoke test | Engineer | TBD |
| **Tue** | Customer review starts | Product | TBD |
| **Wed** | ICSO sales engine live | Engineer | TBD |
| **Thu** | Revenue flow validated | Product | TBD |
| **Fri** | Customer feedback collected | Support | TBD |
| **Fri EOD** | Week 2 priorities finalized | Product | TBD |

---

## INCIDENT LOG

Use this section to track any issues during Week 1-2:

```
# Incident #1
Date: [YYYY-MM-DD]
Customer: [name]
Issue: [description]
Root Cause: [what happened]
Resolution: [what we did]
Prevention: [how we stop it next time]
Time to Resolve: [minutes]
Customer Impact: [was revenue blocked?]
```

---

## POST-WEEK-1 RETROSPECTIVE

**Friday EOD:**
1. Document all issues from Week 1
2. Identify patterns (common failures)
3. Update runbook with new troubleshooting steps
4. Plan improvements for Week 2

**Example:**
- *Issue:* GHL sync delayed >5 seconds for 20% of leads
- *Root cause:* Redis queue bottleneck during peak hours
- *Fix:* Increase orchestrator worker pool from 2 → 4
- *Prevention:* Monitor queue depth, auto-scale workers

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-07  
**Next Review:** 2026-06-14
