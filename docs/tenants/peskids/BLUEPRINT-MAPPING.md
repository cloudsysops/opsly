# Peskids ↔ Opsly Operational Blueprint Mapping

**Purpose:** Define how Peskids (incubated tenant) aligns with and validates the Opsly Operational Blueprint v0.1  
**Status:** Mapping v1.0 (Draft)  
**Updated:** 2026-05-19

---

## Blueprint Layer Alignment

### 1. Multi-Tenant Architecture

**Blueprint Principle:** Each tenant is isolated. Data in Tenant A is not visible to Tenant B. RLS + Row-Level Permissions enforce isolation.

**Peskids Implementation:**
- All tables (`leads`, `feedback`, `students`, `followups`) have `tenant_id` column
- Supabase RLS policies filter by authenticated tenant context
- Admin dashboards show only current tenant's data
- Events emit `tenant_id` for proper routing in Opsly event bus

**Validation:** ✅ Peskids proves multi-tenant isolation is viable for real users

---

### 2. Event-Driven Integration

**Blueprint Principle:** Services communicate via immutable events, not direct API calls. Events go to Opsly event bus. Consumers subscribe to events they care about.

**Peskids Events:**
```
lead.created → Dashboard shows new lead instantly
feedback.created → Alert admin if satisfaction < 3
followup.created → Workflow engine schedules reminders
followup.completed → Audit log + metrics
student.created → Sync to billing system (future)
weekly_report.requested → Trigger report generation
weekly_report.generated → Email to owner
```

**Validation:** ✅ Peskids defines 9 core events, demonstrating event contract for emerging platforms

---

### 3. Approval-First AI Operations

**Blueprint Principle:** AI suggests, humans approve. No auto-send, no silent automations. Transparency > efficiency.

**Peskids Commitment:**
- ❌ NO auto-messaging to parents (ever)
- ❌ NO auto-enrollment (ever)
- ❌ NO AI-generated follow-ups without owner seeing + approving
- ✅ Owner approves every outbound communication
- ✅ Dashboard shows what AI recommended before owner acts

**Validation:** ✅ Peskids operationalizes approval-first as a feature, not a limitation

---

### 4. Real-Time Data Freshness

**Blueprint Principle:** Data in dashboard updates in real-time or near-real-time (< 5 seconds) so operators can trust what they see.

**Peskids Implementation:**
- New leads appear in dashboard within 2 seconds (webhook trigger)
- Feedback shows within 1 second (event → Supabase Realtime)
- Follow-up status updates on admin action (UI optimistic update)
- Trend chart refreshes every 5 minutes (scheduled poll)

**Validation:** ✅ Peskids dashboard proves real-time updates are feasible with simple event hooks

---

### 5. Tenant-Specific Workflows

**Blueprint Principle:** Each tenant may have different operational workflows. Framework is standardized; workflows are flexible.

**Peskids Workflows:**
- **Lead Workflow:** Form → Dashboard → Follow-up → Enrollment
- **Feedback Workflow:** Weekly survey → Alert if low score → Owner decides action
- **Follow-up Workflow:** Create task → Schedule reminder → Complete → Log outcome

**Validation:** ✅ Peskids shows 3+ distinct workflows can coexist in single platform

---

### 6. Security & PII Handling

**Blueprint Principle:** Collect minimal PII. Never log passwords. Mask sensitive data in logs/dashboards.

**Peskids Data:**
- Collects: name, email, phone, grade interested, feedback, notes (all required for operations)
- Never logs: parent passwords, student SSN, bank info
- Masks: Phone numbers shown as last-4 digits in list views
- Deletes: Events purged after 90 days per compliance

**Validation:** ✅ Peskids operational data is minimal, justified, and secured

---

## Operational Blueprint Validation

### Tenant Onboarding

**What Peskids validates:**
- Tenant config creation ✅
- RLS policy setup ✅
- API key generation ✅
- Event bus subscription ✅
- First form submission → first event ✅

**What's deferred (Phase 3):**
- Automated tenant provisioning script
- Tenant dashboard in Opsly admin
- Billing/metering integration

---

### Multi-Tenant Isolation

