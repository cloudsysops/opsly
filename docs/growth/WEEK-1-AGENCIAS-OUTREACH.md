# Growth Week 1: Agencias-Digitales Tier-1 Outreach Automation

## Overview

Automated outreach campaign targeting 15 tier-1 Latin American digital agencies. Generates personalized emails via Resend API, tracks delivery status, and logs results for future follow-up.

## Architecture

```
data/growth/tier1-targets.json
         ↓
scripts/growth-outreach.sh (orchestration)
         ↓
apps/api/growth/outreach-template/ (email personalization)
         ↓
Resend API (delivery)
         ↓
logs/growth/week-1-outreach.log (tracking)
         ↓
runtime/context/system_state.json (metrics)
```

## Files

| Path | Purpose |
|------|---------|
| `data/growth/tier1-targets.json` | 15 contact entries (name, email, company, specialization, etc.) |
| `scripts/growth-outreach.sh` | Main orchestration script (Resend integration, logging, idempotent) |
| `scripts/test-growth-outreach.mjs` | Test/preview script (dry-run simulation) |
| `apps/api/app/api/growth/outreach-template/route.ts` | Email template generation (GET/POST endpoints) |
| `runtime/logs/growth/week-1-outreach.log` | Campaign log (timestamps, recipients, status) |
| `runtime/context/system_state.json` | Metrics tracking (outreach_count, status, ARPU) |

## Tier-1 Targets (15 Agencias)

All LATAM-based digital agencies with revenue ranges $300k–$5M and 8–70 employees.

| # | Name | Email | Company | Specialization | Revenue |
|---|------|-------|---------|-----------------|---------|
| 1 | María García | maria@agenciax.com | Agencia X | ecommerce | $500k–$1M |
| 2 | Carlos López | carlos@digitalpro.com | Digital Pro | marketing-automation | $1M–$2M |
| 3 | Ana Martínez | ana@creativestudio.com | Creative Studio | web-design | $400k–$900k |
| 4 | Roberto Silva | roberto@datadriven.com | DataDriven Solutions | data-analytics | $1.5M–$3M |
| 5 | Sofía Rodríguez | sofia@cloudnative.com | CloudNative Experts | cloud-infrastructure | $600k–$1.5M |
| 6 | Diego Fernández | diego@automationhub.com | Automation Hub | workflow-automation | $300k–$700k |
| 7 | Marcela Gómez | marcela@agenciatecnology.com | Agencia Technology | custom-development | $2M–$4M |
| 8 | Pablo Ramírez | pablo@integrationpros.com | Integration Pros | api-integration | $800k–$1.8M |
| 9 | Alejandra Moreno | alejandra@mobilefirst.com | Mobile First Agency | mobile-development | $500k–$1.2M |
| 10 | Fernando Juárez | fernando@seoexperts.com | SEO Experts | digital-marketing | $700k–$1.6M |
| 11 | Gabriela Sánchez | gabriela@contentmasters.com | Content Masters | content-management | $400k–$850k |
| 12 | Javier Castillo | javier@designinnovation.com | Design Innovation Lab | ui-ux-design | $600k–$1.4M |
| 13 | Valentina Torres | valentina@businessprocess.com | Business Process Solutions | process-automation | $1M–$2.5M |
| 14 | Manuel Herradura | manuel@securityfirst.com | Security First Consulting | cybersecurity | $900k–$2M |
| 15 | Catalina Flores | catalina@enterprisesolutions.com | Enterprise Solutions Inc | enterprise-consulting | $2.5M–$5M |

## Execution

### Preview (No Emails Sent)

```bash
node scripts/test-growth-outreach.mjs
```

Shows all 15 personalized emails that would be generated. Useful for QA before sending.

### Dry-Run (Verify Script Logic)

```bash
doppler run --project ops-intcloudsysops --config prd -- ./scripts/growth-outreach.sh --dry-run
```

Logs emails to `logs/growth/week-1-outreach.log` without actually sending.

### Send for Real

```bash
doppler run --project ops-intcloudsysops --config prd -- ./scripts/growth-outreach.sh
```

- Requires `RESEND_API_KEY` from Doppler (prd config)
- Sends emails via Resend API
- Updates `runtime/context/system_state.json` with results
- Logs all results to `logs/growth/week-1-outreach.log`

### Resend Configuration

