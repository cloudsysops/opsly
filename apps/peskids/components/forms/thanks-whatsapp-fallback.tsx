'use client';

import { useEffect, useState } from 'react';
import { WhatsAppLink } from '@/components/contact/whatsapp-link';
import {
  buildPostLeadWhatsAppPrefill,
  buildPostLeadWhatsAppPrefillFromSession,
  readPeskidsLeadSession,
  type PeskidsLeadSession,
} from '@/lib/peskids-lead-session';

type ThanksWhatsAppFallbackProps = {
  label: string;
  modality?: string | null;
  leadId?: string | null;
};

function resolveModality(
  modality: string | null | undefined,
  session: PeskidsLeadSession | null
): 'llanogrande' | 'domicilio' | null {
  if (modality === 'llanogrande' || modality === 'domicilio') return modality;
  if (session?.class_modality === 'llanogrande' || session?.class_modality === 'domicilio') {
    return session.class_modality;
  }
  return null;
}

function buildThanksPrefill(
  modality: string | null | undefined,
  leadId: string | null | undefined,
  session: PeskidsLeadSession | null
): string {
  const resolvedModality = resolveModality(modality, session);
  const resolvedLeadId = leadId || session?.lead_id || null;

  if (session?.name) {
    return buildPostLeadWhatsAppPrefillFromSession({
      ...session,
      lead_id: resolvedLeadId,
      class_modality: resolvedModality,
    });
  }

  return buildPostLeadWhatsAppPrefill('familia', {
    lead_id: resolvedLeadId,
    class_modality: resolvedModality,
  });
}

/**
 * When /thanks cannot load lead JSON, still prefill WhatsApp from sessionStorage
 * (written by the form) including lead_id when present.
 * Always passes an explicit prefill — never the generic marketing intake text.
 */
export function ThanksWhatsAppFallback({
  label,
  modality,
  leadId,
}: ThanksWhatsAppFallbackProps): React.ReactElement {
  const urlModality =
    modality === 'llanogrande' || modality === 'domicilio' ? modality : null;

  const [prefill, setPrefill] = useState(() =>
    buildThanksPrefill(urlModality, leadId, null)
  );
  const [resolvedModality, setResolvedModality] = useState<'llanogrande' | 'domicilio' | null>(
    urlModality
  );

  useEffect(() => {
    const session = readPeskidsLeadSession();
    setResolvedModality(resolveModality(modality, session));
    setPrefill(buildThanksPrefill(modality, leadId, session));
  }, [leadId, modality]);

  return (
    <WhatsAppLink
      variant="hero"
      className="w-full"
      label={label}
      modality={resolvedModality ?? urlModality}
      prefill={prefill}
    />
  );
}
