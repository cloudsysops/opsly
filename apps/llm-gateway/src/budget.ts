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
  const limits = PLAN_BUDGETS[p];
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

  const usage = await getTenantUsage(tenant_slug, "month");
  const tokens_used = usage.tokens_input + usage.tokens_output;
  const cost_used = usage.cost_usd;

  const fracTok =
    limits.max_tokens_month === Number.POSITIVE_INFINITY
      ? 0
      : tokens_used / limits.max_tokens_month;
  const fracCost = cost_used / limits.max_cost_usd_month;
  const frac = Math.max(fracTok, fracCost);

  const warn_threshold = frac >= 0.8 && frac < 1;
  if (warn_threshold) {
    const k = monthKey(tenant_slug);
    if (!warnedMonths.has(k)) {
      warnedMonths.add(k);
      void notifyDiscord(
        "LLM presupuesto 80%",
        `Tenant \`${tenant_slug}\` plan ${p}: ~${(frac * 100).toFixed(0)}% del mes (tokens o coste).`,
        "warning",
      ).catch(() => undefined);
    }
  }

  const allowed = frac < 1;
  const force_cheap = frac >= 0.85 || fracTok >= 0.75;

  return {
    allowed,
    force_cheap,
    warn_threshold,
    tokens_used,
    cost_used,
    plan: p,
  };
}
