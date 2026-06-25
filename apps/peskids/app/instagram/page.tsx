import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CtaBand } from '@/components/marketing/cta-band';
import { PeskidsReservationLanding } from '@/components/marketing/peskids-reservation-landing';
import { PESKIDS_INSTAGRAM_LANDING } from '@/lib/peskids-landing-config';

export const metadata = {
  title: 'Clase de prueba gratis | Peskids',
  description:
    'Reserva una clase de prueba gratis en Peskids. Natación en Llanogrande o a domicilio en el área metropolitana de Medellín.',
  openGraph: {
    title: 'Clase de prueba gratis',
    description:
      'Déjanos tus datos y te contactaremos para coordinar la clase de prueba en sede Llanogrande o a domicilio.',
    url: 'https://peskids.op-sly.com/instagram',
    type: 'website',
  },
};

export default function InstagramPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PeskidsReservationLanding
          source={PESKIDS_INSTAGRAM_LANDING.source}
          campaign={PESKIDS_INSTAGRAM_LANDING.campaign}
          defaultReferralSource={PESKIDS_INSTAGRAM_LANDING.defaultReferralSource}
          showInstagramCopy
          showLogo
          headingLevel="h1"
        />
      </main>
      <CtaBand />
      <SiteFooter />
    </div>
  );
}
