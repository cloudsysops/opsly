import { getServiceClient } from '../supabase';
import type {
  BillingPlanRow,
  BillingSubscriptionRow,
  CreateSubscriptionInput,
  MeteringEventRow,
  ReportMeteringEventInput,
} from './subscription-types';

const ISO_MONTH_PAD_LENGTH = 2;
const DATE_SLICE_LENGTH = 10;

type BillingPlanPricing = {
  monthly_price_cents: number;
  yearly_price_cents: number;
  currency: string;
};

// ─── Plans ───────────────────────────────────────────────────

export async function listBillingPlans(): Promise<BillingPlanRow[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('monthly_price_cents', { ascending: true });

  if (error) {
    throw new Error(`Failed to list plans: ${error.message}`);
  }
  return (data ?? []) as BillingPlanRow[];
}

// ─── Subscriptions ───────────────────────────────────────────

export async function getSubscriptionForTenant(
  tenantId: string
): Promise<BillingSubscriptionRow | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('billing_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }
  return (data as BillingSubscriptionRow) ?? null;
}

export async function createSubscription(
  tenantId: string,
  input: CreateSubscriptionInput
): Promise<BillingSubscriptionRow> {
  const db = getServiceClient();
  const typedPlan = await fetchBillingPlan(db, input.plan_id);
  const amountCents = resolveAmountCents(input.billing_period, typedPlan);
  const now = new Date();
  const periodEnd = calculatePeriodEnd(now, input.billing_period);

  const { data, error } = await db
    .schema('platform')
    .from('billing_subscriptions')
    .insert({
      tenant_id: tenantId,
      plan_id: input.plan_id,
      billing_period: input.billing_period,
      amount_cents: amountCents,
      currency: typedPlan.currency,
      stripe_customer_id: input.stripe_customer_id ?? null,
      current_period_start: now.toISOString().slice(0, DATE_SLICE_LENGTH),
      current_period_end: periodEnd.toISOString().slice(0, DATE_SLICE_LENGTH),
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Tenant already has a subscription');
    }
    throw new Error(`Failed to create subscription: ${error.message}`);
  }

  return data as BillingSubscriptionRow;
}

export async function cancelSubscription(tenantId: string): Promise<BillingSubscriptionRow | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('billing_subscriptions')
    .update({
      status: 'cancelled',
      auto_renew: false,
      cancelled_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
  return (data as BillingSubscriptionRow) ?? null;
}

// ─── Metering Events ─────────────────────────────────────────

export async function reportMeteringEvent(
  tenantId: string,
  input: ReportMeteringEventInput
): Promise<MeteringEventRow> {
  const db = getServiceClient();
  const periodMonth = formatCurrentPeriodMonth(new Date());

  const { data, error } = await db
    .schema('platform')
    .from('metering_events')
    .insert({
      tenant_id: tenantId,
      metric_type: input.metric_type,
      quantity: input.quantity,
      period_month: periodMonth,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to report metering event: ${error.message}`);
  }
  return data as MeteringEventRow;
}

export async function getMeteringUsage(
  tenantId: string,
  periodMonth?: string
): Promise<{ metric_type: string; total_quantity: number }[]> {
  const db = getServiceClient();
  const targetMonth = periodMonth ?? formatCurrentPeriodMonth(new Date());

  const { data, error } = await db
    .schema('platform')
    .from('metering_events')
    .select('metric_type, quantity')
    .eq('tenant_id', tenantId)
    .eq('period_month', targetMonth);

  if (error) {
    throw new Error(`Failed to fetch metering usage: ${error.message}`);
  }

  const agg = new Map<string, number>();
  for (const row of (data ?? []) as { metric_type: string; quantity: number }[]) {
    agg.set(row.metric_type, (agg.get(row.metric_type) ?? 0) + row.quantity);
  }

  return Array.from(agg.entries()).map(([metric_type, total_quantity]) => ({
    metric_type,
    total_quantity,
  }));
}

async function fetchBillingPlan(
  db: ReturnType<typeof getServiceClient>,
  planId: string
): Promise<BillingPlanPricing> {
  const { data: plan, error: planError } = await db
    .schema('platform')
    .from('billing_plans')
    .select('monthly_price_cents, yearly_price_cents, currency')
    .eq('id', planId)
    .single();

  if (planError || !plan) {
    throw new Error('Plan not found');
  }

  return plan as BillingPlanPricing;
}

function resolveAmountCents(
  period: CreateSubscriptionInput['billing_period'],
  plan: BillingPlanPricing
): number {
  return period === 'yearly' ? plan.yearly_price_cents : plan.monthly_price_cents;
}

function calculatePeriodEnd(now: Date, period: CreateSubscriptionInput['billing_period']): Date {
  const periodEnd = new Date(now);
  if (period === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    return periodEnd;
  }
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  return periodEnd;
}

function formatCurrentPeriodMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(ISO_MONTH_PAD_LENGTH, '0')}-01`;
}
