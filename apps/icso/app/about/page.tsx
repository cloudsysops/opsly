import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { CTASection } from '@/components/marketing/CTASection';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { brandTagline } from '@/lib/brand';
import { poweredByStack, siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: `About ${siteConfig.name} — AI automation agency for growing businesses.`,
};

const pillars = [
  {
    title: 'AI Intelligence',
    description: 'Agents and models that augment — not replace — your team.',
  },
  {
    title: 'Visibility',
    description: 'Dashboards and reporting leaders can trust daily.',
  },
  {
    title: 'Operability',
    description: 'Systems your staff can run without a engineering degree.',
  },
  {
    title: 'Growth',
    description: 'Programs measured on pipeline, speed, and revenue impact.',
  },
] as const;

export default function AboutPage(): ReactElement {
  return (
    <>
      <section className="icso-section pt-12">
        <div className="icso-container">
          <p className="icso-eyebrow">{brandTagline}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">
            Professional agency. Proven stack.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-icso-muted">{siteConfig.mission}</p>
          <p className="mt-4 max-w-2xl text-icso-muted">
            {siteConfig.name} ({siteConfig.shortName}) is an AI automation agency — not a
            side project. We implement the same platforms enterprises use: CRM, workflows,
            cloud, and governed AI — configured for your business.
          </p>
        </div>
      </section>
      <section className="icso-section bg-icso-surface/30">
        <div className="icso-container">
          <h2 className="text-2xl font-bold sm:text-3xl">Our pillars</h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {pillars.map((item) => (
              <li key={item.title} className="icso-glass-card p-6">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-icso-muted">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="icso-section">
        <div className="icso-container">
          <h2 className="text-2xl font-bold">Powered by</h2>
          <ul className="mt-6 flex flex-wrap gap-3">
            {poweredByStack.map((name) => (
              <li
                key={name}
                className="rounded-full border border-icso-border px-4 py-2 text-sm font-medium"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <HowItWorks />
      <CTASection />
    </>
  );
}
