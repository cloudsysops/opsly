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
            One company. Agency + operating system.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-icso-muted">{siteConfig.mission}</p>
          <p className="mt-4 max-w-2xl text-icso-muted">
            {siteConfig.brandRelationship} When you hire {siteConfig.shortName}, you are
            not buying a random SaaS and a separate consultancy — you get the team that
            owns Opsly end to end: sell, implement, govern AI, and run day-to-day ops.
          </p>
          <dl className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="icso-glass-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-icso-cyan">
                ICSO · IntCloud SysOps
              </dt>
              <dd className="mt-2 text-sm text-icso-muted">
                The AI agency: discovery, delivery, sales, and continuous operation for
                every client vertical.
              </dd>
            </div>
            <div className="icso-glass-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-icso-cyan">
                Opsly
              </dt>
              <dd className="mt-2 text-sm text-icso-muted">
                Our multi-tenant OS inside ICSO: reusable modules, tenant stacks, CRM,
                workflows, and governed agents — one control plane.
              </dd>
            </div>
          </dl>
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
          <h2 className="text-2xl font-bold">Stack inside Opsly</h2>
          <p className="mt-3 max-w-2xl text-sm text-icso-muted">
            Layers of the same ICSO platform — not an agency bolted onto someone else&apos;s
            product.
          </p>
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
