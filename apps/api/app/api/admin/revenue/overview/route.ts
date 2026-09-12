import { summarizeCommissionEvents } from '@intcloudsysops/revenue-core';
import { requireAdminAccess } from '../../../../../lib/auth';
import { getServiceClient } from '../../../../../lib/supabase';

export const dynamic = 'force-dynamic';

type MoneyMap = Record<string, number>;

type ReferralRow = {
  status?: unknown;
  gross_value?: unknown;
  currency?: unknown;
};

type CommissionRow = {
  event_type?: unknown;
  amount?: unknown;
  currency?: unknown;
};

type PayoutRow = {
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
};

type AttributionRow = {
  agent_task_request_id?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function addMoney(target: MoneyMap, currency: string, amount: number): void {
  target[currency] = Number(((target[currency] ?? 0) + amount).toFixed(2));
}

async function resolveTenantId(tenantSlug: string | null): Promise<string | null> {
  if (!tenantSlug) return null;
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .maybeSingle();

  if (error) throw error;
  const id = data && typeof data.id === 'string' ? data.id : null;
  if (!id) throw new Error(`tenant not found: ${tenantSlug}`);
  return id;
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const tenantSlug = url.searchParams.get('tenant_slug')?.trim() || null;

  try {
    const tenantId = await resolveTenantId(tenantSlug);
    const db = getServiceClient().schema('platform');

    const partnerQuery = db.from('revenue_partners').select('status');
    const offerQuery = db.from('revenue_offers').select('status');
    const referralQuery = db.from('revenue_referrals').select('status,gross_value,currency');
    const commissionQuery = db
      .from('revenue_commission_events')
      .select('event_type,amount,currency');
    const payoutQuery = db.from('revenue_payouts').select('status,amount,currency');
    const attributionQuery = db
      .from('revenue_attributions')
      .select('agent_task_request_id');

    if (tenantId) {
      partnerQuery.eq('tenant_id', tenantId);
      offerQuery.eq('tenant_id', tenantId);
      referralQuery.eq('tenant_id', tenantId);
      commissionQuery.eq('tenant_id', tenantId);
      payoutQuery.eq('tenant_id', tenantId);
      attributionQuery.eq('tenant_id', tenantId);
    }

    const [partnersRes, offersRes, referralsRes, commissionsRes, payoutsRes, attributionsRes] =
      await Promise.all([
        partnerQuery,
        offerQuery,
        referralQuery,
        commissionQuery,
        payoutQuery,
        attributionQuery,
      ]);

    for (const result of [
      partnersRes,
      offersRes,
      referralsRes,
      commissionsRes,
      payoutsRes,
      attributionsRes,
    ]) {
      if (result.error) throw result.error;
    }

    const partners = (partnersRes.data ?? []) as Array<Record<string, unknown>>;
    const offers = (offersRes.data ?? []) as Array<Record<string, unknown>>;
    const referrals = (referralsRes.data ?? []) as ReferralRow[];
    const commissions = (commissionsRes.data ?? []) as CommissionRow[];
    const payouts = (payoutsRes.data ?? []) as PayoutRow[];
    const attributions = (attributionsRes.data ?? []) as AttributionRow[];

    const referralsByStatus: Record<string, number> = {};
    const openPipelineByCurrency: MoneyMap = {};
    const convertedGmvByCurrency: MoneyMap = {};

    for (const row of referrals) {
      const status = asString(row.status) ?? 'unknown';
      referralsByStatus[status] = (referralsByStatus[status] ?? 0) + 1;
      const amount = asNumber(row.gross_value);
      const currency = asString(row.currency) ?? 'USD';
      if (amount === null) continue;
      if (['referred', 'qualified', 'quoted', 'booked'].includes(status)) {
        addMoney(openPipelineByCurrency, currency, amount);
      }
      if (status === 'converted') addMoney(convertedGmvByCurrency, currency, amount);
    }

    const commissionByCurrency: Record<
      string,
      { expected: number; confirmed: number; paid: number; receivable: number }
    > = {};

    const currencies = new Set(
      commissions.map((row) => asString(row.currency) ?? 'USD')
    );
    for (const currency of currencies) {
      const normalized = commissions
        .filter((row) => (asString(row.currency) ?? 'USD') === currency)
        .map((row) => ({
          event_type: asString(row.event_type) as
            | 'estimated'
            | 'confirmed'
            | 'adjusted'
            | 'reversed'
            | 'paid',
          amount: asNumber(row.amount) ?? 0,
        }))
        .filter((row) =>
          ['estimated', 'confirmed', 'adjusted', 'reversed', 'paid'].includes(row.event_type)
        );
      commissionByCurrency[currency] = summarizeCommissionEvents(normalized);
    }

    const payoutsByCurrency: Record<
      string,
      { expected: number; pending: number; received: number; disputed: number }
    > = {};
    for (const row of payouts) {
      const currency = asString(row.currency) ?? 'USD';
      const status = asString(row.status) ?? 'expected';
      const amount = asNumber(row.amount) ?? 0;
      payoutsByCurrency[currency] ??= { expected: 0, pending: 0, received: 0, disputed: 0 };
      if (status in payoutsByCurrency[currency]) {
        const key = status as 'expected' | 'pending' | 'received' | 'disputed';
        payoutsByCurrency[currency][key] = Number(
          (payoutsByCurrency[currency][key] + amount).toFixed(2)
        );
      }
    }

    return Response.json({
      generated_at: new Date().toISOString(),
      tenant_slug: tenantSlug,
      source: 'platform.revenue_*',
      partners: {
        total: partners.length,
        active: partners.filter((row) => row.status === 'active').length,
      },
      offers: {
        total: offers.length,
        active: offers.filter((row) => row.status === 'active').length,
      },
      referrals: {
        total: referrals.length,
        by_status: referralsByStatus,
      },
      attribution: {
        total: attributions.length,
        agent_attributed: attributions.filter(
          (row) => asString(row.agent_task_request_id) !== null
        ).length,
      },
      open_pipeline_by_currency: openPipelineByCurrency,
      converted_gmv_by_currency: convertedGmvByCurrency,
      commissions_by_currency: commissionByCurrency,
      payouts_by_currency: payoutsByCurrency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        error: 'revenue_ledger_unavailable',
        detail: message,
        generated_at: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
