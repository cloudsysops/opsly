import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { platformSchema } from "./supabase-helpers.js";
import type { UsageEvent } from "./types.js";

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

function getSupabaseClient(): ReturnType<typeof createSupabaseClient> | null {
  if (supabaseClient) {
    return supabaseClient;
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  supabaseClient = createSupabaseClient(supabaseUrl, serviceRoleKey);
  return supabaseClient;
}

type UsageRow = {
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
  model: string;
};

export async function logUsage(event: UsageEvent): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }
    await platformSchema(supabase).from("usage_events").insert(event);
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
  top_model: string | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      requests: 0,
      cache_hits: 0,
      top_model: null,
    };
  }
  const now = new Date();
  const from =
    period === "today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await platformSchema(supabase)
    .from("usage_events")
    .select("tokens_input,tokens_output,cost_usd,cache_hit,model")
    .eq("tenant_slug", tenantSlug)
    .gte("created_at", from);

  const rows: UsageRow[] = (data || []) as UsageRow[];

  // Compute the most-used model
  const modelCount = new Map<string, number>();
  for (const row of rows) {
    if (row.model) {
      modelCount.set(row.model, (modelCount.get(row.model) ?? 0) + 1);
    }
  }
  let top_model: string | null = null;
  let topCount = 0;
  for (const [model, count] of modelCount) {
    if (count > topCount) {
      top_model = model;
      topCount = count;
    }
  }

  return {
    tokens_input: rows.reduce((sum, row) => sum + row.tokens_input, 0),
    tokens_output: rows.reduce((sum, row) => sum + row.tokens_output, 0),
    cost_usd: rows.reduce((sum, row) => sum + row.cost_usd, 0),
    requests: rows.length,
    cache_hits: rows.filter((row) => row.cache_hit).length,
    top_model,
  };
}
