import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Database, PlanKey } from "../supabase/types";
import { getStripe } from "./client";
import { PLAN_MRR_USD } from "./plans";

export type { PlanKey } from "../supabase/types";
export { getStripe } from "./client";
export { PLAN_MRR_USD, PLAN_SERVICES } from "./plans";

export function constructWebhookEvent(
  rawBody: string,
  signature: string | null,
  secret: string,
): Stripe.Event | null {
  if (!signature) {
    return null;
  }
  try {
    return getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return null;
  }
}

export async function computeMrr(
  client: SupabaseClient<Database>,
): Promise<number> {
  const { data, error } = await client
    .schema("platform")
    .from("tenants")
    .select("plan, is_demo")
    .is("deleted_at", null)
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  let sum = 0;
  for (const row of data ?? []) {
    if (row.is_demo === true) {
      continue;
    }
    const plan = row.plan as PlanKey;
    if (plan === "demo") {
      continue;
    }
    if (plan in PLAN_MRR_USD) {
      sum += PLAN_MRR_USD[plan];
    }
  }
  return sum;
}