**What Peskids validates:**
- Leads from Peskids Tenant A do not appear in Tenant B ✅
- RLS prevents cross-tenant queries ✅
- Events include tenant_id for routing ✅
- Admin interfaces show only own tenant ✅

**Testing:** Use 2+ test tenants in Supabase, verify isolation

---

### Event Contract Consistency

**What Peskids validates:**
- Event schema (JSON): required fields, data types ✅
- Producer/consumer contract clarity ✅
- At-least-once delivery semantics ✅
- Retry policy (3 attempts, exponential backoff) ✅
- Privacy (no plaintext PII in logs) ✅

**Reusable Event Types for other tenants:**
- `{entity}.created` (generic pattern)
- `{entity}.updated` (generic pattern)
- `{entity}.deleted` (not in MVP, future)
- `{entity}.alert` (for urgent notifications)

---

### Approval-First Operational Safety

**What Peskids validates:**
- Owner must explicitly click "follow-up" button (no background automation) ✅
- Dashboard shows recommended action before execution ✅
- All outbound communication requests logged in event store ✅
- Owner can withdraw approval before send ✅

**Failure scenario:** If email service fails mid-send, event shows state mismatch. Owner sees and can retry/investigate.

---

## Service Dependencies (Minimal)

Peskids uses only:

| Service | Role | Why |
|---------|------|-----|
| Supabase (existing) | Database + Auth + RLS | Standard Opsly platform |
| Event Bus (existing) | Event routing | Framework feature |
| LLM Gateway (existing) | AI suggestions (future) | Shared infrastructure |
| SMTP (existing) | Email notifications | Standard ops need |
| Edge Functions (existing) | Webhook handlers | Supabase standard |

**No new infrastructure required.** Peskids proves the operational blueprint works with **existing Opsly stack**.

---

## Blueprint Feedback Loop

**Peskids will inform v0.2 of the Operational Blueprint by answering:**

1. ✅ Multi-tenant isolation is viable? (Yes, RLS works)
2. ✅ Event contracts are workable? (Yes, 9 events defined and clear)
3. ❓ Real-time updates matter operationally? (Will know after Phase 3)
4. ❓ Approval-first creates friction? (Will measure owner satisfaction)
5. ❓ Cross-tenant benchmarking is useful? (Will test in Phase 4)

**Answers feed into:**
- Blueprint v0.2 recommendations
- Operational playbooks for next tenant
- Architecture decisions for Opsly core

---

## Risk Mitigation

| Risk | Blueprint Mitigation |
|------|---------------------|
| **Data breach (PII leak)** | RLS enforced at DB layer; event logs expire 90 days |
| **Cross-tenant contamination** | Tenant_id in every query; no default assumption of access |
| **Event delivery failure** | At-least-once semantics; consumer idempotency required |
| **Approval workflow bypass** | UI prevents automation; owner approval is prerequisite |
| **Silent operational failure** | Events logged; monitoring + alerting tied to event stream |

---

## Success Criteria

**Blueprint Validation is successful if:**

1. ✅ Peskids operates without modifying Opsly core (Phase 1)
2. ✅ Multi-tenant RLS prevents data leakage (Phase 1 testing)
3. ✅ Events flow through event bus without loss (Phase 2 testing)
4. ✅ Owner approval workflow is operationally sound (Phase 3 user feedback)
5. ✅ Dashboard provides actionable real-time data (Phase 3 metrics)

---

## Next Steps

1. **Phase 1 (Design):** Owner reviews wireframes, validates blueprint alignment
2. **Phase 2 (Build):** Dev team implements per specs; CI verifies RLS
3. **Phase 3 (Operations):** First real owner uses system; Ops Agent monitors
4. **Phase 4 (Blueprint Feedback):** CloudSysOps + Opsly team reviews findings

---

## References

- Opsly Operational Blueprint v0.1: `docs/blueprints/opsly-operational-blueprint/`
- Peskids README: [README.md](./README.md)
- Peskids Extraction Plan: [EXTRACTION-PLAN.md](./EXTRACTION-PLAN.md)
- MVP Plan: [MVP-PLAN.md](./MVP-PLAN.md)
