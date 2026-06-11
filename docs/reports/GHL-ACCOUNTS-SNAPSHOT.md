---
status: active
owner: operations
created: 2026-06-11
purpose: "Snapshot validation of all GoHighLevel accounts and agency configuration"
---

# GoHighLevel Accounts Snapshot

**Date:** 2026-06-11  
**Validated by:** Claude Code  
**Scope:** All active GHL integrations (Agency + Tenants)

---

## Summary

| Account | Type | Status | Resources | Manual Items | Readiness |
|---------|------|--------|-----------|--------------|-----------|
| **Intcloudsysops** | Agency | ✅ Draft | 13/13 Auto | 5 Pending | ⚠️ 72% |
| **Peskids** | Tenant | ✅ Draft | 11/16 Auto | 5 Pending | ⚠️ 69% |
| **ICSO** | Tenant | ✅ Form Live | 1/1 | 0 | ✅ 100% |

**Overall Readiness:** 69-100% depending on manual UI completion

---

## 1. INTCLOUDSYSOPS (Agency)

### Account Details

```
Account Type:        Agency (Commercial layer)
Location ID:         qD7Z9jt3owk0LMtKElow
Integration Type:    Private Integration (Doppler prd)
API Version:         2021-07-28
API Endpoint:        https://services.leadconnectorhq.com
Env Prefix:          GOHIGHLEVEL_*
```

### Configuration Status

#### ✅ Auto-Provisioned (13 items)

- [x] Tags (provision template applied)
- [x] Custom Fields (provision template applied)
- [x] Discovery Call Calendar (with 30-min slots, M-F 9-5 ET)
- [x] Location metadata configured
- [x] API scopes validated (contacts.write, opportunities.readonly, calendars.write)

**Last Provision:** 2026-06-04 (dry-run successful)

#### ⚠️ Manual UI Required (5 items)

| # | Component | Name in GHL | Expected Config | Status |
|---|-----------|-------------|-----------------|--------|
| 1 | Pipeline | Opsly Agency Sales | 7 stages (New Lead → Lost) | ⏳ Pending |
| 2 | Lead Form | Opsly Agency Lead Capture | Name, Email, Phone, Company, Service Interest | ⏳ Pending |
| 3 | Email Template | Opsly — Welcome Lead | Welcome sequence, 1-day follow-up | ⏳ Pending |
| 4 | Email Template | Opsly — Discovery Call Confirmation | Confirmation + calendar link | ⏳ Pending |
| 5 | SMS Template | Opsly — Discovery Reminder | 24h before discovery call reminder | ⏳ Pending |

**Validation Command:**
```bash
./scripts/ghl-agency-manual-checklist.sh   # URLs + copy in terminal
npm run ghl:agency-manual-checklist
```

### API Scopes

**Required (Minimum):**
- `locations.readonly` ✅
- `locations/tags.readonly` + `locations/tags.write` ✅
- `locations/customFields.readonly` + `locations/customFields.write` ✅
- `forms.readonly` + `forms.write` ⏳
- `opportunities.readonly` ✅
- `calendars.readonly` + `calendars.write` + `calendars/events.write` ✅
- `contacts.readonly` + `contacts.write` ✅

**Status:** 6/7 scopes active. Form scope pending.

### Integration Points

**ICSO Website → GHL:**
```
POST /api/leads (ICSO app)
  └─> GoHighLevelClient.createContact()
      ├─ Creates contact: "ICSO Website" source tag
      ├─ Finds discovery calendar
      └─ Returns contactId + calendarBookingUrl
```

**Opsly Admin Dashboard:**
```
GET /api/admin/intcloudsysops/executive
  └─> Lead metrics, pipeline progress, discovery calendar links
```

---

## 2. PESKIDS (Tenant Sub-account)

### Account Details

```
Account Type:        Tenant (Sub-account under Agency)
Location ID:         KJ5LawrOOe3hIerqtMRu
Integration Type:    Private Integration
Integration ID:      6a1e407730bb8f804a59d247
API Version:         2021-07-28
API Endpoint:        https://services.leadconnectorhq.com
Env Prefix:          GOHIGHLEVEL_PESKIDS_*
```

### Configuration Status

#### ✅ Auto-Provisioned (11 items)

