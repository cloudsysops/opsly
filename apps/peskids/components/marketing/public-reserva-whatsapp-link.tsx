'use client';

import { WhatsAppLink } from '@/components/contact/whatsapp-link';
import { PESKIDS_PUBLIC_RESERVA_WHATSAPP_LABEL } from '@/lib/marketing-routes';
import { cn } from '@/lib/utils';

type PublicReservaWhatsAppLinkProps = {
  label?: string;
  variant?: 'button' | 'onDark' | 'pill';
  className?: string;
};

/** CTA público de reserva — siempre abre WhatsApp, nunca el chat interno. */
export function PublicReservaWhatsAppLink({
  label = PESKIDS_PUBLIC_RESERVA_WHATSAPP_LABEL,
  variant = 'button',
  className,
}: PublicReservaWhatsAppLinkProps): React.ReactElement {
  return <WhatsAppLink variant={variant} label={label} className={cn(className)} />;
}
