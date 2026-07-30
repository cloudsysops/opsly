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

export default function HomePage(): ReactElement {
  return (
    <>
      <HeroSection />
      <FeatureCards title="Stop losing momentum to manual work" />
      <SolutionGrid />
      <VerticalGrid />
      <HowItWorks />
      <CaseStudyCard />
      <TechStackGrid />
      <PricingCards />
      <CTASection />
    </>
  );
}
