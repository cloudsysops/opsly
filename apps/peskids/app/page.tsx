import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { InstagramFeedSection } from '@/components/marketing/instagram-feed-section';
import { HeroSection } from '@/components/marketing/hero-section';
import { LevelsSection } from '@/components/marketing/levels-section';
import { PeskidsReservationLanding } from '@/components/marketing/peskids-reservation-landing';
import { PESKIDS_HOME_LANDING } from '@/lib/peskids-landing-config';

export const metadata = {
  title: 'Peskids — Academia de natación · Medellín',
  description:
    'Natación para niños de 3 meses a 15 años. Sede Llanogrande. Aprenden, se divierten, son Peskids. Solicita una clase de prueba gratuita.',
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
      <LevelsSection />
      <InstagramFeedSection />
      <SiteFooter />
    </div>
  );
}
