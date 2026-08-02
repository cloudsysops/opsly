import Link from 'next/link';
import type { ReactElement } from 'react';
import { brandTagline } from '@/lib/brand';
import { poweredByStack, siteConfig } from '@/lib/site';

export function HeroSection(): ReactElement {
  return (
    <section className="relative overflow-hidden bg-hero-radial pb-8 pt-12 sm:pt-16 lg:pt-20">
      <div className="icso-container">
        <p className="text-sm font-semibold tracking-[0.2em] text-icso-cyan sm:text-base">
          {siteConfig.shortName} · {siteConfig.name}
        </p>
        <p className="icso-eyebrow mt-3">{brandTagline}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          The AI agency that runs on{' '}
          <span className="icso-gradient-text">Opsly</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-icso-muted sm:text-xl">
          {siteConfig.brandRelationship} We capture leads, automate follow-ups with
          human approval, and give owners one clear view of operations.
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
            One company · stack inside Opsly
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
            Not a patchwork of vendors — ICSO builds and operates Opsly so your stack
            stays coherent.
          </p>
        </div>
      </div>
    </section>
  );
}
