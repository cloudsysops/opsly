import Link from 'next/link';
import type { ReactElement } from 'react';
import { brandTagline } from '@/lib/brand';
import { poweredByStack } from '@/lib/site';

export function HeroSection(): ReactElement {
  return (
    <section className="relative overflow-hidden bg-hero-radial pb-8 pt-12 sm:pt-16 lg:pt-20">
      <div className="icso-container">
        <p className="icso-eyebrow">{brandTagline}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          AI Automation for{' '}
          <span className="icso-gradient-text">Growing Businesses</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-icso-muted sm:text-xl">
          We help businesses capture leads, automate follow-ups, and gain complete
          visibility into their operations.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/contact#discovery" className="icso-btn-primary">
            Book a Discovery Call
          </Link>
          <Link href="/#how-it-works" className="icso-btn-secondary">
            See How It Works
          </Link>
        </div>
        <div className="mt-14 rounded-2xl border border-icso-border bg-icso-surface/50 p-6 sm:p-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-icso-muted">
            Powered by
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-3">
            {poweredByStack.map((name) => (
              <li
                key={name}
                className="rounded-lg border border-icso-primary/30 bg-icso-primary/10 px-4 py-2 text-sm font-medium text-icso-text"
              >
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-sm text-icso-muted">
            Professional tools your team already trusts — configured and operated for you.
          </p>
        </div>
      </div>
    </section>
  );
}
