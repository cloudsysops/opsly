import { notifyDiscord } from "../discord-notify.js";

export async function notifyBudgetExceeded(
  tenantSlug: string,
  usedUsd: number,
  budgetUsd: number,
): Promise<void> {
  await notifyDiscord(
    "LLM budget agotado (402)",
    `Tenant \`${tenantSlug}\` superó budget diario: usd_used=${usedUsd.toFixed(4)} usd_budget=${budgetUsd.toFixed(4)}.`,
    "error",
  );
}

export async function notifyBudgetWarning(
  tenantSlug: string,
  usedUsd: number,
  budgetUsd: number,
): Promise<void> {
  await notifyDiscord(
    "LLM budget warning (80%)",
    `Tenant \`${tenantSlug}\` está cerca del tope diario: usd_used=${usedUsd.toFixed(4)} usd_budget=${budgetUsd.toFixed(4)}.`,
    "warning",
  );
}

export async function notifyProviderRateLimit(
  tenantSlug: string,
  provider: string,
  detail: string,
): Promise<void> {
  await notifyDiscord(
    "LLM provider rate limit (429)",
    `Tenant \`${tenantSlug}\` recibió 429 en provider \`${provider}\`: ${detail.slice(0, 400)}.`,
    "warning",
  );
}
