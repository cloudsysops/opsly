'use client';

import { PESKIDS_RESERVATION_FORM_ANCHOR } from '@/lib/peskids-landing-config';

type ReservationLandingCTAProps = {
  formAnchorId?: string;
};

export function ReservationLandingCTA({
  formAnchorId = PESKIDS_RESERVATION_FORM_ANCHOR,
}: ReservationLandingCTAProps): React.ReactElement {
  return (
    <div className="mb-8 flex justify-center">
      <button
        onClick={(): void => {
          document.getElementById(formAnchorId)?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="rounded-lg bg-pk-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-pk-primary/90"
        type="button"
      >
        Reservar clase gratuita
      </button>
    </div>
  );
}
