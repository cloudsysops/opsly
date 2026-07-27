'use client';

import { dispatchOpenPeskidsChat } from '@/lib/peskids-chat-session';
import { PESKIDS_CHAT_SECTION_ANCHOR, PESKIDS_FORM_SUBMIT_LABEL } from '@/lib/peskids-landing-copy';

type ReservationLandingCTAProps = {
  formAnchorId?: string;
};

/** Solo CTA al chat — WhatsApp queda en header + FAB (máx. 2 en landing). */
export function ReservationLandingCTA({
  formAnchorId = PESKIDS_CHAT_SECTION_ANCHOR,
}: ReservationLandingCTAProps): React.ReactElement {
  return (
    <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <button
        onClick={(): void => {
          const el = document.getElementById(formAnchorId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            dispatchOpenPeskidsChat();
          }
        }}
        className="rounded-full bg-pk-primary px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-pk-primary/90"
        type="button"
      >
        {PESKIDS_FORM_SUBMIT_LABEL}
      </button>
    </div>
  );
}
