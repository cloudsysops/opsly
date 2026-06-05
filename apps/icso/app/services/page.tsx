import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { CTASection } from '@/components/marketing/CTASection';
import { SolutionGrid } from '@/components/marketing/SolutionGrid';
import { TechStackGrid } from '@/components/marketing/TechStackGrid';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Services',
  description: `CRM automation, AI agents, workflows, and cloud consulting from ${siteConfig.name}.`,
};

export default function ServicesPage(): ReactElement {
  return (
    <>
      <section className="icso-section pt-12">
        <div className="icso-container">
          <p className="icso-eyebrow">Services</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">
            Growth operations, delivered as a service
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-icso-muted">
            We design, implement, and operate automation programs on proven platforms —
            so your team focuses on customers, not tooling.
          </p>
        </div>
      </section>
      <SolutionGrid />
      <TechStackGrid />
      <CTASection
        title="Not sure which service fits?"
        subtitle="Tell us where leads stall and we will recommend a phased automation roadmap."
      />
    </>
  );
}
