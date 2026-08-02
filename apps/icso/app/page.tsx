import type { ReactElement } from 'react';
import { CaseStudyCard } from '@/components/marketing/CaseStudyCard';
import { CTASection } from '@/components/marketing/CTASection';
import { FeatureCards } from '@/components/marketing/FeatureCards';
import { HeroSection } from '@/components/marketing/HeroSection';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { PricingCards } from '@/components/marketing/PricingCards';
import { SolutionGrid } from '@/components/marketing/SolutionGrid';
import { TechStackGrid } from '@/components/marketing/TechStackGrid';
import { VerticalGrid } from '@/components/marketing/VerticalGrid';
import { fetchCommercialCatalog } from '@/lib/fetch-commercial-catalog';

export default async function HomePage(): Promise<ReactElement> {
  const catalog = await fetchCommercialCatalog();

  return (
    <>
      <HeroSection />
      <FeatureCards title="Stop losing momentum to manual work" />
      <SolutionGrid catalog={catalog} />
      <VerticalGrid catalog={catalog} />
      <HowItWorks />
      <CaseStudyCard />
      <TechStackGrid />
      <PricingCards catalog={catalog} />
      <CTASection />
    </>
  );
}
