import { Suspense } from 'react';
import { PeskidsLogo } from '@/components/brand/peskids-logo';
import { LeadCaptureForm } from '@/components/forms';
import { buildWhatsAppUrl } from '@/lib/contact-channels';
import { ReservationLandingCTA } from '@/components/marketing/reservation-landing-cta';

export type PeskidsReservationLandingProps = {
  source: string;
  campaign?: string;
  showInstagramCopy?: boolean;
  defaultReferralSource?: string;
  showLogo?: boolean;
  headingLevel?: 'h1' | 'h2';
};

const HOME_INTRO =
  'Déjanos tus datos para coordinar tu primera clase en sede Llanogrande o a domicilio. Te contactamos en menos de 48 horas hábiles.';

const INSTAGRAM_INTRO =
  'Déjanos tus datos o continúa directamente por WhatsApp. Seguiremos atendiéndote como siempre.';

export function PeskidsReservationLanding({
  source,
  campaign,
  showInstagramCopy = false,
  defaultReferralSource,
  showLogo = false,
  headingLevel = 'h2',
}: PeskidsReservationLandingProps): React.ReactElement {
  const whatsappUrl = buildWhatsAppUrl();
  const intro = showInstagramCopy ? INSTAGRAM_INTRO : HOME_INTRO;
  const HeadingTag = headingLevel;

  return (
    <section
      id="reserva"
      className="scroll-mt-24 bg-pk-bg px-4 py-10 sm:px-8 lg:px-14"
      aria-labelledby="peskids-reservation-heading"
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          {showLogo ? (
            <div className="mb-6 flex justify-center">
              <PeskidsLogo size={120} />
            </div>
          ) : null}
          <p className="pk-eyebrow text-pk-primary">Reserva aquí</p>
          <HeadingTag
            id="peskids-reservation-heading"
            className="mb-3 text-3xl font-bold text-pk-ink sm:text-4xl"
          >
            Clase de prueba gratuita de natación
          </HeadingTag>
          <p className="mb-6 text-lg text-pk-sub">{intro}</p>
          <ReservationLandingCTA whatsappUrl={whatsappUrl} />
        </div>

        <div id="reserva-form" className="scroll-mt-8">
          <Suspense fallback={<div className="h-96" />}>
            <LeadCaptureForm
              source={source}
              campaign={campaign}
              defaultReferralSource={defaultReferralSource}
              embedded
            />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
