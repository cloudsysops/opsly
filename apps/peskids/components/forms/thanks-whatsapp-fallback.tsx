'use client';

import { useEffect, useState } from 'react';
import { WhatsAppLink } from '@/components/contact/whatsapp-link';
import {
  buildPostLeadWhatsAppPrefill,
  buildPostLeadWhatsAppPrefillFromSession,
  readPeskidsLeadSession,
} from '@/lib/peskids-lead-session';

type ThanksWhatsAppFallbackProps = {
  label: string;
  modality?: string | null;
  leadId?: string | null;
};

/**
 * When /thanks cannot load lead JSON, still prefill WhatsApp from sessionStorage
 * (written by the form) including lead_id when present.
 */
export function ThanksWhatsAppFallback({
  label,
  modality,
  leadId,
}: ThanksWhatsAppFallbackProps): React.ReactElement {
  const [prefill, setPrefill] = useState<string | null>(null);

  useEffect(() => {
    const session = readPeskidsLeadSession();
    if (session?.name) {
      setPrefill(
        buildPostLeadWhatsAppPrefillFromSession({
          ...session,
          lead_id: leadId || session.lead_id,
          class_modality:
            modality === 'llanogrande' || modality === 'domicilio'
              ? modality
              : session.class_modality,
        })
      );
      return;
    }
    if (leadId) {
      setPrefill(
        buildPostLeadWhatsAppPrefill('familia', {
          lead_id: leadId,
          class_modality: modality,
        })
      );
    }
  }, [leadId, modality]);

  return (
    <WhatsAppLink
      variant="hero"
      className="w-full"
      label={label}
      modality={modality ?? null}
      prefill={prefill ?? undefined}
    />
  );
}
