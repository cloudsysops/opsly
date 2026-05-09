/**
 * Discord notifications - deprecated
 * Use Slack integration instead
 */

export async function notifyBudgetExceeded(
  tenantSlug: string,
  usedUsd: number,
  budgetUsd: number
): Promise<void> {
  // Slack integration handles this now
  console.log(`Budget exceeded: ${tenantSlug} ($${usedUsd} / $${budgetUsd})`);
}

export async function notifyBudgetWarning(
  tenantSlug: string,
  usedUsd: number,
  budgetUsd: number
): Promise<void> {
  // Slack integration handles this now
  console.log(`Budget warning: ${tenantSlug} ($${usedUsd} / $${budgetUsd})`);
}

export async function notifyProviderRateLimit(
  provider: string,
  retryAfterSeconds: number
): Promise<void> {
  // Slack integration handles this now
  console.log(`Rate limit: ${provider} (retry in ${retryAfterSeconds}s)`);
}
