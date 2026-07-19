/**
 * WhatsApp + Twenty CRM Sync Module
 */

export type { TwentyPerson, TwentyOpportunity, TwentySyncResult, TwentyRetryRecord } from './types';

export {
  findPersonByPhone,
  upsertPerson,
  linkLeadToTwenty,
} from './person-sync';

export {
  createOpportunity,
  updateOpportunityStage,
} from './opportunity-sync';

export {
  recordFailedTwentySync,
  retryFailedTwentySyncs,
  calculateNextRetryTime,
} from './retry';
