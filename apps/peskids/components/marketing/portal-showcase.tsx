import { PeskidsWave } from '@/components/brand/peskids-logo';
import { peskidsColorTokens } from '@/lib/tokens';
import { PortalShowcaseHero } from './portal-showcase-hero';
import { PortalShowcaseFeatures } from './portal-showcase-features';
import { PortalShowcaseTestimonials } from './portal-showcase-testimonials';
import { PortalShowcaseCTA } from './portal-showcase-cta';

export function PortalShowcase(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-pk-bg pb-16 pt-14 sm:pt-20">
      <PeskidsWave
        color={`${peskidsColorTokens.primary.teal}14`}
        height={72}
        className="absolute left-0 right-0 top-0"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <PortalShowcaseHero />
          <PortalShowcaseTestimonials />
        </div>

        <div className="mt-14">
          <PortalShowcaseFeatures />
        </div>

        <PortalShowcaseCTA />
      </div>
    </section>
  );
}
