'use client';

import Link from 'next/link';
import { GatedWhatsAppLink } from '@/components/marketing/gated-whatsapp-link';
import {
  PESKIDS_PUBLIC_RESERVA_FORM_LABEL,
  PESKIDS_PUBLIC_WHATSAPP_LABEL,
} from '@/lib/marketing-routes';
import { PESKIDS_RESERVATION_FORM_HREF } from '@/lib/peskids-landing-config';
import { cn } from '@/lib/utils';

type PublicReservaFormLinkProps = {
  label?: string;
  variant?: 'button' | 'onDark' | 'pill';
  className?: string;
};

const variantClass: Record<NonNullable<PublicReservaFormLinkProps['variant']>, string> = {
  button:
    'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-pk-primary px-6 text-sm font-bold text-white shadow-md shadow-pk-primary/30 transition hover:bg-pk-primary-dark active:scale-[0.99]',
  onDark:
    'inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-full bg-pk-primary px-6 text-sm font-bold text-white shadow-lg transition hover:bg-pk-primary/90 active:scale-[0.99]',
  pill:
    'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-pk-border bg-white px-5 text-sm font-bold text-pk-ink transition hover:border-pk-primary/30 hover:bg-pk-snow',
};

/** CTA público de reserva → formulario (captura obligatoria antes de WhatsApp humano). */
export function PublicReservaFormLink({
  label = PESKIDS_PUBLIC_RESERVA_FORM_LABEL,
  variant = 'button',
  className,
}: PublicReservaFormLinkProps): React.ReactElement {
  return (
    <Link href={PESKIDS_RESERVATION_FORM_HREF} className={cn(variantClass[variant], className)}>
      {label}
    </Link>
  );
}

/** WhatsApp visible en landing; abre chat solo tras completar el formulario de lead. */
export function PublicReservaWhatsAppLink({
  label = PESKIDS_PUBLIC_WHATSAPP_LABEL,
  variant = 'button',
  className,
}: PublicReservaFormLinkProps): React.ReactElement {
  return (
    <GatedWhatsAppLink
      variant={variant}
      className={className}
      label={label}
    />
  );
}
