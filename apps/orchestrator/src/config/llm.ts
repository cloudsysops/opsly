export type AiProfile = 'free-always' | 'hybrid' | 'cloud-only';

const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:3010';
const DEFAULT_PROFILE: AiProfile = 'hybrid';

function parseProfile(raw: string | undefined): AiProfile {
  if (raw === 'free-always' || raw === 'hybrid' || raw === 'cloud-only') {
    return raw;
  }
  return DEFAULT_PROFILE;
}

function parseBudget(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function collectDailyBudgets(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('DAILY_BUDGET_')) {
      continue;
    }
    const budget = parseBudget(value);
    if (budget === undefined) {
      continue;
    }
    const tenant = key.slice('DAILY_BUDGET_'.length).toLowerCase();
    if (tenant.length === 0) {
      continue;
    }
    out[tenant] = budget;
  }
  return out;
}

export const LLM_GATEWAY_URL =
  process.env.LLM_GATEWAY_URL?.trim() ||
  process.env.ORCHESTRATOR_LLM_GATEWAY_URL?.trim() ||
  DEFAULT_GATEWAY_URL;

export const CLAUDE_API_KEY =
  process.env.CLAUDE_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim() || '';

export const AI_PROFILE = parseProfile(process.env.AI_PROFILE?.trim());

export const DAILY_BUDGETS_BY_TENANT = collectDailyBudgets();
