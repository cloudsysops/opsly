/**
 * Unify Migration — syncs legacy platform.subscriptions rows
 * to platform.billing_subscriptions where missing.
 *
 * Run once after deploying the unified webhook to backfill
 * any existing subscription records.
 */

import { getServiceClient } from '../supabase';
import { logger } from '../logger';

interface LegacySubscription {
  id: string;
  tenant_id: string;
  stripe_status: string;
  current_period_end: string | null;
  plan: string | null;
  created_at: string;
}

interface BillingSubscriptionCheck {
  id: string;
}

const PLAN_TO_BILLING_PLAN: Record<string, string> = {
  startup: 'opsly-basic',
  business: 'opsly-pro',
  enterprise: 'opsly-enterprise',
  demo: 'opsly-basic',
};

function mapStatus(stripeStatus: string): string {
  const mapping: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    cancelled: 'cancelled',
    trialing: 'trialing',
    paused: 'paused',
    incomplete: 'past_due',
    incomplete_expired: 'cancelled',
  };
  return mapping[stripeStatus] ?? 'active';
}

export interface UnifyMigrationResult {
  totalLegacySubscriptions: number;
  alreadyMigrated: number;
  newlyMigrated: number;
  errors: number;
  details: string[];
}

export async function runUnifyMigration(): Promise<UnifyMigrationResult> {
  const db = getServiceClient();
  const result: UnifyMigrationResult = {
    totalLegacySubscriptions: 0,
    alreadyMigrated: 0,
    newlyMigrated: 0,
    errors: 0,
    details: [],
  };

  const { data: legacyRows, error: fetchError } = await db
    .schema('platform')
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    const msg = `Failed to fetch legacy subscriptions: ${fetchError.message}`;
    logger.error('unify.fetch_legacy', fetchError);
    result.errors += 1;
    result.details.push(msg);
    return result;
  }

  const rows = (legacyRows ?? []) as LegacySubscription[];
  result.totalLegacySubscriptions = rows.length;
  result.details.push(`Found ${rows.length} legacy subscription(s)`);

  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.tenant_id)) continue;
    seen.add(row.tenant_id);

    try {
      const { data: existing } = (await db
        .schema('platform')
        .from('billing_subscriptions')
        .select('id')
        .eq('tenant_id', row.tenant_id)
        .maybeSingle()) as { data: BillingSubscriptionCheck | null; error: unknown };

      if (existing) {
        result.alreadyMigrated += 1;
        continue;
      }

      const { tenant_id, stripe_status, current_period_end, plan } = row;

      const { data: tenant } = (await db
        .schema('platform')
        .from('tenants')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('id', tenant_id)
        .maybeSingle()) as {
        data: { stripe_customer_id: string | null; stripe_subscription_id: string | null } | null;
        error: unknown;
      };

      const planId =
        plan && PLAN_TO_BILLING_PLAN[plan] ? PLAN_TO_BILLING_PLAN[plan] : 'opsly-basic';

      const { error: insertError } = await db
        .schema('platform')
        .from('billing_subscriptions')
        .insert({
          tenant_id,
          plan_id: planId,
          stripe_subscription_id: tenant?.stripe_subscription_id ?? null,
          stripe_customer_id: tenant?.stripe_customer_id ?? null,
          status: mapStatus(stripe_status),
          billing_period: 'monthly',
          amount_cents: 0,
          currency: 'USD',
          current_period_end: current_period_end ? current_period_end.slice(0, 10) : null,
          current_period_start: null,
          auto_renew: stripe_status === 'active',
        });

      if (insertError) {
        if (insertError.code === '23505') {
          result.alreadyMigrated += 1;
          continue;
        }
        logger.error('unify.insert_error', { tenant_id, error: insertError });
        result.errors += 1;
        result.details.push(`Insert error for tenant ${tenant_id}: ${insertError.message}`);
      } else {
        result.newlyMigrated += 1;
        result.details.push(
          `Migrated tenant ${tenant_id} → plan ${planId} (status: ${stripe_status})`
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error('unify.row_error', { tenant_id: row.tenant_id, error: msg });
      result.errors += 1;
      result.details.push(`Error processing tenant ${row.tenant_id}: ${msg}`);
    }
  }

  result.details.push(
    `Migration complete: ${result.newlyMigrated} new, ${result.alreadyMigrated} already present, ${result.errors} error(s)`
  );

  return result;
}