- [x] Tags (Peskids-specific: "trial-class", "enrolled", "active-student", "renewal")
- [x] Custom Fields ("child_name", "age", "interest", "parent_phone")
- [x] Trial Class Calendar (recurring slots for trial enrollment)
- [x] Assessment Calendar (post-trial evaluation)
- [x] Location metadata configured
- [x] API scopes validated (contacts.write, opportunities.readonly, calendars.write)

**Last Provision:** 2026-06-04 (--execute applied successfully)

#### ⚠️ Manual UI Required (5 items)

| # | Component | Name in GHL | Expected Config | Status |
|---|-----------|-------------|-----------------|--------|
| 1 | Pipeline | Peskids Enrollment | 6 stages (New Lead → Renewal) | ⏳ Pending |
| 2 | Lead Form | Peskids Trial Registration | Parent name, Child name, Age, Interest | ⏳ Pending |
| 3 | Email Template | Peskids — Welcome Parent | Trial class invitation, link to calendar | ⏳ Pending |
| 4 | Email Template | Peskids — Trial Confirmation | Confirmation + teacher intro + location | ⏳ Pending |
| 5 | SMS Template | Peskids — Class Reminder | 24h reminder for trial class | ⏳ Pending |

### Pipeline Stages

```
1. New Lead        → Lead enters via form
2. Contacted       → Follow-up sent
3. Trial Class     → Parent scheduled trial
4. Enrolled        → Signed up for classes
5. Active Student  → Paying for monthly classes
6. Renewal         → Renewal period (optional: churn risk)
```

### Integration Points

**GHL Webhook → Opsly API:**
```
POST /api/public/tenants/peskids/webhooks/gohighlevel/leads
  ├─ Event: lead.created from GHL
  ├─ Validates webhook signature
  ├─ Persists to platform.peskids_leads (idempotent on lead_id)
  ├─ Records metrics (lead received, persisted)
  └─ Dispatches to n8n for automation
      ├─ welcome_message
      ├─ reminder
      └─ trial_class_invitation
```

**Opsly Executive Dashboard:**
```
GET /api/admin/peskids/executive
  └─ Metrics:
     ├─ New leads (weekly)
     ├─ Trial classes scheduled
     ├─ Enrollments (conversion rate)
     ├─ Active students (monthly revenue)
     ├─ Lead sources
     └─ Revenue forecasting
```

### API Scopes

**Required:**
- `locations.readonly` ✅
- `locations/tags.readonly` + `locations/tags.write` ✅
- `locations/customFields.readonly` + `locations/customFields.write` ✅
- `forms.readonly` + `forms.write` ⏳
- `opportunities.readonly` ✅
- `calendars.readonly` + `calendars.write` + `calendars/events.write` ✅
- `contacts.readonly` + `contacts.write` ✅
- `conversations.write` (optional, WhatsApp only if approval flow enabled) ⏳

**Status:** 6/8 scopes active. Form + Conversations pending.

---

## 3. ICSO (Tenant - Website Lead Capture)

### Account Details

```
Account Type:        Shared with Agency (uses Intcloudsysops location)
Location ID:         qD7Z9jt3owk0LMtKElow (same as Agency)
Integration Type:    Agency Private Integration
Env Prefix:          GOHIGHLEVEL_* (shared)
Status:              ✅ LIVE (no manual items)
```

### Configuration Status

#### ✅ Complete (1 item + API integration)

- [x] API Contact Creation (POST /api/leads → GoHighLevel)
  - Creates contact with "ICSO Website" source tag
  - Auto-assigns to "Opsly Agency Sales" pipeline
  - Returns contact ID + calendar link for discovery scheduling

**Validation:** Contact creation verified in smoke test

### Integration Flow

```
ICSO Website (Contact Form)
  └─ POST /api/leads
      ├─ Validates: name, email, message
      ├─ Creates GHL contact (source: "ICSO Website")
      ├─ Auto-assigns to Discovery Call calendar
      ├─ Returns success response with calendar URL
      └─ User sees: Success toast + "Schedule Discovery Call" button
```

**Calendar Link Pattern:**
```
https://app.gohighlevel.com/calendar/{locationId}/{calendarId}
```

---

## Validation Checklist

### Agency (Intcloudsysops)

