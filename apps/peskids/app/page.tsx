import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { CtaBand } from '@/components/marketing/cta-band';
import { HeroSection } from '@/components/marketing/hero-section';
import { PeskidsReservationLanding } from '@/components/marketing/peskids-reservation-landing';
import { PESKIDS_HOME_LANDING } from '@/lib/peskids-landing-config';

/** Avoid year-long CDN/HTML stickiness after deploys (see docs/runbooks/PESKIDS-CDN-CACHE.md). */
export const revalidate = 60;

export const metadata = {
  title: 'Peskids — Academia de natación · Medellín',
  description:
    'Natación para niños de 3 meses a 15 años. Sede Llanogrande. Aprenden, se divierten, son Peskids. Completa el formulario de solicitud y te conectamos por WhatsApp.',
};

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <HeroSection />
      <PeskidsReservationLanding
        source={PESKIDS_HOME_LANDING.source}
        campaign={PESKIDS_HOME_LANDING.campaign}
        headingLevel="h2"
      />
      <CtaBand />
      <SiteFooter />
    </div>
  );
}
