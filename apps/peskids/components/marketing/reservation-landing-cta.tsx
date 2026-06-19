'use client';

import { PESKIDS_WHATSAPP_CTA_LABEL } from '@/lib/peskids-landing-copy';

type ReservationLandingCTAProps = {
  whatsappUrl: string;
  formAnchorId?: string;
};

export function ReservationLandingCTA({
  whatsappUrl,
  formAnchorId = 'reserva-form',
}: ReservationLandingCTAProps): React.ReactElement {
  return (
    <div className="mb-8 flex flex-col justify-center gap-3 sm:flex-row">
      <button
        onClick={(): void => {
          document.getElementById(formAnchorId)?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="rounded-lg bg-pk-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-pk-primary/90"
        type="button"
      >
        Reservar clase gratuita
      </button>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border-2 border-[#25D366] bg-[#25D366] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#20BD5A]"
      >
        {PESKIDS_WHATSAPP_CTA_LABEL}
      </a>
    </div>
  );
}
