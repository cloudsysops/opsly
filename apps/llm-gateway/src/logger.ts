import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { UsageEvent } from "./types.js";

const supabase = createSupabaseClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

type UsageRow = {
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
};

export async function logUsage(event: UsageEvent): Promise<void> {
  try {
    await supabase.schema("platform").from("usage_events").insert(event);
  } catch (error) {
    console.error("[llm-gateway] Error logging usage:", error);
  }
}

export async function getTenantUsage(
  tenantSlug: string,
  period: "today" | "month" = "today",
): Promise<{
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  requests: number;
  cache_hits: number;
}> {
  const now = new Date();
  const from =
    period === "today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await supabase
    .schema("platform")
    .from("usage_events")
    .select("tokens_input,tokens_output,cost_usd,cache_hit")
    .eq("tenant_slug", tenantSlug)
    .gte("created_at", from);

  const rows: UsageRow[] = (data || []) as UsageRow[];

  return {
    tokens_input: rows.reduce((sum, row) => sum + row.tokens_input, 0),
    tokens_output: rows.reduce((sum, row) => sum + row.tokens_output, 0),
    cost_usd: rows.reduce((sum, row) => sum + row.cost_usd, 0),
    requests: rows.length,
    cache_hits: rows.filter((row) => row.cache_hit).length,
  };
}
