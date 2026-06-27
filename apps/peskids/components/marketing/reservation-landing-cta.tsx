'use client';

import { GatedWhatsAppLink } from '@/components/marketing/gated-whatsapp-link';
import { PESKIDS_RESERVATION_FORM_ANCHOR } from '@/lib/peskids-landing-config';

type ReservationLandingCTAProps = {
  formAnchorId?: string;
};

export function ReservationLandingCTA({
  formAnchorId = PESKIDS_RESERVATION_FORM_ANCHOR,
}: ReservationLandingCTAProps): React.ReactElement {
  return (
    <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <button
        onClick={(): void => {
          document.getElementById(formAnchorId)?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="rounded-lg bg-pk-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-pk-primary/90"
        type="button"
      >
        Reservar clase gratuita
      </button>
      <GatedWhatsAppLink variant="button" label="WhatsApp" />
    </div>
  );
}
