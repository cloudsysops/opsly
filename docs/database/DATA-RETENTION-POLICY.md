---
status: action-required
owner: legal + devops
date: 2026-09-05
type: policy
severity: high
tags:
  - opsly/database
  - opsly/governance
---

# Data Retention — current state and gaps

> **Peskids holds personal data about minors.** Retention periods here are not
> an engineering preference; they are a legal determination under Ley 1581 /
> Decreto 1377 (Colombia) and whatever the signed parent consent actually says.
> Where this document says **PENDING HUMAN DECISION**, that means the decision
> has not been made, or has been made ambiguously — and this audit deliberately
> did not invent one.

---

## 0. The headline

`docs/legal/peskids/DPIA-2026.md` line 120 states:

> ✅ **Retention cron** configurado para borrado a los 730 días

**That control does not currently operate.** Three independent reasons, all
verifiable from the repository:

1. **The cron is never invoked.** `apps/api/app/api/cron/retention/route.ts`
   exists and is implemented, but the only scheduled cron in `vercel.json` and
   `apps/api/vercel.json` is `/api/cron/flush-billing` (every 5 minutes).
   Nothing — no Vercel cron, no GitHub workflow, no n8n job — ever calls
   `/api/cron/retention`.

2. **Two of the four seeded rules point at tables that do not exist.**
   `supabase/migrations/0062_governance_retention.sql` seeds
   `governance.retention_schedule` with:

   | Seeded target | Exists? | Actual table |
   |---|:-:|---|
   | `public.leads` | yes | — |
   | `public.peskids_form_submissions` | **no** | `peskids.form_submissions` |
   | `public.peskids_audit_log` | **no** | `peskids.audit_log` |
   | `governance.consents` | yes | — |

   The cron reads `schema_name` / `table_name` from the row, so those two rules
   would be no-ops even if the cron ran.

3. **No rule covers the child records themselves.** `public.students` has no
   retention rule at all, and neither does any table listed as UNCOVERED in §2.

A DPIA that asserts a control which does not run is worse than one that admits
the gap, because it stops anyone from looking. **The DPIA should be corrected**
— it is a legal document and this audit did not edit it.

---

## 1. What the DPIA already decides

These are settled; they need implementing, not deciding.

| Data | TTL (per DPIA §2.2) | Action | Rule exists? |
|---|---|---|:-:|
| Unconverted leads | 730 days | delete | yes (`public.leads`) |
| AI conversation logs | 90 days | delete | **no** |
| Audit logs | 730 days | delete | rule exists but targets a nonexistent table |
| Consents | 1825 days | archive | yes |

---

## 2. Coverage gaps

Every table below holds personal data and has **no retention rule**. Ownership
column says who must decide, not who implements.

### Child and family data — highest sensitivity

| Table | Contents | Status |
|---|---|---|
| `public.students` | child name, grade, enrollment date, parent email, `family_user_id` | **PENDING HUMAN DECISION** — see §3 |
| `public.parents` | parent contact details | **PENDING HUMAN DECISION** |
| `public.feedback` | `child_name`, satisfaction, free-text suggestions from parents | **PENDING HUMAN DECISION** |
| `public.messages` | conversation content with families | UNCOVERED — DPIA's "AI conversation logs, 90 days" may or may not be intended to cover this. **Ambiguous.** |
| `peskids.class_enrollments` | which child, which class, when, where | UNCOVERED |
| `peskids.student_points`, `peskids.student_badges` | per-child activity history | UNCOVERED |
| `peskids.notifications`, `peskids.notification_preferences` | parent contact routing | UNCOVERED |
| `peskids.push_subscriptions` | device push tokens (identifiers tied to a family device) | UNCOVERED — these also go stale and should expire on their own merits |

### Commercial and financial data

