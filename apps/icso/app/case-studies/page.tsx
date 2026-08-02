import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { CaseStudyCard } from '@/components/marketing/CaseStudyCard';
import { CTASection } from '@/components/marketing/CTASection';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Case Studies',
  description: `Client outcomes and automation programs from ${siteConfig.name}.`,
};

export default function CaseStudiesPage(): ReactElement {
  return (
    <>
      <section className="icso-section pt-12">
        <div className="icso-container">
          <p className="icso-eyebrow">Case studies</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Results in production</h1>
          <p className="mt-6 max-w-2xl text-lg text-icso-muted">
            Real programs built on Opsly, Twenty CRM, n8n, and AI — with measurable
            operational impact.
          </p>
        </div>
      </section>
      <CaseStudyCard />
      <section className="icso-section">
        <div className="icso-container">
          <div className="icso-glass-card p-8 text-center">
            <h2 className="text-xl font-semibold">More case studies coming soon</h2>
            <p className="mt-2 text-sm text-icso-muted">
              We are documenting additional vertical wins — academy, contractor, healthcare,
              and agency programs.
            </p>
            <Link href="/contact" className="icso-btn-secondary mt-6 inline-flex">
              Discuss your use case
            </Link>
          </div>
        </div>
      </section>
      <CTASection />
    </>
  );
}
