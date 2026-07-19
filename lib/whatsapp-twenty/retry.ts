/**
 * Twenty CRM Sync Retry Logic
 * - Handle failed syncs asynchronously
 * - Exponential backoff
 * - Dead-letter queue for repeated failures
 */

/**
 * Record failed Twenty sync for retry
 * (Implementation depends on Supabase or external job queue)
 */
export async function recordFailedTwentySync(
  leadId: string,
  tenantId: string,
  syncType: 'person' | 'opportunity',
  error: string,
  attemptCount: number = 1
): Promise<void> {
  try {
    // TODO: Insert into whatsapp_twenty_sync_queue or equivalent table
    // For now, log it
    console.log('[Twenty Retry] Recording failed sync:', {
      leadId,
      tenantId,
      syncType,
      error,
      attemptCount,
    });

    // TODO: Schedule retry with exponential backoff
    // Example: next retry at NOW() + (2 ^ attemptCount) minutes
  } catch (err) {
    console.error('[Twenty Retry] Failed to record failed sync:', err);
  }
}

/**
 * Retry failed Twenty syncs
 * (Can be run as scheduled task via n8n or Temporal)
 */
export async function retryFailedTwentySyncs(maxRetries: number = 3): Promise<void> {
  try {
    // TODO: Query whatsapp_twenty_sync_queue where attemptCount < maxRetries
    // TODO: For each record:
    //   - Determine if it's ready to retry (nextRetryAt <= NOW())
    //   - Call upsertPerson or createOpportunity
    //   - Update status based on result
    // TODO: Move records with attemptCount >= maxRetries to dead-letter queue

    console.log('[Twenty Retry] Retry job completed');
  } catch (err) {
    console.error('[Twenty Retry] Retry job failed:', err);
  }
}

/**
 * Calculate exponential backoff for next retry
 */
export function calculateNextRetryTime(attemptCount: number): Date {
  // 2^attemptCount minutes (1, 2, 4, 8, 16, ...)
  const minutesDelay = Math.pow(2, attemptCount);
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + minutesDelay);
  return nextRetry;
}
