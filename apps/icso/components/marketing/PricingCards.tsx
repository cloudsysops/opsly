import Link from 'next/link';
import { Check } from 'lucide-react';
import type { ReactElement } from 'react';
import {
  commercialCatalog,
  formatOpsPrice,
  formatSetupPrice,
  modulesForPackage,
} from '@/lib/commercial-catalog';

export function PricingCards(): ReactElement {
  const packages = commercialCatalog.packages.filter((pkg) => pkg.id !== 'managed-ops');
  const managed = commercialCatalog.packages.find((pkg) => pkg.id === 'managed-ops');

  return (
    <section className="icso-section bg-icso-surface/30" id="pricing">
      <div className="icso-container">
        <p className="icso-eyebrow">Packages</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Modular packages, not custom chaos
        </h2>
        <p className="mt-4 max-w-2xl text-icso-muted">
          Same Opsly modules for every client — compose by package, activate by vertical.
          Ranges are USD guidance for LATAM; final SOW on discovery.
        </p>
        <ul className="mt-12 grid gap-8 lg:grid-cols-3">
          {packages.map((tier) => {
            const mods = modulesForPackage(tier);
            return (
              <li
                key={tier.id}
                className={`icso-glass-card flex flex-col p-8 ${
                  tier.highlighted
                    ? 'border-icso-primary shadow-glow ring-1 ring-icso-primary/50'
                    : ''
                }`}
              >
                {tier.highlighted ? (
                  <span className="mb-4 inline-flex w-fit rounded-full bg-icso-primary/20 px-3 py-1 text-xs font-semibold text-icso-cyan">
                    Recommended
                  </span>
                ) : null}
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <p className="mt-2 text-sm text-icso-muted">{tier.ideal_for}</p>
                <p className="mt-6 text-3xl font-bold">
                  {formatSetupPrice(tier)}
                  <span className="block text-base font-normal text-icso-muted">
                    setup · ops {formatOpsPrice(tier)}
                  </span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {tier.includes.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-icso-muted">
                      <Check className="h-5 w-5 shrink-0 text-icso-success" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                {mods.length > 0 ? (
                  <p className="mt-4 text-xs text-icso-muted">
                    Modules:{' '}
                    {mods.map((m) => m.label).join(' · ')}
                  </p>
                ) : null}
                <Link
                  href={`/contact?package=${encodeURIComponent(tier.id)}#discovery`}
                  className={`mt-8 text-center ${
                    tier.highlighted ? 'icso-btn-primary' : 'icso-btn-secondary'
                  }`}
                >
                  Talk about {tier.name}
                </Link>
              </li>
            );
          })}
        </ul>
        {managed ? (
          <p className="mt-10 text-center text-sm text-icso-muted">
            Need hands-off ops?{' '}
            <Link
              href={`/contact?package=${encodeURIComponent(managed.id)}#discovery`}
              className="font-medium text-icso-cyan hover:underline"
            >
              {managed.name}
            </Link>{' '}
            — {formatOpsPrice(managed)}.
          </p>
        ) : null}
        <p className="mt-4 text-center text-xs text-icso-muted">{commercialCatalog.disclaimer}</p>
      </div>
    </section>
  );
}