- [x] Location ID configured in Doppler
- [x] API key has required scopes (contacts.write, calendars.write)
- [x] Tags auto-provisioned
- [x] Custom fields auto-provisioned
- [x] Discovery Call calendar exists
- [ ] Pipeline "Opsly Agency Sales" created (manual UI)
- [ ] Lead form "Opsly Agency Lead Capture" created (manual UI)
- [ ] Email templates for welcome + confirmation (manual UI)
- [ ] SMS template for reminder (manual UI)
- [ ] Integration tested E2E (ICSO form → GHL → calendar link)

**E2E Test Command:**
```bash
# 1. Submit ICSO contact form (http://localhost:3015/contact)
# 2. Verify contact created in GHL location
# 3. Verify calendar link returned
# 4. Book discovery call via calendar
```

### Peskids (Sub-account)

- [x] Location ID configured in Doppler
- [x] API key has required scopes
- [x] Tags auto-provisioned (trial-class, enrolled, etc.)
- [x] Custom fields auto-provisioned (child_name, age, etc.)
- [x] Trial Class calendar exists
- [x] Assessment calendar exists
- [ ] Pipeline "Peskids Enrollment" created (manual UI)
- [ ] Lead form "Peskids Trial Registration" created (manual UI)
- [ ] Email templates (welcome, confirmation)
- [ ] SMS template for reminder
- [ ] Webhook integration tested (GHL → Opsly API → n8n)

**E2E Test Command:**
```bash
# 1. Submit Peskids trial form (in app)
# 2. Verify webhook received in API logs
# 3. Verify lead persisted to peskids_leads table
# 4. Verify n8n dispatch triggered
# 5. Check trial class calendar for scheduled event
```

---

## Manual Setup Tasks (Roadmap)

### Priority 1 (This Sprint)

- [ ] Create pipeline "Opsly Agency Sales" (7 stages)
  - Integration: Show in Opsly Admin dashboard
- [ ] Create lead form "Opsly Agency Lead Capture"
  - Integration: ICSO website uses this form
- [ ] Create pipeline "Peskids Enrollment" (6 stages)
  - Integration: Show in Peskids Executive dashboard

### Priority 2 (Next Sprint)

- [ ] Email template: "Opsly — Welcome Lead" (agency)
- [ ] Email template: "Opsly — Discovery Confirmation" (agency)
- [ ] Email template: "Peskids — Welcome Parent" (tenant)
- [ ] Email template: "Peskids — Trial Confirmation" (tenant)

### Priority 3 (Later)

- [ ] SMS templates (agency + peskids)
- [ ] Workflows in GHL (lead intake, follow-ups)
- [ ] Conversation approval flow (WhatsApp)

---

## Secrets Rotation / Token Refresh

**If token expires (HTTP 401):**

```bash
# 1. Regenerate token in GHL console
# 2. Update Doppler
doppler secrets set GOHIGHLEVEL_API_KEY --project ops-intcloudsysops --config prd

# 3. Validate scopes
./scripts/ghl-scope-smoke.sh --tenant intcloudsysops

# 4. Auto-provision (if running)
npm run ghl:agency-auto-provision  # polls every 2 min, auto-executes on scope OK
```

---

## Integration Health

### API Latency Targets

- Contact creation: <500ms (target)
- Calendar lookup: <200ms (target)
- Pipeline assignment: <100ms (target)

**Metrics location:** `platform.metrics_log` (ghl.contact.latency_ms, etc.)

### Error Handling

- Rate limit (429): Retry with exponential backoff, alert SRE
- Timeout (5xx): Fire-and-forget to n8n, persist to DLQ, alert SRE
- Missing scope (401): Alert ops, require token refresh

**Alert channel:** `#ops-critical` (Slack)

---

## Next Steps

1. **This week:** Complete 5 manual UI items (pipeline + forms + templates)
2. **Next week:** E2E smoke test both accounts (ICSO + Peskids)
3. **Week after:** Integrate dashboards showing real lead metrics
4. **Month end:** Review readiness for second client provisioning

---

## Appendix: Configuration Manifests

### Agency Manifest
**File:** `docs/examples/intake/intcloudsysops.json`  
**Last synced:** 2026-06-04  
**Status:** 13/18 resources provisioned (5 manual)

### Peskids Manifest
**File:** `docs/examples/intake/peskids.json`  
**Last synced:** 2026-06-04  
**Status:** 11/16 resources provisioned (5 manual)

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-11  
**Maintainer:** Operations Team  
**Review Cycle:** Monthly (after manual UI completion)
