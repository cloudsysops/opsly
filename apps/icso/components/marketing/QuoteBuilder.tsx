'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  buildDiscoveryMailto,
  buildPackageSow,
  type CommercialCatalog,
} from '@/lib/commercial-catalog';
import { siteConfig } from '@/lib/site';

export function QuoteBuilder({ catalog }: { catalog: CommercialCatalog }): ReactElement {
  const searchParams = useSearchParams();
  const defaultPackage =
    searchParams.get('package') ??
    catalog.packages.find((pkg) => pkg.highlighted)?.id ??
    catalog.packages[0]?.id ??
    '';
  const defaultVertical = searchParams.get('vertical') ?? '';
  const [packageId, setPackageId] = useState(defaultPackage);
  const [verticalId, setVerticalId] = useState(defaultVertical);
  const [copied, setCopied] = useState(false);

  const sow = useMemo(
    () => (packageId ? buildPackageSow(catalog, packageId, verticalId || null) : null),
    [catalog, packageId, verticalId]
  );

  async function handleCopy(): Promise<void> {
    if (!sow) {
      return;
    }
    await navigator.clipboard.writeText(sow.plainText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <aside className="space-y-6">
        <div>
          <label htmlFor="quote-package" className="block text-sm font-medium text-icso-text">
            Package
          </label>
          <select
            id="quote-package"
            value={packageId}
            onChange={(event) => setPackageId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-icso-border bg-white/5 px-4 py-3 text-sm text-icso-text focus:border-icso-primary focus:outline-none focus:ring-1 focus:ring-icso-primary"
          >
            {catalog.packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quote-vertical" className="block text-sm font-medium text-icso-text">
            Vertical (optional)
          </label>
          <select
            id="quote-vertical"
            value={verticalId}
            onChange={(event) => setVerticalId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-icso-border bg-white/5 px-4 py-3 text-sm text-icso-text focus:border-icso-primary focus:outline-none focus:ring-1 focus:ring-icso-primary"
          >
            <option value="">General / not chosen yet</option>
            {catalog.verticals.map((vertical) => (
              <option key={vertical.id} value={vertical.id}>
                {vertical.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => void handleCopy()} className="icso-btn-primary">
            {copied ? 'Copied' : 'Copy SOW'}
          </button>
          {sow ? (
            <>
              <a
                href={buildDiscoveryMailto(catalog, {
                  to: siteConfig.contactEmail,
                  packageId,
                  verticalId: verticalId || null,
                })}
                className="icso-btn-secondary text-center"
              >
                Email this brief
              </a>
              <Link
                href={`/contact?package=${encodeURIComponent(packageId)}${
                  verticalId ? `&vertical=${encodeURIComponent(verticalId)}` : ''
                }#discovery`}
                className="text-center text-sm font-medium text-icso-cyan hover:underline"
              >
                Continue to discovery form
              </Link>
            </>
          ) : null}
        </div>
      </aside>

      <article className="icso-glass-card space-y-6 p-8">
        {sow ? (
          <>
            <header>
              <p className="icso-eyebrow">One-page SOW</p>
              <h2 className="mt-2 text-2xl font-bold">
                {sow.packageName}{' '}
                <span className="text-base font-normal text-icso-muted">({sow.packageNameEs})</span>
              </h2>
              {sow.verticalLabel ? (
                <p className="mt-2 text-sm text-icso-cyan">Vertical: {sow.verticalLabel}</p>
              ) : null}
              <p className="mt-4 text-lg font-semibold">
                Setup {sow.setupPrice}
                <span className="ml-2 text-sm font-normal text-icso-muted">
                  · ops {sow.opsPrice}
                </span>
              </p>
            </header>

            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-icso-muted">
                Modules
              </h3>
              <ul className="mt-3 space-y-2">
                {sow.modules.map((mod) => (
                  <li key={mod.id} className="text-sm text-icso-text">
                    <Link
                      href={`/modules/${encodeURIComponent(mod.id)}`}
                      className="font-medium text-icso-cyan hover:underline"
                    >
                      {mod.label}
                    </Link>
                    <span className="text-icso-muted"> — {mod.summary}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-icso-muted">
                  Includes
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-icso-muted">
                  {sow.includes.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-icso-muted">
                  Excludes
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-icso-muted">
                  {sow.excludes.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <p className="text-sm text-icso-muted">{sow.pitch}</p>
            <p className="text-xs text-icso-muted">{sow.disclaimer}</p>
          </>
        ) : (
          <p className="text-icso-muted">Select a package to generate the SOW.</p>
        )}
      </article>
    </div>
  );
}
