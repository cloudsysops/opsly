import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { CTASection } from '@/components/marketing/CTASection';
import { PricingCards } from '@/components/marketing/PricingCards';
import { SolutionGrid } from '@/components/marketing/SolutionGrid';
import { TechStackGrid } from '@/components/marketing/TechStackGrid';
import { VerticalGrid } from '@/components/marketing/VerticalGrid';
import { fetchCommercialCatalog } from '@/lib/fetch-commercial-catalog';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Services & packages',
  description: `Opsly modules and commercial packages from ${siteConfig.name}.`,
};

export default async function ServicesPage(): Promise<ReactElement> {
  const catalog = await fetchCommercialCatalog();

  return (
    <>
      <section className="icso-section pt-12">
        <div className="icso-container">
          <p className="icso-eyebrow">Services</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">
            Opsly modules — operated by ICSO
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-icso-muted">{catalog.sales_pitch_es}</p>
        </div>
      </section>
      <SolutionGrid catalog={catalog} />
      <VerticalGrid catalog={catalog} />
      <PricingCards catalog={catalog} />
      <TechStackGrid />
      <CTASection
        title="Not sure which package fits?"
        subtitle="Build a one-page SOW from the catalog, then book discovery."
      />
    </>
  );
}
