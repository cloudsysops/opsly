import type { ReactElement } from 'react';
import { McCard, McEmpty, McPageHeader } from '@/components/mission-control/mc-ui';
import { commercialCatalog } from '@/lib/commercial-catalog';

export default function MissionControlCatalogPage(): ReactElement {
  const catalog = commercialCatalog;

  return (
    <div className="space-y-6">
      <McPageHeader
        title="Catálogo comercial"
        subtitle="Paquetes y verticales ICSO · confianza ESTIMADO (rangos USD orientativos, no factura)."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {catalog.packages.map((pkg) => (
          <McCard key={pkg.id}>
            <p className="font-semibold text-slate-100">{pkg.name_es || pkg.name}</p>
            <p className="mt-1 text-xs text-slate-400">{pkg.ideal_for}</p>
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              setup{' '}
              {pkg.setup_range_usd
                ? `$${pkg.setup_range_usd.min}–$${pkg.setup_range_usd.max}`
                : '—'}{' '}
              · ops{' '}
              {pkg.ops_monthly_usd
                ? `$${pkg.ops_monthly_usd.min}–$${pkg.ops_monthly_usd.max}/mo`
                : '—'}{' '}
              · ESTIMADO
            </p>
          </McCard>
        ))}
      </div>
      {catalog.packages.length === 0 ? (
        <McEmpty title="Catálogo vacío" description="Revisa content/commercial-catalog.json." />
      ) : null}
      <h2 className="text-sm font-semibold text-slate-200">Verticales clonables</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.verticals.map((v) => (
          <McCard key={v.id}>
            <p className="text-sm font-medium">{v.label}</p>
            <p className="mt-1 font-mono text-[10px] text-slate-500">
              {v.id} · {v.status} · ref {v.reference_tenant ?? '—'}
            </p>
          </McCard>
        ))}
      </div>
    </div>
  );
}
