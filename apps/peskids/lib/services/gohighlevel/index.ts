/**
 * LEGACY GoHighLevel modules for Peskids — not part of the operational path.
 * Enable only with PESKIDS_GHL_ENABLED=true during rollback or historical import.
 * Primary CRM: Twenty + Supabase (see docs/tenants/peskids/TWENTY-CRM.md).
 */

/** @deprecated */
export {
  handlePipelineStageUpdate,
  handleContactCreated,
  handleContactUpdated,
} from './webhook-handler';

/** @deprecated */
export { verifyGhlWebhookSignature, extractGhlEventType } from './webhook-auth';

/** @deprecated */
export { GhlSyncService, createGhlSyncService } from './sync.service';

/** @deprecated */
export { GhlReferralService } from './referral.service';
