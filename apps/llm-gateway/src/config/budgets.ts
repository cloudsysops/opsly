import { getTenantUsage } from '../logger.js';

export type AiProfile = 'free-always' | 'hybrid' | 'cloud-only';

const DEFAULT_AI_PROFILE: AiProfile = 'hybrid';
const WARN_FRACTION = 0.8;
const TENANT_DEFAULT_PROFILES: Record<string, AiProfile> = {
  smiletripcare: 'hybrid',
  peskids: 'hybrid',
  intcloudsysops: 'free-always',
};

export interface DailyBudgetStatus {
  readonly allowed: boolean;
  readonly warn: boolean;
  readonly budgetUsd: number;
  readonly usedUsd: number;
  readonly usageFraction: number;
}

function normalizeTenantSlug(tenantSlug: string): string {
  return tenantSlug.trim().toLowerCase();
}

function normalizeEnvTenant(tenantSlug: string): string {
  return tenantSlug
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase();
}

function parseProfile(raw: string | undefined): AiProfile | null {
  if (raw === 'free-always' || raw === 'hybrid' || raw === 'cloud-only') {
    return raw;
  }
  return null;
}

export function resolveAiProfile(tenantSlug: string): AiProfile {
  const byTenant = parseProfile(process.env[`AI_PROFILE_${normalizeEnvTenant(tenantSlug)}`]);
  if (byTenant) {
    return byTenant;
  }
  const globalProfile = parseProfile(process.env.AI_PROFILE);
  if (globalProfile) {
    return globalProfile;
  }
  return TENANT_DEFAULT_PROFILES[normalizeTenantSlug(tenantSlug)] ?? DEFAULT_AI_PROFILE;
}

function resolveDailyBudgetEnv(tenantSlug: string): string | undefined {
  return process.env[`DAILY_BUDGET_${normalizeEnvTenant(tenantSlug)}`];
}

export function resolveDailyBudgetUsd(tenantSlug: string): number {
  const raw = resolveDailyBudgetEnv(tenantSlug);
  if (!raw) {
    return Number.POSITIVE_INFINITY;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return parsed;
}

export async function checkDailyBudget(tenantSlug: string): Promise<DailyBudgetStatus> {
  const budgetUsd = resolveDailyBudgetUsd(tenantSlug);
  if (!Number.isFinite(budgetUsd)) {
    return {
      allowed: true,
      warn: false,
      budgetUsd,
      usedUsd: 0,
      usageFraction: 0,
    };
  }
  const usage = await getTenantUsage(tenantSlug, 'today');
  const usedUsd = usage.cost_usd;
  const usageFraction = budgetUsd > 0 ? usedUsd / budgetUsd : Number.POSITIVE_INFINITY;
  return {
    allowed: usageFraction < 1,
    warn: usageFraction >= WARN_FRACTION && usageFraction < 1,
    budgetUsd,
    usedUsd,
    usageFraction,
  };
}
