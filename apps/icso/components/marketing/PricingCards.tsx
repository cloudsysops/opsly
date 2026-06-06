import Link from 'next/link';
import { Check } from 'lucide-react';
import type { ReactElement } from 'react';
import { pricingTiers } from '@/lib/site';

export function PricingCards(): ReactElement {
  return (
    <section className="icso-section bg-icso-surface/30" id="pricing">
      <div className="icso-container">
        <p className="icso-eyebrow">Pricing</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Plans that scale with you</h2>
        <p className="mt-4 max-w-2xl text-icso-muted">
          Placeholder pricing for positioning — final packages confirmed on discovery call.
        </p>
        <ul className="mt-12 grid gap-8 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <li
              key={tier.name}
              className={`icso-glass-card flex flex-col p-8 ${
                tier.highlighted
                  ? 'border-icso-primary shadow-glow ring-1 ring-icso-primary/50'
                  : ''
              }`}
            >
              {tier.highlighted ? (
                <span className="mb-4 inline-flex w-fit rounded-full bg-icso-primary/20 px-3 py-1 text-xs font-semibold text-icso-cyan">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-xl font-bold">{tier.name}</h3>
              <p className="mt-2 text-sm text-icso-muted">{tier.description}</p>
              <p className="mt-6 text-4xl font-bold">
                {tier.price}
                <span className="text-base font-normal text-icso-muted">{tier.period}</span>
              </p>
              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-icso-muted">
                    <Check className="h-5 w-5 shrink-0 text-icso-success" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact#discovery"
                className={`mt-8 text-center ${
                  tier.highlighted ? 'icso-btn-primary' : 'icso-btn-secondary'
                }`}
              >
                Get started
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
