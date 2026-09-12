'use client';

import useSWR from 'swr';
import {
  getAdminRevenueOverview,
  type AdminRevenueOverviewResponse,
} from '@/lib/api-client';

function moneyRows(values: Record<string, number>) {
  return Object.entries(values).sort(([a], [b]) => a.localeCompare(b));
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function MoneyGroup({
  label,
  values,
}: {
  label: string;
  values: Record<string, number>;
}) {
  const rows = moneyRows(values);
  return (
    <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      {rows.length > 0 ? (
        <div className="mt-2 space-y-1">
          {rows.map(([currency, amount]) => (
            <div key={currency} className="flex justify-between gap-3 text-xs">
              <span className="font-mono text-slate-500">{currency}</span>
              <span className="font-mono text-slate-200">{formatMoney(amount, currency)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-xs text-slate-600">No recorded value</div>
      )}
    </div>
  );
}

function flattenCommissionMetric(
  data: AdminRevenueOverviewResponse,
  key: 'expected' | 'confirmed' | 'paid' | 'receivable'
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(data.commissions_by_currency).map(([currency, values]) => [
      currency,
      values[key],
    ])
  );
}

export function RevenueOverviewPanel() {
  const { data, error, isLoading } = useSWR(
    'admin-revenue-overview',
    () => getAdminRevenueOverview(),
    { refreshInterval: 15000 }
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-emerald-500/15 bg-slate-950/70 p-4 text-xs text-slate-500">
        Loading revenue ledger…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-slate-950/70 p-4">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
          Revenue ledger unavailable
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Mission Control will not fabricate revenue. Apply the Revenue Core migration and
          connect the API before values appear here.
        </p>
      </div>
    );
  }

  const qualified =
    (data.referrals.by_status.qualified ?? 0) +
    (data.referrals.by_status.quoted ?? 0) +
    (data.referrals.by_status.booked ?? 0);

  return (
    <section className="rounded-2xl border border-emerald-500/20 bg-slate-950/75 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
            Revenue Control
          </h2>
          <p className="text-xs text-slate-500">
            Real attribution and commission ledger · currencies are never mixed.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-emerald-400">
          source: {data.source}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Partners', data.partners.active, `${data.partners.total} total`],
          ['Offers', data.offers.active, `${data.offers.total} total`],
          ['Referrals', data.referrals.total, `${qualified} qualified+`],
          ['Attributions', data.attribution.total, `${data.attribution.agent_attributed} agent-linked`],
          ['Converted', data.referrals.by_status.converted ?? 0, 'closed referrals'],
        ].map(([label, value, detail]) => (
          <div key={String(label)} className="rounded-xl border border-slate-800 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
            <div className="mt-1 font-mono text-2xl text-emerald-300">{value}</div>
            <div className="text-[10px] text-slate-600">{detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MoneyGroup label="Open pipeline" values={data.open_pipeline_by_currency} />
        <MoneyGroup label="Converted GMV" values={data.converted_gmv_by_currency} />
        <MoneyGroup label="Commission expected" values={flattenCommissionMetric(data, 'expected')} />
        <MoneyGroup label="Commission confirmed" values={flattenCommissionMetric(data, 'confirmed')} />
        <MoneyGroup label="Commission receivable" values={flattenCommissionMetric(data, 'receivable')} />
        <MoneyGroup label="Commission paid" values={flattenCommissionMetric(data, 'paid')} />
      </div>
    </section>
  );
}
