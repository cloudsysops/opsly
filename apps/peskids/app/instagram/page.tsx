import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { PeskidsReservationLanding } from '@/components/marketing/peskids-reservation-landing';
import { PESKIDS_INSTAGRAM_LANDING } from '@/lib/peskids-landing-config';

export const metadata = {
  title: 'Clase de prueba gratuita de natación | Peskids',
  description:
    'Reserva una clase de prueba gratis en Peskids. Academia de natación en Llanogrande (Rionegro) y a domicilio en el área metropolitana de Medellín.',
  openGraph: {
    title: 'Clase de prueba gratuita de natación',
    description:
      'Déjanos tus datos o continúa directamente por WhatsApp. Seguiremos atendiéndote como siempre.',
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
      <SiteFooter />
    </div>
  );
}