| Table | Contents | Note |
|---|---|---|
| `peskids.payments`, `peskids.subscription_payments`, `peskids.store_orders` | payment records | Retention is usually driven by **tax law, not privacy law** — typically longer than the privacy minimum, and deletion may be prohibited. **PENDING HUMAN DECISION.** |
| `platform.invoices`, `platform.invoice_line_items` | platform billing | as above |
| `platform.royalty_calculations`, `platform.royalty_payments` | franchise financials | as above; note these are append-only by design |

### Operational data

| Table | Note |
|---|---|
| `peskids.audit_log`, `platform.audit_log`, `platform.audit_events`, `public.lead_status_audit` | Audit rows are now UPDATE-immutable (migration `0101`) but remain deletable, precisely so retention can run. DPIA says 730 days. |
| `public.webhook_logs`, `platform.stripe_sync_logs`, `platform.metrics_log` | UNCOVERED; these accumulate indefinitely |
| `platform.usage_events`, `platform.llm_cache`, `platform.tenant_embeddings` | UNCOVERED |
| **Supabase Storage** — teacher applicant attachments (`0095`), staff improvement attachments (`20260726`) | UNCOVERED, and **not reachable by the retention cron at all**: it operates on database rows, so deleting a row leaves the file in the bucket. A CV uploaded by a rejected applicant persists indefinitely. |

---

## 3. PENDING HUMAN DECISION

These must be answered by the data owner with legal input. They are recorded
here unanswered on purpose.

1. **How long is a child's record kept after they leave the programme?**
   The DPIA says *"Vigencia del servicio + 5 años"* for converted leads, but no
   rule implements it and `public.students` has no "left the programme" date —
   only `status IN ('active','inactive')` with no timestamp of the transition.
   *Deciding this requires first adding a `deactivated_at` column, because the
   clock cannot start from data that is not recorded.*

2. **Anonymise or delete?** The DPIA says *"Anonimización o borrado"* — an
   either/or that was never resolved. They are very different: anonymisation
   keeps the row for analytics and is hard to do irreversibly when a child is
   identifiable by the combination of grade, location and enrolment dates.

3. **Does a parent's deletion request cascade to the child's attendance,
   payment and audit history?** DSAR machinery exists
   (`governance.dsar_requests`, `0061`), but what it must delete is undefined.
   Payment records may be legally undeletable while the child record is not.

4. **How long are payment records required to be kept**, and does that
   requirement override a deletion request?

5. **Free-text fields.** `public.feedback.suggestion`,
   `peskids.audit_log.metadata` and `public.messages` can contain anything a
   parent or staff member typed, including health information about a child.
   Are they in scope for the same TTL as structured data, or do they need a
   shorter one?

6. **Storage buckets.** What is the retention for an applicant CV, and who
   deletes it?

---

## 4. What to implement once §3 is answered

1. **Schedule the cron.** Add `/api/cron/retention` to `vercel.json` (daily is
   ample) and verify it actually runs — a retention job that fails silently is
   indistinguishable from the current state.
2. **Fix the two mis-targeted seed rules** with a new migration
   (`peskids.form_submissions`, `peskids.audit_log`). Do not edit `0062`.
3. **Add `deactivated_at`** to `public.students` so the retention clock has
   something to start from.
4. **Add rules** for the tables in §2 with the periods decided in §3.
5. **Extend the retention job to Supabase Storage,** or add a separate job. Row
   deletion does not delete files.
6. **Make the job observable** — rows deleted per table per run, emitted as a
   metric, and alert on a run that deletes zero rows across every table, which
   is what a silently broken job looks like.
7. **Correct `docs/legal/peskids/DPIA-2026.md`** to describe the control as it
   actually is. Legal document — needs its owner.
8. **Add a test** that fails when a table matching the child-data pattern has no
   row in `governance.retention_schedule`, so new tables cannot quietly land
   outside the policy.

---

## Related

- [[legal/peskids/DPIA-2026|DPIA Peskids 2026]] (legal — see §0)
- [[governance/DATA-CLASSIFICATION|Data classification]]
- [[database/MIGRATION-POLICY|Migration & Release-Gate Policy]]
- [[database/BACKUP-RESTORE-VERIFICATION|Backup & Restore Verification]]
