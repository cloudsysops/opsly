'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  MoonCard,
  MoonConfidenceBadge,
  MoonEmptyState,
  MoonErrorState,
  MoonPageHeader,
  MoonSkeleton,
} from '@/components/moon/primitives';
import { getAdminCosts } from '@/lib/api-client';
import type { CostLineItem } from '@/lib/types';

function linesFromRecord(record: Record<string, CostLineItem>): CostLineItem[] {
  return Object.values(record);
}

export default function MoonCostsPage(): React.ReactElement {
  const { data, error, isLoading } = useSWR('moon-costs-page', () => getAdminCosts(), {
    revalidateOnFocus: false,
  });
  const lines = data
    ? [...linesFromRecord(data.current), ...linesFromRecord(data.proposed)]
    : [];

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Costos"
        subtitle="Catálogo /api/admin/costs. Cifras de catálogo = ESTIMADO hasta factura proveedor."
        actions={
          <Link href="/costs" className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs">
            Legacy /costs
          </Link>
        }
      />
      {isLoading ? <MoonSkeleton className="h-32" /> : null}
      {error ? <MoonErrorState message={String(error.message)} /> : null}
      {!isLoading && !error && !data ? (
        <MoonEmptyState title="Costos no configurados" description="Falta respuesta de /api/admin/costs." />
      ) : null}
      {data ? (
        <div className="space-y-3">
          <MoonCard className="space-y-2 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <MoonConfidenceBadge confidence="ESTIMADO" />
              <span className="text-slate-400">lastUpdated {data.lastUpdated || '—'}</span>
            </div>
            <p className="font-mono text-xs text-slate-400">
              currentMonthly ${data.summary.currentMonthly} · proposedMonthly $
              {data.summary.proposedMonthly} · savings ${data.summary.potentialSavings}
            </p>
          </MoonCard>
          {lines.length === 0 ? (
            <MoonEmptyState title="Catálogo vacío" description="current/proposed sin líneas." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {lines.slice(0, 16).map((item) => (
                <MoonCard key={`${item.name}-${item.status}`} className="p-4">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm text-slate-100">{item.name}</p>
                    <MoonConfidenceBadge confidence="ESTIMADO" />
                  </div>
                  <p className="mt-2 font-mono text-lg">
                    ${item.cost}
                    <span className="ml-1 text-xs text-slate-500">/{item.period}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">{item.status}</p>
                </MoonCard>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
