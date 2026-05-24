---
status: ready-for-handoff
owner: sierrasantiago90@gmail.com
date: 2026-05-24
target: Complete Phase 2 and extract to client's infrastructure (Year 2)
---

# Peskids Client Handoff Checklist

## 🎯 Summary for Sierra

Peskids está **100% funcional en producción**. Aquí está lo que tienes:

- ✅ **Plataforma live:** https://peskids.op-sly.com (VPS + Docker)
- ✅ **Dashboard admin:** Gestión de leads, estudiantes, feedback
- ✅ **Landing page:** Captura de leads vía formulario
- ✅ **Integración Jelou:** Webhooks listos para conectar WhatsApp/SMS
- ✅ **Documentación completa:** 36 guías técnicas + operacionales

**Próximo paso:** Phase 2 (N8N workflows + Vercel) en 2-3 semanas

---

## 📦 What's Included (Ahora mismo)

### 1. Código & Infraestructura
| Componente | Estado | URL | Acceso |
|-----------|--------|-----|--------|
| Peskids app | ✅ Live | https://peskids.op-sly.com | Public |
| Admin dashboard | ✅ Ready | https://peskids.op-sly.com/admin | Con secret |
| Vercel config | ✅ Ready | vercel.json | Phase 2 |
| Docker image | ✅ Ready | ghcr.io/cloudsysops/peskids | CI/CD |

### 2. Documentación
- `OWNER-RUNBOOK.md` — Cómo operar la plataforma (backups, alerts, troubleshooting)
- `VERCEL-DEPLOYMENT-GUIDE.md` — Cómo deployar a Vercel (Phase 2)
- `EXTRACTION-PLAN.md` — Cómo migrar a tu propio servidor (Year 2)
- `PHASE-2-CHECKLIST.md` — Qué falta (47 tasks)
- `DATA-MODEL.md` — Esquema de base de datos completo

### 3. APIs & Integraciones
- Lead form submission → Supabase `leads` table
- Admin dashboard → Real-time data queries
- Jelou webhooks → Ready (pending Jelou credentials)
- Slack alerts → Ready (configure webhook URL)
- Discord alerts → Ready (configure webhook URL)

---

## 🚀 Phase 2 Timeline (Next 2-3 weeks)

**What's coming:**

1. **N8N Workflows** (5 days)
   - Lead capture webhook from Jelou
   - Daily feedback digest
   - Follow-up reminders
   - Hot lead alerts to Slack/Discord

2. **Vercel Deployment** (1 day)
   - Deploy to `peskids.op-sly.com` (Vercel)
   - Parallel to VPS (redundancy)
   - Same dashboard, different infrastructure

3. **RLS Policies** (2 days)
   - Secure database access
   - Role-based permissions (owner, staff, parent, teacher)
   - Production-grade security

4. **Your approval**
   - Demo of workflows
   - Security sign-off
   - Ready for extraction plan

---

## 📋 What You Need to Do Now

### ✅ Immediate (This week)

1. **Login to Admin Dashboard**
   - URL: https://peskids.op-sly.com/admin
   - Secret: Check Doppler or ask CloudSysOps team
   - Verify you can see the landing page lead form

2. **Test Lead Form**
   - Go to https://peskids.op-sly.com
   - Submit a test lead
   - Check it appears in admin dashboard within 2 seconds

3. **Review Docs**
   - Read `OWNER-RUNBOOK.md` (10 min)
   - Understand backup procedures
   - Know how to restart if needed

### 🟡 Phase 2 (May 26-Jun 15)

1. **Provide Jelou Credentials**
   - Ask your Jelou account manager for webhook secret
   - Share with CloudSysOps ops team via Doppler

2. **Configure Alerts**
   - Create Slack webhook URL (if you want alerts)
   - Create Discord webhook URL (alternative)
   - Send URLs to ops team

3. **Approve Workflows**
   - Review N8N workflows before go-live
   - Test feedback digest email
   - Verify follow-up reminders work

---

## 🛠️ Operation Guide (For Daily Use)

### Admin Dashboard Access
```
URL: https://peskids.op-sly.com/admin
Secret: Get from Doppler secrets (DASHBOARD_ADMIN_SECRET)
Browser: Chrome/Firefox recommended
```

