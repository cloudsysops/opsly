import Link from 'next/link';
import type { ReactElement } from 'react';
import { getCatalogPackage, type CommercialCatalog } from '@/lib/commercial-catalog';

const statusLabel: Record<string, string> = {
  live: 'Live reference',
  ready: 'Ready to sell',
  blueprint: 'Blueprint',
};

export function VerticalGrid({ catalog }: { catalog: CommercialCatalog }): ReactElement {
  return (
    <section className="icso-section" id="verticals">
      <div className="icso-container">
        <p className="icso-eyebrow">Verticals</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Industries we can stand up in days
        </h2>
        <p className="mt-4 max-w-2xl text-icso-muted">
          Clone a vertical blueprint → launch contract → bootstrap. Peskids proves the
          academy path; WhatsApp-first covers agency intake.
        </p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.verticals.map((vertical) => {
            const pkg = getCatalogPackage(catalog, vertical.recommended_package_id);
            return (
              <li
                key={vertical.id}
                className="icso-glass-card flex flex-col border-icso-border/60 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-icso-text">{vertical.label}</h3>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-icso-cyan">
                    {statusLabel[vertical.status] ?? vertical.status}
                  </span>
                </div>
                {vertical.reference_tenant ? (
                  <p className="mt-2 text-xs text-icso-muted">
                    Reference: <code className="text-icso-text">{vertical.reference_tenant}</code>
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-icso-muted">No live reference yet — blueprint ready</p>
                )}
                {pkg ? (
                  <p className="mt-3 text-sm text-icso-muted">
                    Start with <span className="text-icso-text">{pkg.name}</span>
                  </p>
                ) : null}
                <Link
                  href={`/contact?vertical=${encodeURIComponent(vertical.id)}${
                    pkg ? `&package=${encodeURIComponent(pkg.id)}` : ''
                  }#discovery`}
                  className="mt-4 text-sm font-medium text-icso-cyan hover:underline"
                >
                  Pitch this vertical →
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
