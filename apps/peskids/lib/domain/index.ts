/**
 * Peskids Pro 1.0 domain contracts (PR-PRO-0).
 * Pure types + mappers — no runtime side effects.
 */

export type {
  FollowUpStatus,
  FollowUpType,
  IntegrationSyncStatus,
  LeadSource,
  LeadStatus,
  TrialStatus,
} from '@/lib/domain/peskids-pro-contracts';

export type {
  AdminLeadStatusLive,
  FollowUpStatusLive,
  FollowUpTypeLive,
  PlatformLeadStatusLive,
  TrialStatusLive,
  TwentyOpportunityStageSlug,
} from '@/lib/domain/peskids-pro-mappers';

export {
  adminLeadStatusToPro,
  adminLeadStatusToTwentyStageSlug,
  followUpStatusLiveToPro,
  followUpTypeLiveToPro,
  normalizeLeadSource,
  platformLeadStatusToPro,
  proLeadStatusToAdmin,
  proLeadStatusToPlatform,
  proLeadStatusToTwentyStageSlug,
  trialStatusLiveToPro,
  trialStatusProToLive,
} from '@/lib/domain/peskids-pro-mappers';
