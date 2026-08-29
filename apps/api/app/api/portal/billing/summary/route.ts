import { NextResponse } from 'next/server';

import { CACHE_TTL, HTTP_STATUS } from '../../../../../lib/constants';
import {
  getBillingMonthBoundsUtc,
  roundUsd2,
  sumPendingRedisUsageUsd,
} from '../../../../../lib/portal-billing-summary';
import { runTrustedPortalDal } from '../../../../../lib/portal-tenant-dal';
import { getCache, setCache } from '../../../../../lib/redis-cache';
import { BillingUsageRepository } from '../../../../../lib/repositories/billing-usage-repository';
import { getTenantContext } from '../../../../../lib/tenant-context';

type BillingSummaryPayload = {
  period_start: string;
  period_end: string;
  currency: string;
  settled_cost_usd: number;
  pending_cost_usd: number;
  current_total_usd: number;
  projected_month_end_usd: number;
  daily_average_usd: number;
};

/**
 * Resumen de facturación del tenant: asentado (Postgres) + pendiente (Redis) + proyección fin de mes.
 *
 * Optimización Bolt: respuesta en caché Redis por tenant (`portal:billing_summary:${tenantId}`) con TTL 60s
 * para evitar consultas repetidas a Postgres y agregación de Redis metering.
 */
export async function GET(request: Request): Promise<Response> {
  const out = await runTrustedPortalDal(request, async (_session) => {
    const { tenantId } = getTenantContext();
    const cacheKey = `portal:billing_summary:${tenantId}`;

    const cached = await getCache<BillingSummaryPayload>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const bounds = getBillingMonthBoundsUtc(new Date());
    const repo = new BillingUsageRepository();
    const { value: settled, error: dbError } = await repo.sumSettledTotalAmountSince(
      bounds.recordedAtGteIso
    );

    if (dbError) {
      return NextResponse.json(
        { error: 'billing_summary_db_failed' },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    const pending = await sumPendingRedisUsageUsd(tenantId);
    const currentTotalUsd = settled + pending;
    const dailyAverageUsd = currentTotalUsd / bounds.daysElapsedForRate;
    const projectedMonthEndUsd = dailyAverageUsd * bounds.daysInMonth;

    const payload: BillingSummaryPayload = {
      period_start: bounds.periodStart,
      period_end: bounds.periodEnd,
      currency: 'USD',
      settled_cost_usd: roundUsd2(settled),
      pending_cost_usd: roundUsd2(pending),
      current_total_usd: roundUsd2(currentTotalUsd),
      projected_month_end_usd: roundUsd2(projectedMonthEndUsd),
      daily_average_usd: roundUsd2(dailyAverageUsd),
    };

    void setCache(cacheKey, payload, CACHE_TTL.SHORT);

    return NextResponse.json(payload);
  });

  return out;
}
