/**
 * Sincroniza el consumo de tokens IA (platform.usage_events) con Stripe
 * Usage Records para planes con precio medido (metered billing).
 *
 * Solo actúa si `STRIPE_METERED_PRICE_ID_TOKENS` está configurado.
 * Usa `action: "set"` para reportar el acumulado del período — idempotente.
 */

import type Stripe from "stripe";
import { getStripe } from "./client";
import { getServiceClient } from "../supabase/client";
import { logger } from "../logger";

// --- tipos de dependencias (inyección para tests) -------------------------

type DbClient = ReturnType<typeof getServiceClient>;
type StripeClient = ReturnType<typeof getStripe>;

export interface SyncDeps {
  db?: DbClient;
  stripe?: StripeClient;
}

// --- helpers de Supabase --------------------------------------------------

interface TenantSubRow {
  slug: string;
  stripe_subscription_id: string;
}

async function getActiveSubscribedTenants(
  db: DbClient,
): Promise<TenantSubRow[]> {
  const { data, error } = await db
    .schema("platform")
    .from("tenants")
    .select("slug, stripe_subscription_id")
    .eq("status", "active")
    .not("stripe_subscription_id", "is", null)
    .is("deleted_at", null);

  if (error) {
    logger.error("usage-sync getActiveSubscribedTenants", error);
    return [];
  }
  return (data ?? []) as TenantSubRow[];
}

async function sumTenantTokensSince(
  db: DbClient,
  slug: string,
  from: Date,
): Promise<number> {
  const { data, error } = await db
    .schema("platform")
    .from("usage_events")
    .select("tokens_input, tokens_output")
    .eq("tenant_slug", slug)
    .gte("created_at", from.toISOString());

  if (error) {
    logger.error("usage-sync sumTenantTokensSince", { slug, error });
    return 0;
  }
  type Row = { tokens_input: number; tokens_output: number };
  return ((data ?? []) as Row[]).reduce(
    (sum, r) => sum + r.tokens_input + r.tokens_output,
    0,
  );
}

// --- helpers de Stripe ---------------------------------------------------

function findMeteredItem(
  items: Stripe.SubscriptionItem[],
  priceId: string,
): Stripe.SubscriptionItem | undefined {
  return items.find((item) => item.price.id === priceId);
}

async function reportUsageRecord(
  stripe: StripeClient,
  itemId: string,
  quantity: number,
): Promise<void> {
  const timestampSec = Math.floor(Date.now() / 1_000);
  await stripe.subscriptionItems.createUsageRecord(itemId, {
    quantity,
    timestamp: timestampSec,
    action: "set",
  });
}

async function retrieveExpandedSubscription(
  stripe: StripeClient,
  subId: string,
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subId, {
    expand: ["items.data.price"],
  });
}

// --- lógica principal -----------------------------------------------------

interface TenantSyncResult {
  slug: string;
  synced: boolean;
  tokens?: number;
}

async function syncOneTenant(
  tenant: TenantSubRow,
  meteredPriceId: string,
  db: DbClient,
  stripe: StripeClient,
): Promise<TenantSyncResult> {
  let sub: Stripe.Subscription;
  try {
    sub = await retrieveExpandedSubscription(stripe, tenant.stripe_subscription_id);
  } catch (e) {
    logger.error("usage-sync retrieve subscription", {
      slug: tenant.slug,
      error: e,
    });
    throw e; // propagate so syncAllTenantsUsage collects it in errors[]
  }

  const item = findMeteredItem(sub.items.data, meteredPriceId);
  if (!item) {
    return { slug: tenant.slug, synced: false };
  }

  const MS_PER_SECOND = 1_000;
  const periodStart = new Date(sub.current_period_start * MS_PER_SECOND);
  const tokens = await sumTenantTokensSince(db, tenant.slug, periodStart);

  try {
    await reportUsageRecord(stripe, item.id, tokens);
  } catch (e) {
    logger.error("usage-sync reportUsageRecord", { slug: tenant.slug, error: e });
    return { slug: tenant.slug, synced: false };
  }

  return { slug: tenant.slug, synced: true, tokens };
}

// --- export público -------------------------------------------------------

export interface UsageSyncResult {
  tenants_synced: number;
  tenants_skipped: number;
  total_tokens: number;
  errors: string[];
}

function applyTenantResult(
  result: UsageSyncResult,
  r: TenantSyncResult,
): void {
  if (r.synced) {
    result.tenants_synced++;
    result.total_tokens += r.tokens ?? 0;
  } else {
    result.tenants_skipped++;
  }
}

export async function syncAllTenantsUsage(
  deps?: SyncDeps,
): Promise<UsageSyncResult> {
  const meteredPriceId = (
    process.env.STRIPE_METERED_PRICE_ID_TOKENS ?? ""
  ).trim();

  const result: UsageSyncResult = {
    tenants_synced: 0,
    tenants_skipped: 0,
    total_tokens: 0,
    errors: [],
  };

  if (!meteredPriceId) {
    return result;
  }

  const db = deps?.db ?? getServiceClient();
  const stripe = deps?.stripe ?? getStripe();
  const tenants = await getActiveSubscribedTenants(db);

  for (const tenant of tenants) {
    try {
      const r = await syncOneTenant(tenant, meteredPriceId, db, stripe);
      applyTenantResult(result, r);
    } catch (e) {
      result.errors.push(`${tenant.slug}: ${String(e)}`);
    }
  }

  return result;
}
