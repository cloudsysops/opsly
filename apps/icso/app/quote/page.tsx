import type { Metadata } from 'next';
import { Suspense, type ReactElement } from 'react';
import { QuoteBuilder } from '@/components/marketing/QuoteBuilder';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Build a quote',
  description: `One-page Opsly SOW builder from ${siteConfig.name} — packages, modules, and verticals.`,
};

function QuoteFallback(): ReactElement {
  return (
    <div className="mt-10 h-96 animate-pulse rounded-lg border border-icso-border bg-white/5" />
  );
}

export default function QuotePage(): ReactElement {
  return (
    <section className="icso-section pt-12">
      <div className="icso-container">
        <p className="icso-eyebrow">Sales kit</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">
          Build a one-page SOW in seconds
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-icso-muted">
          Pick a package and optional vertical. Copy the brief for a call, email it, or continue to
          discovery — same Opsly catalog ICSO sells every time.
        </p>
        <Suspense fallback={<QuoteFallback />}>
          <QuoteBuilder />
        </Suspense>
      </div>
    </section>
  );
}