```bash
RESEND_API_KEY=re_xxxxxxxx          # From Doppler prd
RESEND_FROM_EMAIL=growth@ops.smiletripcare.com  # Sender
```

## Email Template

### Personalization

Each email is customized with:
- Contact's first name
- Company name
- Specialization (ecommerce, marketing-automation, etc.)
- Demo link

### Subject

```
Hey {name}, Opsly automates your {specialization} workflows
```

Example: `Hey María García, Opsly automates your ecommerce workflows`

### Body Structure

1. **Opening**: Personalized to their company + specialization
2. **Value Prop**: 40+ hours/month saved, 70% faster onboarding, fewer errors
3. **CTA**: 15-min demo link + "reply to this email"
4. **Signature**: Opsly Growth Team

### HTML Format

Marketing-ready HTML with:
- Gradient header
- Benefit bullets
- CTA button
- Email footer

## Metrics & KPIs

### Expected Outcomes

| Metric | Value |
|--------|-------|
| Total Contacts | 15 |
| Expected Conversion | 20% (3 new tenants) |
| Projected ARPU | $299/tenant |
| Expected Weekly Revenue | $897 (3 × $299) |
| Expected Monthly Revenue (4 weeks) | $3,588 |

### Tracking

Results logged in `runtime/context/system_state.json`:

```json
{
  "growth_experiments": {
    "week_1": {
      "name": "outreach-to-agencias-tier1",
      "status": "completed",
      "target_contacts": 15,
      "outreach_count": 15,
      "expected_conversion": 0.2,
      "projected_arpu": 299,
      "template_version": "1.0",
      "last_run": "2026-04-29T12:00:00Z"
    }
  }
}
```

### Log Format

Each sent email is logged with:
- Timestamp (ISO 8601)
- Recipient name + email
- Company + specialization
- Subject line
- Template version
- Delivery status (sent, failed, dry-run)
- Resend email ID (for tracking opens/clicks)

Example:
```
[2026-04-29T12:05:00Z] TARGET_0
  Name: María García
  Email: maria@agenciax.com
  Company: Agencia X
  Specialization: ecommerce
  Subject: Hey María García, Opsly automates your ecommerce workflows
  Template Version: 1.0
  Status: sent
  Email ID: re_abc123xyz
```

## Idempotency

The script is **idempotent**:
- Safe to re-run without duplicate sends (if Resend deduplicates)
- Logs track all attempts
- No state mutations except log files

To prevent accidental re-sends:
1. Always use `--dry-run` first
2. Review `logs/growth/week-1-outreach.log` before re-running
3. Check `system_state.json` for `last_run` timestamp

## Error Handling

### Missing RESEND_API_KEY

```
ERROR: RESEND_API_KEY not set. Load via: doppler run --project ops-intcloudsysops --config prd
```

**Solution**: Ensure Doppler is configured and has prd config with RESEND_API_KEY.

### Missing Targets File

```
ERROR: Targets file not found: /path/to/tier1-targets.json
```

**Solution**: Verify `data/growth/tier1-targets.json` exists and is valid JSON.

### Resend API Failure

```
ERROR: Failed to send to maria@agenciax.com: Invalid email address
```

**Solution**: Check email validity in `tier1-targets.json`. Logs show which contacts failed.

## Future Enhancements

- [ ] Multi-step drip campaign (follow-up after 3 days, 7 days, 14 days)
- [ ] A/B testing different subject lines
- [ ] Tracking opens/clicks via Resend webhook integration
- [ ] Auto-add contacts to segment on successful send
- [ ] Slack notifications for campaign milestones
- [ ] CRM integration (export results to Supabase contacts table)

## Monitoring

### Check Campaign Status

```bash
cat runtime/logs/growth/week-1-outreach.log
```

### Verify Metrics

```bash
cat runtime/context/system_state.json | jq '.growth_experiments.week_1'
```

### Monitor Resend Deliverability

- Log into Resend dashboard: https://resend.com
- Check email statuses (delivered, bounced, complained, etc.)
- Review click/open rates from HTML email links

## Related

- **API Endpoint**: `POST /api/growth/outreach-template` (email generation)
- **System State**: `runtime/context/system_state.json` (metrics)
- **Doppler Project**: `ops-intcloudsysops` / `prd` config
- **Resend Account**: https://resend.com (API key in Doppler)