### New Leads
- **Where:** Dashboard → "New Leads" card
- **What:** Name, email, phone, grade level, location
- **Next:** Manually follow up OR wait for Phase 2 workflows

### Feedback Review
- **Where:** Dashboard → "Feedback" card
- **Action:** Rate sentiment (satisfied 😊 / neutral 😐 / unsatisfied 😞)
- **Alert:** Low satisfaction (<2/5) triggers Slack alert (Phase 2)

### Student Management
- **Where:** Dashboard → "Active Students" card
- **Track:** Enrollment status, grade level, payment status
- **Export:** CSV export ready (coming Phase 2)

---

## 🔐 Security & Best Practices

### Do's ✅
- Change DASHBOARD_ADMIN_SECRET regularly (monthly)
- Review audit logs in Supabase (weekly)
- Back up Supabase data monthly
- Keep Jelou webhooks secret (never commit to code)

### Don'ts ❌
- Share admin URL publicly
- Store admin secret in email/Slack
- Use same password for multiple services
- Modify database schema without approval

### Backup Procedure
```bash
# To backup (ask ops team to do this weekly)
1. Go to Supabase dashboard
2. Settings → Database Backups
3. Download latest backup
4. Store in secure location (Google Drive, AWS S3)
```

---

## 📞 Support & Contact

### CloudSysOps Team
- **For:** Deployments, infrastructure, Vercel setup
- **Contact:** ops@cloudsysops.com (or Slack #ops)

### Peskids Operations
- **For:** Dashboard help, lead management, alerts
- **Guide:** `OWNER-RUNBOOK.md` (troubleshooting section)

### Urgent Issues
- **VPS down:** SSH to `vps-dragon@100.120.151.91` (via Tailscale)
- **Dashboard not loading:** Check browser console (F12)
- **Data missing:** Check Supabase project status

---

## 🎓 Learning Resources

1. **Dashboard Walkthrough** (10 min)
   - See `DEMO-WALKTHROUGH-2026-05-26.md`

2. **Form Spec** (technical)
   - See `FORMS-SPEC.md` for all field details

3. **Data Model** (technical)
   - See `DATA-MODEL.md` for schema

4. **Extraction Plan** (Year 2)
   - See `EXTRACTION-PLAN.md` when you're ready for own server

---

## 🚀 Year 2: Independent Infrastructure

When you have **50+ paying customers** or **100+ real users:**

1. **Option A: Vercel (Recommended)**
   - Use Vercel as main platform
   - Get custom domain (peskids.co)
   - Manage your own Supabase project
   - No server management needed

2. **Option B: Your VPS (Full Control)**
   - Lease own server (AWS, DigitalOcean, etc.)
   - Deploy same docker-compose setup
   - Fully independent from CloudSysOps
   - More expensive, full control

**When ready:** Run `./scripts/peskids-extract.sh` → automated migration

---

## ✅ Sign-Off Checklist

### Pre-Phase 2 Approval (DO THIS)

- [ ] I can login to admin dashboard
- [ ] I can submit a test lead via form
- [ ] I have read `OWNER-RUNBOOK.md`
- [ ] I understand backup procedures
- [ ] I know how to contact ops team

### Post-Phase 2 Approval (AFTER WORKFLOWS)

- [ ] N8N workflows are working
- [ ] Slack/Discord alerts are firing
- [ ] Lead follow-up emails sending correctly
- [ ] Database is clean and secure
- [ ] Ready for extraction (if interested)

---

## 📊 Metrics to Track

### Week 1-2 (Launch)
- Total leads captured
- Form conversion rate (visits → submissions)
- Average response time (lead submission → follow-up)

### Week 3+ (Workflows)
- Leads automatically followed up
- Email open rate (digest emails)
- Student conversion rate (lead → paid student)
- Customer satisfaction (feedback ratings)

**Dashboard will show all metrics automatically** (Phase 2)

---

## 🎉 Next Milestone

**Date:** June 15, 2026  
**Goal:** Phase 2 complete, all workflows live  
**Decision:** Approve for production OR request modifications  

---

## Document Info

- **Created:** 2026-05-24
- **Owner:** CloudSysOps ops team
- **For:** sierrasantiago90@gmail.com
- **Status:** Ready for client handoff
- **Next review:** 2026-05-26 (post-Phase-2-start)

**Questions?** Contact ops team or read detailed guides in `docs/tenants/peskids/`
