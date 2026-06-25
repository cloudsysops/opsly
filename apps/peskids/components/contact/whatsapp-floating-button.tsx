'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { WhatsAppIcon } from '@/components/contact/whatsapp-icon';
import { PESKIDS_CONTACT } from '@/lib/contact-channels';
import { isPeskidsPublicLandingPath } from '@/lib/marketing-routes';
import {
  PESKIDS_RESERVATION_FORM_ANCHOR,
  PESKIDS_RESERVATION_FORM_HREF,
} from '@/lib/peskids-landing-config';
import { dispatchOpenPeskidsChat } from '@/lib/peskids-chat-session';
import { peskidsColorTokens } from '@/lib/tokens';
import { cn } from '@/lib/utils';

const fabClassName = cn(
  'fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-full',
  'px-3.5 py-3 text-white sm:bottom-6 sm:right-6 sm:px-5 sm:py-4',
  'transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
  'animate-[pulse-soft_2.5s_ease-in-out_infinite]'
);

const fabStyle = {
  backgroundColor: peskidsColorTokens.primary.teal,
  boxShadow: `0 8px 32px ${peskidsColorTokens.primary.teal}8c`,
  outlineColor: peskidsColorTokens.primary.teal,
};

function scrollToReservationForm(): void {
  const target = document.getElementById(PESKIDS_RESERVATION_FORM_ANCHOR);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  window.location.href = PESKIDS_RESERVATION_FORM_HREF;
}

/** FAB fijo — en landing pública lleva al formulario; en portales internos abre soporte. */
export function WhatsAppFloatingButton(): React.ReactElement | null {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const publicLanding = isPeskidsPublicLandingPath(pathname);
  const isFamilyArea = pathname?.startsWith('/familias') ?? false;

  if (publicLanding) {
    return (
      <button
        type="button"
        onClick={(): void => {
          if (pathname === '/' || pathname === '/instagram') {
            scrollToReservationForm();
            return;
          }
          router.push(PESKIDS_RESERVATION_FORM_HREF);
        }}
        className={fabClassName}
        style={fabStyle}
        aria-label="Ir al formulario de reserva de clase gratuita"
        title="Reservar clase"
      >
        <Send className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" aria-hidden />
        <span className="pr-0.5 text-xs font-bold leading-none sm:text-base">Reservar</span>
      </button>
    );
  }

  const label = isFamilyArea ? 'Soporte' : 'WhatsApp';
  const ariaLabel = isFamilyArea
    ? `Abrir soporte de familias: ${PESKIDS_CONTACT.whatsapp.display}`
    : `Escribir por WhatsApp: ${PESKIDS_CONTACT.whatsapp.display}`;
  const title = isFamilyArea ? 'Soporte Peskids' : 'WhatsApp Peskids';

  return (
    <button
      type="button"
      onClick={() => dispatchOpenPeskidsChat()}
      className={fabClassName}
      style={{
        ...fabStyle,
        backgroundColor: peskidsColorTokens.primary.whatsapp,
        boxShadow: `0 8px 32px ${peskidsColorTokens.primary.whatsapp}8c`,
        outlineColor: peskidsColorTokens.primary.whatsapp,
      }}
      aria-label={ariaLabel}
      title={title}
    >
      <WhatsAppIcon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
      <span className="pr-0.5 text-xs font-bold leading-none sm:text-base">{label}</span>
    </button>
  );
}
