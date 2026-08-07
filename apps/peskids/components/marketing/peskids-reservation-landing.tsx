import { Suspense } from 'react';
import { PeskidsLogo } from '@/components/brand/peskids-logo';
import { LeadCaptureForm } from '@/components/forms';
import { ReservationLandingCTA } from '@/components/marketing/reservation-landing-cta';
import { PESKIDS_RESERVATION_FORM_ANCHOR } from '@/lib/peskids-landing-config';
import {
  PESKIDS_INSTAGRAM_LANDING_INTRO,
  PESKIDS_RESERVATION_AUDIENCE,
  PESKIDS_RESERVATION_DESCRIPTION,
  PESKIDS_RESERVATION_EYEBROW,
  PESKIDS_RESERVATION_TITLE,
} from '@/lib/peskids-landing-copy';

export type PeskidsReservationLandingProps = {
  source: string;
  campaign?: string;
  showInstagramCopy?: boolean;
  defaultReferralSource?: string;
  showLogo?: boolean;
  headingLevel?: 'h1' | 'h2';
};

export function PeskidsReservationLanding({
  source,
  campaign,
  showInstagramCopy = false,
  defaultReferralSource,
  showLogo = false,
  headingLevel = 'h2',
}: PeskidsReservationLandingProps): React.ReactElement {
  const intro = showInstagramCopy ? PESKIDS_INSTAGRAM_LANDING_INTRO : PESKIDS_RESERVATION_DESCRIPTION;
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
          <p className="pk-eyebrow text-pk-primary">{PESKIDS_RESERVATION_EYEBROW}</p>
          <HeadingTag
            id="peskids-reservation-heading"
            className="mb-3 text-3xl font-bold text-pk-ink sm:text-4xl"
          >
            {PESKIDS_RESERVATION_TITLE}
          </HeadingTag>
          <p className="mb-4 text-lg text-pk-sub">{intro}</p>
          <p className="mx-auto mb-6 max-w-xl text-left text-sm leading-relaxed text-pk-sub sm:text-center">
            {PESKIDS_RESERVATION_AUDIENCE}
          </p>
          <ReservationLandingCTA />
        </div>

        <div id={PESKIDS_RESERVATION_FORM_ANCHOR} className="scroll-mt-8">
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
