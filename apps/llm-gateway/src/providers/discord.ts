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
  tenantSlug: string,
  providerId: string,
  detail: string
): Promise<void> {
  // Slack integration handles this now; keep signature for observability hooks / tests
  console.log(`Rate limit: tenant=${tenantSlug} provider=${providerId} ${detail}`);
}
