import { NextResponse } from "next/server";

import { HTTP_STATUS } from "../../../../../lib/constants";
import {
    getBillingMonthBoundsUtc,
    roundUsd2,
    sumPendingRedisUsageUsd,
} from "../../../../../lib/portal-billing-summary";
import { runTrustedPortalDal } from "../../../../../lib/portal-tenant-dal";
import { BillingUsageRepository } from "../../../../../lib/repositories/billing-usage-repository";
import { getTenantContext } from "../../../../../lib/tenant-context";

/**
 * Resumen de facturación del tenant: asentado (Postgres) + pendiente (Redis) + proyección fin de mes.
 */
export async function GET(request: Request): Promise<Response> {
  const out = await runTrustedPortalDal(request, async () => {
    const { tenantId } = getTenantContext();
    const bounds = getBillingMonthBoundsUtc(new Date());
    const repo = new BillingUsageRepository();
    const { value: settled, error: dbError } =
      await repo.sumSettledTotalAmountSince(bounds.recordedAtGteIso);

    if (dbError) {
      return NextResponse.json(
        { error: "billing_summary_db_failed" },
        { status: HTTP_STATUS.INTERNAL_ERROR },
      );
    }

    const pending = await sumPendingRedisUsageUsd(tenantId);
    const currentTotalUsd = settled + pending;
    const dailyAverageUsd = currentTotalUsd / bounds.daysElapsedForRate;
    const projectedMonthEndUsd = dailyAverageUsd * bounds.daysInMonth;

    return NextResponse.json({
      period_start: bounds.periodStart,
      period_end: bounds.periodEnd,
      currency: "USD",
      settled_cost_usd: roundUsd2(settled),
      pending_cost_usd: roundUsd2(pending),
      current_total_usd: roundUsd2(currentTotalUsd),
      projected_month_end_usd: roundUsd2(projectedMonthEndUsd),
      daily_average_usd: roundUsd2(dailyAverageUsd),
    });
  });

  return out;
}
