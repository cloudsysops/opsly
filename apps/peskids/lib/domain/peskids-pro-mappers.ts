/**
 * Pure mappers between today's live enums and Peskids Pro 1.0 target contracts.
 *
 * PR-PRO-0: documentation + type-safe adapters only. No callers in runtime yet.
 * Later PRs import these when aligning admin UI, platform DB, and Twenty stages.
 */

import type {
  FollowUpStatus,
  FollowUpType,
  LeadSource,
  LeadStatus,
  TrialStatus,
} from '@/lib/domain/peskids-pro-contracts';

/** Live admin Zod enum (`lead-admin.schema.ts`). */
export type AdminLeadStatusLive = 'new' | 'contacted' | 'trial' | 'enrolled' | 'archived';

/** Live `platform.peskids_leads.status` values (`mapAdminStatusToPlatform`). */
export type PlatformLeadStatusLive = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

/** Live trial enum (`trial-class.schema.ts`) — uses `attended`, not `completed`. */
export type TrialStatusLive = 'scheduled' | 'confirmed' | 'attended' | 'no_show' | 'cancelled';

/** Live follow-up status — `overdue` is derived today, not persisted. */
export type FollowUpStatusLive = 'pending' | 'completed' | 'cancelled';

/** Live follow-up type (`followup.schema.ts`). */
export type FollowUpTypeLive = 'call' | 'email' | 'sms' | 'in-person';

/**
 * Canonical Twenty stage *slugs* for Pro 1.0 (config keys, not production IDs).
 * PR-PRO-3 resolves real stage IDs from env / Twenty API.
 */
export type TwentyOpportunityStageSlug =
  | 'NEW'
  | 'CONTACTED'
  | 'TRIAL_SCHEDULED'
  | 'TRIAL_COMPLETED'
  | 'ENROLLED'
  | 'LOST';

export function adminLeadStatusToPro(status: AdminLeadStatusLive): LeadStatus {
  switch (status) {
    case 'new':
      return 'new';
    case 'contacted':
      return 'contacted';
    case 'trial':
      // Live admin collapses scheduled+completed into one stage.
      return 'trial_scheduled';
    case 'enrolled':
      return 'enrolled';
    case 'archived':
      return 'lost';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function proLeadStatusToAdmin(status: LeadStatus): AdminLeadStatusLive {
  switch (status) {
    case 'new':
      return 'new';
    case 'contacted':
      return 'contacted';
    case 'trial_scheduled':
    case 'trial_completed':
      return 'trial';
    case 'enrolled':
      return 'enrolled';
    case 'lost':
      return 'archived';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function platformLeadStatusToPro(status: PlatformLeadStatusLive): LeadStatus {
  switch (status) {
    case 'new':
      return 'new';
    case 'contacted':
      return 'contacted';
    case 'qualified':
      return 'trial_scheduled';
    case 'converted':
      return 'enrolled';
    case 'lost':
      return 'lost';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function proLeadStatusToPlatform(status: LeadStatus): PlatformLeadStatusLive {
  switch (status) {
    case 'new':
      return 'new';
    case 'contacted':
      return 'contacted';
    case 'trial_scheduled':
    case 'trial_completed':
      return 'qualified';
    case 'enrolled':
      return 'converted';
    case 'lost':
      return 'lost';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function proLeadStatusToTwentyStageSlug(status: LeadStatus): TwentyOpportunityStageSlug {
  switch (status) {
    case 'new':
      return 'NEW';
    case 'contacted':
      return 'CONTACTED';
    case 'trial_scheduled':
      return 'TRIAL_SCHEDULED';
    case 'trial_completed':
      return 'TRIAL_COMPLETED';
    case 'enrolled':
      return 'ENROLLED';
    case 'lost':
      return 'LOST';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Admin UI status → Twenty opportunity stage slug (PR-PRO-3). */
export function adminLeadStatusToTwentyStageSlug(
  status: AdminLeadStatusLive
): TwentyOpportunityStageSlug {
  return proLeadStatusToTwentyStageSlug(adminLeadStatusToPro(status));
}

/** Twenty opportunity stage slug → canonical lead status. Inverse of proLeadStatusToTwentyStageSlug. */
export function twentyStageSlugToProLeadStatus(stage: TwentyOpportunityStageSlug): LeadStatus {
  switch (stage) {
    case 'NEW':
      return 'new';
    case 'CONTACTED':
      return 'contacted';
    case 'TRIAL_SCHEDULED':
      return 'trial_scheduled';
    case 'TRIAL_COMPLETED':
      return 'trial_completed';
    case 'ENROLLED':
      return 'enrolled';
    case 'LOST':
      return 'lost';
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

/**
 * Twenty opportunity stage slug → live admin status (webhook reverse-sync).
 * Reuses the existing proLeadStatusToAdmin — lossy in the trial direction
 * (both trial sub-stages collapse to admin's single 'trial' status), which
 * is correct since that's the same collapse adminLeadStatusToPro already
 * does in the forward direction.
 */
export function twentyStageSlugToAdminLeadStatusLive(
  stage: TwentyOpportunityStageSlug
): AdminLeadStatusLive {
  return proLeadStatusToAdmin(twentyStageSlugToProLeadStatus(stage));
}

export function trialStatusLiveToPro(status: TrialStatusLive): TrialStatus {
  switch (status) {
    case 'scheduled':
      return 'scheduled';
    case 'confirmed':
      return 'confirmed';
    case 'attended':
      return 'completed';
    case 'no_show':
      return 'no_show';
    case 'cancelled':
      return 'cancelled';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function trialStatusProToLive(status: TrialStatus): TrialStatusLive {
  switch (status) {
    case 'scheduled':
      return 'scheduled';
    case 'confirmed':
      return 'confirmed';
    case 'completed':
      return 'attended';
    case 'no_show':
      return 'no_show';
    case 'cancelled':
      return 'cancelled';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function followUpStatusLiveToPro(
  status: FollowUpStatusLive,
  options?: { overdue?: boolean }
): FollowUpStatus {
  if (options?.overdue === true && status === 'pending') {
    return 'overdue';
  }
  return status;
}

export function followUpTypeLiveToPro(type: FollowUpTypeLive): FollowUpType {
  switch (type) {
    case 'call':
      return 'call';
    case 'email':
      return 'email';
    case 'sms':
      return 'whatsapp';
    case 'in-person':
      return 'other';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/**
 * Best-effort normalization of capture/referral strings into Pro LeadSource.
 * Does not change live Zod schemas.
 */
export function normalizeLeadSource(raw: string | null | undefined): LeadSource {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return 'other';
  if (['website', 'web', 'site', 'direct', 'organic'].includes(value)) return 'website';
  if (['instagram', 'ig', 'insta'].includes(value)) return 'instagram';
  if (['facebook', 'fb', 'meta'].includes(value)) return 'facebook';
  if (['referral', 'friend', 'recomendacion', 'recomendación'].includes(value)) {
    return 'referral';
  }
  if (['whatsapp', 'wa', 'wsp'].includes(value)) return 'whatsapp';
  return 'other';
}
