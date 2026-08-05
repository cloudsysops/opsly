'use client';

import { usePathname } from 'next/navigation';
import { WhatsAppIcon } from '@/components/contact/whatsapp-icon';
import { openGatedWhatsAppOrForm } from '@/components/marketing/gated-whatsapp-link';
import { PESKIDS_CONTACT } from '@/lib/contact-channels';
import { isPeskidsPublicLandingPath } from '@/lib/marketing-routes';
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

/** FAB fijo — en landing pública WhatsApp con gate al formulario; en portales internos abre soporte. */
export function WhatsAppFloatingButton(): React.ReactElement | null {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const publicLanding = isPeskidsPublicLandingPath(pathname);
  const isFamilyArea = pathname?.startsWith('/familias') ?? false;
  const whatsappGreen = peskidsColorTokens.primary.whatsapp;

  if (publicLanding) {
    return (
      <button
        type="button"
        onClick={(): void => openGatedWhatsAppOrForm(pathname)}
        className={fabClassName}
        style={{
          backgroundColor: whatsappGreen,
          boxShadow: `0 8px 32px ${whatsappGreen}8c`,
          outlineColor: whatsappGreen,
        }}
        aria-label={`WhatsApp Peskids: completa el formulario o continúa si ya lo enviaste (${PESKIDS_CONTACT.whatsapp.display})`}
        title="Formulario de solicitud → WhatsApp"
      >
        <WhatsAppIcon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
        <span className="pr-0.5 text-xs font-bold leading-none sm:text-base">WhatsApp</span>
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
        backgroundColor: whatsappGreen,
        boxShadow: `0 8px 32px ${whatsappGreen}8c`,
        outlineColor: whatsappGreen,
      }}
      aria-label={ariaLabel}
      title={title}
    >
      <WhatsAppIcon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
      <span className="pr-0.5 text-xs font-bold leading-none sm:text-base">{label}</span>
    </button>
  );
}
