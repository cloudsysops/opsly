'use client';

import { usePathname } from 'next/navigation';
import { PESKIDS_FORM_SUBMIT_LABEL } from '@/lib/peskids-landing-copy';
import { PESKIDS_RESERVATION_FORM_ANCHOR } from '@/lib/peskids-landing-config';
import { navigateToPeskidsReservationForm } from '@/lib/peskids-reservation-form-nav';

type ReservationLandingCTAProps = {
  formAnchorId?: string;
};

/** CTA al formulario clásico — WhatsApp queda en header + FAB (máx. 2 en landing). */
export function ReservationLandingCTA({
  formAnchorId = PESKIDS_RESERVATION_FORM_ANCHOR,
}: ReservationLandingCTAProps): React.ReactElement {
  const pathname = usePathname();

  return (
    <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <button
        onClick={(): void => {
          const el = document.getElementById(formAnchorId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
          navigateToPeskidsReservationForm(pathname);
        }}
        className="rounded-full bg-pk-primary px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-pk-primary/90"
        type="button"
      >
        {PESKIDS_FORM_SUBMIT_LABEL}
      </button>
    </div>
  );
}
