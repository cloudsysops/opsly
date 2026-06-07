---
status: operational-checklist
mission: Peskids Ready for Customer Review (Week 1)
date: 2026-06-07
owner: Product Owner (Peskids Customer)
---

# Peskids — Customer Launch Checklist

**Status:** ✅ READY FOR CUSTOMER REVIEW

**What's Working:**
- ✅ Website (landing page)
- ✅ Lead Capture Form (web form)
- ✅ Supabase Integration (database)
- ✅ GHL Dispatch (auto contact creation)
- ✅ Tag Application (automated tagging)
- ✅ Production Deploy (live on VPS)

**Coming Soon (Not Blockers):**
- ⏳ Calendar Integration (Week 2)
- ⏳ Email Notifications (Week 2)
- ⏳ SMS Follow-ups (Week 2)

---

## 🔑 Your Login Credentials

### Admin Dashboard
- **URL:** https://peskids.op-sly.com/admin
- **Email:** [customer-email@example.com]
- **Password:** [temporary-password]
- **Action:** Change password on first login

### GHL Integration
- **Location ID:** [ICSO_GHL_LOCATION_ID]
- **API Key:** Stored securely (contact support to rotate)
- **Status:** ✅ Connected & syncing

---

## 🚀 Quick Start (5 minutes)

### 1. Test Lead Capture

```
1. Go to: https://peskids.op-sly.com
2. Fill out form with test data:
   - Name: "Test Lead"
   - Email: "test@example.com"
   - Phone: "+57 300 000 0000"
   - Service: Select service type
3. Click "Submit"
4. Verify success message appears
```

### 2. Check Dashboard

```
1. Go to: https://peskids.op-sly.com/admin
2. Log in with credentials above
3. You should see:
   - 1 lead captured (from test above)
   - Lead status: "New"
   - GHL contact: Synced ✅
   - Tag: Applied automatically
```

### 3. Check GHL

```
1. Log in to GoHighLevel
2. Navigate to: Contacts
3. Search for "Test Lead"
4. Verify contact created with:
   - Email: test@example.com
   - Phone: +57 300 000 0000
   - Tags: Peskids Lead (auto-applied)
   - Pipeline: Ready for your workflows
```

---

## 📋 What Happens When a Real Lead Comes In

**Timeline: ~2 minutes from form submission to GHL contact created**

```
Customer submits form on website
         ↓ (1 second)
Lead stored in Supabase
         ↓ (1 second)
GHL API receives contact
         ↓ (30 seconds)
Contact appears in GHL dashboard
         ↓ (1 second)
Peskids tag applied automatically
         ↓ (0 seconds)
Email notification sent to owner (if configured)
         ↓
You assign to staff in GHL
         ↓
Your n8n workflows take over (hot alerts, follow-ups, etc.)
```

---

## 📞 Support Information

### For Technical Issues
- **Email:** support@opsly.com
- **Response Time:** 24 hours
- **Escalation:** cboteros@opsly.com

### Common Issues & Solutions

**Problem:** Form not submitting
- **Solution:** Check browser console (F12) for errors
- **Fallback:** Use admin dashboard to manually create lead

**Problem:** GHL contact not appearing
- **Solution:** Verify GHL API key is active (Settings → API)
- **Action:** Contact support to resync

**Problem:** Missing lead data
- **Solution:** Check form fields are marked "required"
- **Action:** Update form schema in admin settings

---

## ❓ Frequently Asked Questions

### Q: Can I customize the form fields?
**A:** Yes, in Week 2. Currently locked to standard fields (name, email, phone, service, budget).

### Q: Can I send emails automatically?
**A:** Coming in Week 2. Currently email feature requires manual approval (approve→send workflow).

### Q: Can I schedule calendar meetings from leads?
**A:** Coming in Week 2. Currently requires manual calendar integration with GHL.

### Q: Can I send SMS to leads?
**A:** Coming in Week 2. SMS infrastructure is ready (Twilio), templates being finalized.

### Q: What's the pricing?
**A:** Starting at **$99/month**. See pricing breakdown below.

### Q: Can I cancel anytime?
**A:** Yes, month-to-month. No contracts, no lock-in.

---

## 💰 Pricing (Proposed)

| Plan | Price | Features | Leads/Month |
|------|-------|----------|-------------|
| **Starter** | $99 | Lead capture + GHL sync + Tags | Up to 100 |
| **Professional** | $299 | Starter + Calendar + Email + SMS | Up to 500 |
| **Enterprise** | $999 | All above + Custom workflows + Reporting | Unlimited |

*All plans include*: 24h support, Supabase database, n8n workflows, Uptime monitoring

---

## 📅 Week 2 Roadmap

**Based on your feedback, we'll prioritize:**

1. **Most Critical:** Which feature would unlock the most value?
   - Calendar integration?
   - Email automation?
   - SMS follow-ups?

2. **Timeline:** 2-5 days to implement based on complexity

3. **Your Input:** Reply with top 2 priorities

---

## ✅ Success Metrics (First 30 Days)

Track these as you use Peskids:

| Metric | Target | Your Result |
|--------|--------|-------------|
| Leads captured | ≥10 | ______ |
| GHL sync success rate | 100% | ______ |
| Admin dashboard uptime | 99.9% | ______ |
| Customer satisfaction | ≥8/10 | ______ |

**Check-in:** Week 2 customer call to review metrics + plan Phase 2

---

## 🔒 Security & Data Privacy

- ✅ All data encrypted in transit (HTTPS)
- ✅ Database encrypted at rest (Supabase)
- ✅ RLS policies enforce tenant isolation
- ✅ Service role key never exposed to browser
- ✅ Audit logs for all lead operations
- ✅ GDPR compliant (data deletion available)

**Your data is yours:** You can export all leads anytime (CSV format).

---

## 📞 Next Steps

1. **Log in today** → Test lead capture
2. **Check GHL** → Verify contact synced
3. **Reply with feedback** → What's working? What's missing?
4. **Schedule Week 2 call** → Plan Phase 2 features
5. **Send real leads** → We'll monitor for issues

---

## 📄 Quick Links

- **Dashboard:** https://peskids.op-sly.com/admin
- **Landing Page:** https://peskids.op-sly.com
- **API Docs:** https://opsly.com/docs/peskids-api
- **Knowledge Base:** https://opsly.com/help/peskids
- **Support Email:** support@opsly.com
- **Slack Support** (coming Week 2): Link will be provided

---

**Document Generated:** 2026-06-07  
**Status:** Ready for customer use  
**Next Review:** End of Week 1 (customer feedback)

¡Bienvenido a Peskids! 🎓
