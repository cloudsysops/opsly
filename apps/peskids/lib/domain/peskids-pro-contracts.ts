/**
 * Canonical type contracts for the "Peskids Pro 1.0" program (PR-PRO-0..12).
 *
 * These are TARGET types for the finished program, not a description of what
 * every table/schema uses today. Where the current runtime enum differs, the
 * mapping is documented inline so later PRs (PR-PRO-3, 4, 5, 9) know exactly
 * what adaptation work they own. Nothing in this file is imported by runtime
 * code yet — see individual PR-PRO-N specs in
 * docs/tenants/peskids/PESKIDS-PRO-1.0-IMPLEMENTATION-PLAN.md for when each
 * gets wired in.
 */

/**
 * Target lead lifecycle. Today `lib/validation/lead-admin.schema.ts`
 * (`adminLeadStatusSchema`) exposes `new | contacted | trial | enrolled |
 * archived`, mapped in `lib/services/lead-admin.service.ts`
 * (`mapAdminStatusToPlatform`) to the `platform.peskids_leads` stage values
 * `new | contacted | qualified | converted | lost`. Splitting `trial` into
 * `trial_scheduled` / `trial_completed` and renaming `archived` → `lost` is
 * PR-PRO-3/5 work, not done here.
 */
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'trial_scheduled'
  | 'trial_completed'
  | 'enrolled'
  | 'lost';

/**
 * Target follow-up lifecycle. Today `lib/validation/followup.schema.ts`
 * (`followupStatusSchema`) only has `pending | completed | cancelled` —
 * `overdue` is computed from `due_date`, never persisted. Persisting it (or
 * deciding to keep it derived) is PR-PRO-5 work.
 */
export type FollowUpStatus = 'pending' | 'completed' | 'cancelled' | 'overdue';

/**
 * Target follow-up channel. Today `followupTypeSchema` has
 * `call | email | sms | in-person` — no `whatsapp`/`other`, and `sms`/
 * `in-person` aren't in the target list. Reconciling the two is PR-PRO-4/5
 * work; this file does not change the live enum.
 */
export type FollowUpType = 'call' | 'whatsapp' | 'email' | 'other';

/**
 * Target trial-class lifecycle. Today `lib/validation/trial-class.schema.ts`
 * (`trialClassStatusSchema`) uses `attended`, not `completed` — a naming
 * difference PR-PRO-10 should resolve deliberately (rename vs. alias).
 */
export type TrialStatus = 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';

/**
 * Target lead source/channel. Today two separate concepts exist in
 * `lib/validation/lead.schema.ts`:
 *   - `PESKIDS_LEAD_SOURCES` (capture channel): web | whatsapp | referral | event | manual
 *   - `PESKIDS_REFERRAL_SOURCES` (how the family heard about Peskids):
 *     Google | Friend | Instagram | Facebook | Other | Not sure
 * The target `LeadSource` below conflates both into one value set. Deciding
 * whether to keep them separate or unify them is a PR-PRO-3 product decision,
 * not assumed here.
 */
export type LeadSource = 'website' | 'instagram' | 'facebook' | 'referral' | 'whatsapp' | 'other';

/**
 * Generic external-integration sync status, for any future
 * `*_sync_status` column (Twenty, email, etc.). No table has this shape yet;
 * PR-PRO-3/4 add the actual columns.
 */
export type IntegrationSyncStatus = 'pending' | 'synced' | 'failed' | 'retrying' | 'skipped';
