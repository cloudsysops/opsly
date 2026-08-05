'use client';

import { useEffect, useState } from 'react';
import { WhatsAppLink } from '@/components/contact/whatsapp-link';
import { WhatsAppIcon } from '@/components/contact/whatsapp-icon';
import { buildWhatsAppUrl, getWhatsAppContact, PESKIDS_CONTACT } from '@/lib/contact-channels';
import {
  buildPostLeadWhatsAppPrefill,
  readPeskidsLeadSession,
  type PeskidsLeadSession,
} from '@/lib/peskids-lead-session';
import { dispatchOpenPeskidsChat } from '@/lib/peskids-chat-session';
import { navigateToPeskidsReservationForm } from '@/lib/peskids-reservation-form-nav';
import { PESKIDS_WHATSAPP_CTA_LABEL } from '@/lib/peskids-landing-copy';
import { peskidsColorTokens } from '@/lib/tokens';
import { cn } from '@/lib/utils';

type GatedWhatsAppLinkVariant = 'button' | 'hero' | 'pill' | 'ghost' | 'onDark';

type GatedWhatsAppLinkProps = {
  variant?: GatedWhatsAppLinkVariant;
  className?: string;
  label?: string;
  showIcon?: boolean;
};

function gatedWhatsAppBaseClass(variant: GatedWhatsAppLinkVariant): string {
  if (variant === 'hero') {
    return cn(
      'inline-flex h-14 min-w-[220px] items-center justify-center gap-2.5 rounded-full px-8 text-base font-bold text-white transition active:scale-[0.99]',
      'shadow-lg hover:shadow-xl'
    );
  }
  if (variant === 'button') {
    return cn(
      'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white transition active:scale-[0.99]',
      'shadow-md'
    );
  }
  if (variant === 'onDark') {
    return 'inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white ring-2 ring-white/20 transition active:scale-[0.99]';
  }
  if (variant === 'pill') {
    return 'inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-bold transition';
  }
  return cn('inline-flex items-center gap-2 text-sm font-semibold hover:underline');
}

function gatedWhatsAppStyle(variant: GatedWhatsAppLinkVariant): React.CSSProperties {
  const whatsappGreen = peskidsColorTokens.primary.whatsapp;
  const whatsappDark = peskidsColorTokens.dark.darkBlue;

  if (variant === 'hero' || variant === 'button' || variant === 'onDark') {
    return {
      backgroundColor: whatsappGreen,
      color: '#ffffff',
      ...(variant === 'hero' && {
        boxShadow: `0 10px 25px ${whatsappGreen}73`,
      }),
      ...(variant === 'button' && {
        boxShadow: `0 4px 12px ${whatsappGreen}59`,
      }),
    };
  }
  if (variant === 'pill') {
    return {
      borderColor: `${whatsappGreen}4d`,
      backgroundColor: `${whatsappGreen}1a`,
      color: whatsappDark,
    };
  }
  return { color: whatsappDark };
}

function whatsappCtaLabel(session: PeskidsLeadSession, fallback: string): string {
  if (fallback !== 'WhatsApp') return fallback;
  if (session.class_modality === 'domicilio') return 'WhatsApp Domicilios';
  if (session.class_modality === 'llanogrande') return 'WhatsApp Llanogrande';
  return PESKIDS_WHATSAPP_CTA_LABEL;
}

/**
 * WhatsApp CTA en landing: solo abre wa.me si el lead ya completó chat/formulario.
 * Si no, abre el chat de información (datos a plataforma primero).
 */
export function GatedWhatsAppLink({
  variant = 'button',
  className,
  label = 'WhatsApp',
  showIcon = true,
}: GatedWhatsAppLinkProps): React.ReactElement {
  const [session, setSession] = useState<PeskidsLeadSession | null>(null);

  useEffect(() => {
    setSession(readPeskidsLeadSession());
  }, []);

  if (session?.name) {
    return (
      <WhatsAppLink
        variant={variant}
        className={className}
        label={whatsappCtaLabel(session, label)}
        showIcon={showIcon}
        modality={session.class_modality}
        prefill={buildPostLeadWhatsAppPrefill(session.name, {
          class_modality: session.class_modality,
          lead_type: session.lead_type,
        })}
      />
    );
  }

  const base = gatedWhatsAppBaseClass(variant);
  const style = gatedWhatsAppStyle(variant);
  const iconSize = variant === 'hero' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <button
      type="button"
      className={cn(base, className)}
      style={style}
      onClick={(): void => dispatchOpenPeskidsChat()}
      aria-label={`Abre el chat de información antes de WhatsApp (${PESKIDS_CONTACT.whatsapp.display})`}
      title="Primero completa el chat de información"
    >
      {showIcon ? <WhatsAppIcon className={cn('shrink-0', iconSize)} /> : null}
      <span>{label}</span>
    </button>
  );
}

/** Opens WhatsApp when lead session exists; otherwise opens the admissions chat. */
export function openGatedWhatsAppOrForm(pathname: string | null): void {
  const session = readPeskidsLeadSession();
  if (session?.name) {
    const url = buildWhatsAppUrl({
      modality: session.class_modality,
      prefill: buildPostLeadWhatsAppPrefill(session.name, {
        class_modality: session.class_modality,
        lead_type: session.lead_type,
      }),
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  dispatchOpenPeskidsChat();
  if (pathname) {
    window.setTimeout(() => {
      if (!document.querySelector('[aria-label="Chat Peskids"]')) {
        navigateToPeskidsReservationForm(pathname);
      }
    }, 100);
  }
}

export function resolveGatedWhatsAppDisplay(session: PeskidsLeadSession | null): string {
  if (!session?.class_modality) return PESKIDS_CONTACT.whatsapp.display;
  return getWhatsAppContact(
    session.class_modality === 'domicilio' ? 'domicilio' : 'llanogrande'
  ).display;
}
