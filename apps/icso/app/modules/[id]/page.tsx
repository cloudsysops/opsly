import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import {
  commercialCatalog,
  formatOpsPrice,
  formatSetupPrice,
  getCatalogModule,
  packagesIncludingModule,
} from '@/lib/commercial-catalog';
import { siteConfig } from '@/lib/site';

type ModulePageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams(): Array<{ id: string }> {
  return commercialCatalog.modules.map((mod) => ({ id: mod.id }));
}

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { id } = await params;
  const mod = getCatalogModule(id);
  if (!mod) {
    return { title: 'Module' };
  }
  return {
    title: `${mod.label} module`,
    description: `${mod.summary} — Opsly module sold and delivered by ${siteConfig.name}.`,
  };
}

export default async function ModulePage({ params }: ModulePageProps): Promise<ReactElement> {
  const { id } = await params;
  const mod = getCatalogModule(id);
  if (!mod) {
    notFound();
  }

  const packages = packagesIncludingModule(mod.id);
  const verticals = commercialCatalog.verticals.filter((vertical) =>
    packages.some((pkg) => pkg.id === vertical.recommended_package_id)
  );

  return (
    <section className="icso-section pt-12">
      <div className="icso-container max-w-3xl">
        <p className="icso-eyebrow">Opsly module</p>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{mod.label}</h1>
        <p className="mt-2 text-sm uppercase tracking-wide text-icso-cyan">{mod.label_es}</p>
        <p className="mt-6 text-lg text-icso-muted">{mod.summary}</p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="icso-glass-card p-4">
            <dt className="text-xs uppercase tracking-wide text-icso-muted">Risk</dt>
            <dd className="mt-1 font-semibold capitalize">{mod.risk}</dd>
          </div>
          <div className="icso-glass-card p-4">
            <dt className="text-xs uppercase tracking-wide text-icso-muted">MVP default</dt>
            <dd className="mt-1 font-semibold">{mod.mvp_default ? 'Yes — Hybrid ships with it' : 'Add-on / scale'}</dd>
          </div>
        </dl>

        <h2 className="mt-12 text-xl font-bold">Packages that include this module</h2>
        <ul className="mt-4 space-y-3">
          {packages.map((pkg) => (
            <li key={pkg.id} className="icso-glass-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{pkg.name}</p>
                <p className="text-sm text-icso-muted">
                  Setup {formatSetupPrice(pkg)} · ops {formatOpsPrice(pkg)}
                </p>
              </div>
              <Link
                href={`/contact?package=${encodeURIComponent(pkg.id)}&module=${encodeURIComponent(mod.id)}#discovery`}
                className="text-sm font-medium text-icso-cyan hover:underline"
              >
                Talk about {pkg.name}
              </Link>
            </li>
          ))}
        </ul>

        {verticals.length > 0 ? (
          <>
            <h2 className="mt-12 text-xl font-bold">Verticals that fit</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {verticals.map((vertical) => (
                <li key={vertical.id}>
                  <Link
                    href={`/contact?vertical=${encodeURIComponent(vertical.id)}&module=${encodeURIComponent(mod.id)}#discovery`}
                    className="inline-flex rounded-full border border-icso-border px-3 py-1 text-sm text-icso-muted hover:border-icso-cyan hover:text-icso-cyan"
                  >
                    {vertical.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href={`/contact?module=${encodeURIComponent(mod.id)}#discovery`}
            className="icso-btn-primary"
          >
            Ask about this module
          </Link>
          <Link href="/quote" className="icso-btn-secondary">
            Build a full SOW
          </Link>
        </div>
      </div>
    </section>
  );
}
