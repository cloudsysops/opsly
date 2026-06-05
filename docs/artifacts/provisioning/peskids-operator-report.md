# Peskids — GHL Operator Report

- **Date:** 2026-06-05
- **Location:** `KJ5LawrOOe3hIerqtMRu`
- **Sources:** `provision-report-peskids.md`, `GOHIGHLEVEL-CONTRACT.md`, `peskids.json`
- **JSON:** `peskids-operator-report.json`

---

## Completed

| # | Task | Result |
|---|------|--------|
| 1 | Test contact | **API** — `NrUuROsRKUe0u1GP8IgD` · `opsly.verify+peskids@intcloudsysops.com` · Opsly Verify Parent |
| 2 | Tags | **API** — `lead-web` on contact (manifest tag exists: `8KcvFYRH27MrNeXvOoPx`) |
| 3 | Pipeline | **API** — Opportunity `FfJtrG3xhyn8briiFvd1` in **Peskids Enrollment** @ **New Lead** |
| 4 | Custom fields | **API** — `child_name` = Mateo Test, `child_age` = 8 (IDs match provision report) |
| 5 | Tags/fields/pipeline/calendars inventory | **API** — 12 provision items `already_exists` per `provision-report-peskids.md` |

**Pipeline naming note:** Manifest canonical pipeline is **Peskids Enrollment**, not “Academy Growth”. Location also has **Academy Pipeline** and **Marketing Pipeline** (pre-existing; not duplicated). “Academy Growth” in OPSLY_CONTEXT is the product line, not this CRM pipeline name.

---

## Pending

| # | Task | Why |
|---|------|-----|
| 5 | Form **Peskids Lead Capture** E2E | API lists forms as `Form 0/1/2` only — no name match to manifest; **UI submit test** required |
| 6 | Email + SMS templates for automation | **MANUAL REQUIRED** — API does not list/verify templates |
| 7 | Basic follow-up flow activation | GHL workflow **or** n8n `peskids-lead-intake` — not verified this session |
| — | Screenshots before/after UI | Browser session interrupted — **0 captures** |

---

## Blockers

None on API path. No deletes, no duplicate contacts/tags/pipelines created on re-run (idempotent by email search).

**UI blocker (soft):** GHL login required for screenshots + form/template/workflow confirmation.

---

## Screenshots captured

| Screen | Before | After |
|--------|--------|-------|
| Contact detail | — | — |
| Pipeline / opportunity | — | — |
| Custom fields | — | — |
| Form Peskids Lead Capture | — | — |
| Email templates (×2) | — | — |
| SMS template | — | — |
| Workflows | — | — |

**Status:** `NOT CAPTURED` (browser navigate interrupted).  
**Manual capture URLs** (location `KJ5LawrOOe3hIerqtMRu`):

- Contact: `https://app.gohighlevel.com/v2/location/KJ5LawrOOe3hIerqtMRu/contacts/detail/NrUuROsRKUe0u1GP8IgD`
- Pipelines: `.../opportunities/pipelines`
- Forms: `.../funnels-websites/funnels`
- Email: `.../marketing/emails/templates`

Save to: `docs/artifacts/provisioning/screenshots/peskids-operator-2026-06-05/`

---

## API actions completed

```
Created test contact NrUuROsRKUe0u1GP8IgD
Added tags: lead-web
Created opportunity FfJtrG3xhyn8briiFvd1
```

Re-run (idempotent):

```bash
doppler run --project ops-intcloudsysops --config prd -- npx tsx scripts/ghl-peskids-operator-run.ts
```

---

## Manual actions completed

Per user prior session: email templates, SMS template, and form were created in GHL UI for Peskids — **not re-verified in UI this session** (API cannot confirm names).

| Resource | Manifest name | API status | UI status this session |
|----------|---------------|------------|----------------------|
| Email | Peskids — Welcome Parent | `manual_required` | **Not verified** |
| Email | Peskids — Trial Class Confirmation | `manual_required` | **Not verified** |
| SMS | Peskids — Trial Reminder | `manual_required` | **Not verified** |
| Form | Peskids Lead Capture | `manual_required` (IAM) | **Not verified** (API names mismatch) |

---

## API vs manual split (task 8)

| Resource type | Via API | Manual UI |
|---------------|---------|-----------|
| Tags (5) | ✅ provisioned + verified | — |
| Custom fields (4) | ✅ provisioned + on test contact | — |
| Pipelines | ✅ validated **Peskids Enrollment** | Create only if missing (already exists) |
| Calendars (2) | ✅ provisioned | — |
| Test contact + opportunity | ✅ this session | — |
| Forms | ❌ list IAM / generic names | ✅ create + E2E submit |
| Email templates (2) | ❌ not exposed | ✅ Marketing → Templates |
| SMS template (1) | ❌ not exposed | ✅ Conversations → Templates |
| Workflows / follow-up | ❌ | ✅ Automation or n8n |

---

## Next steps (operator)

1. Open contact URL above → screenshot tags, custom fields, opportunity card.
2. Confirm form **Peskids Lead Capture** exists (rename if still Form 0/1/2) → test submit.
3. Confirm 2 email + 1 SMS templates by exact manifest names.
4. Run `./scripts/smoke-peskids-n8n-lead-intake.sh` for follow-up path.
5. Re-run operator script → expect `reused: true` on contact, no new duplicates.
