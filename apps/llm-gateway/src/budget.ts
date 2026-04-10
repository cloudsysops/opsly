import { createClient } from "@supabase/supabase-js";
import { notifyDiscord } from "./discord-notify.js";
import { getTenantUsage } from "./logger.js";
import { platformSchema } from "./supabase-helpers.js";
import type { TenantPlan } from "./types.js";

export async function resolveTenantPlan(tenant_slug: string): Promise<TenantPlan> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return "startup";
  }
  const sb = createClient(url, key);
  const { data } = await platformSchema(sb)
    .from("tenants")
    .select("plan")
    .eq("slug", tenant_slug)
    .maybeSingle();
  const p = (data as { plan?: string } | null)?.plan;
  if (p === "business" || p === "enterprise" || p === "startup") {
    return p;
  }
  return "startup";
}

export const PLAN_BUDGETS: Record<
  TenantPlan,
  { max_tokens_month: number; max_cost_usd_month: number }
> = {
  startup: { max_tokens_month: 10_000, max_cost_usd_month: 0.5 },
  business: { max_tokens_month: 50_000, max_cost_usd_month: 2.0 },
  enterprise: { max_tokens_month: Number.POSITIVE_INFINITY, max_cost_usd_month: Number.POSITIVE_INFINITY },
};

export interface BudgetStatus {
  allowed: boolean;
  force_cheap: boolean;
  warn_threshold: boolean;
  tokens_used: number;
  cost_used: number;
  plan: TenantPlan;
}

interface CustomBudget {
  monthly_cap_usd: number;
  alert_threshold_pct: number;
}

const PCT_DIVISOR = 100;
const DEFAULT_ALERT_FRACTION = 0.8;
const FORCE_CHEAP_COST_FRACTION = 0.85;
const FORCE_CHEAP_TOKEN_FRACTION = 0.75;

async function getCustomBudget(
  tenant_slug: string,
): Promise<CustomBudget | null> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  const sb = createClient(url, key);
  const { data } = await platformSchema(sb)
    .from("tenant_budgets")
    .select("monthly_cap_usd, alert_threshold_pct")
    .eq("tenant_slug", tenant_slug)
    .maybeSingle();
  if (!data) {
    return null;
  }
  return data as CustomBudget;
}

interface EffectiveLimits {
  max_cost_usd: number;
  max_tokens: number;
  alert_fraction: number;
}

async function resolveEffectiveLimits(
  tenant_slug: string,
  plan: TenantPlan,
): Promise<EffectiveLimits> {
  const custom = await getCustomBudget(tenant_slug);
  const defaults = PLAN_BUDGETS[plan];
  return {
    max_cost_usd: custom?.monthly_cap_usd ?? defaults.max_cost_usd_month,
    max_tokens: defaults.max_tokens_month,
    alert_fraction:
      custom !== null
        ? custom.alert_threshold_pct / PCT_DIVISOR
        : DEFAULT_ALERT_FRACTION,
  };
}

const warnedMonths = new Set<string>();

function monthKey(tenant: string): string {
  const d = new Date();
  return `${tenant}:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function checkBudget(
  tenant_slug: string,
  plan: TenantPlan | undefined,
): Promise<BudgetStatus> {
  const p: TenantPlan = plan ?? "startup";
  if (p === "enterprise") {
    return {
      allowed: true,
      force_cheap: false,
      warn_threshold: false,
      tokens_used: 0,
      cost_used: 0,
      plan: p,
    };
  }

  const [usage, limits] = await Promise.all([
    getTenantUsage(tenant_slug, "month"),
    resolveEffectiveLimits(tenant_slug, p),
  ]);

  const tokens_used = usage.tokens_input + usage.tokens_output;
  const cost_used = usage.cost_usd;

  const fracTok =
    limits.max_tokens === Number.POSITIVE_INFINITY
      ? 0
      : tokens_used / limits.max_tokens;
  const fracCost =
    limits.max_cost_usd === Number.POSITIVE_INFINITY
      ? 0
      : cost_used / limits.max_cost_usd;
  const frac = Math.max(fracTok, fracCost);

  const warn_threshold = frac >= limits.alert_fraction && frac < 1;
  if (warn_threshold) {
    const k = monthKey(tenant_slug);
    if (!warnedMonths.has(k)) {
      warnedMonths.add(k);
      void notifyDiscord(
        "LLM presupuesto alerta",
        `Tenant \`${tenant_slug}\` plan ${p}: ~${(frac * 100).toFixed(0)}% del mes (tokens o coste).`,
        "warning",
      ).catch(() => undefined);
    }
  }

  const allowed = frac < 1;
  const force_cheap =
    frac >= FORCE_CHEAP_COST_FRACTION || fracTok >= FORCE_CHEAP_TOKEN_FRACTION;

  return {
    allowed,
    force_cheap,
    warn_threshold,
    tokens_used,
    cost_used,
    plan: p,
  };
}
