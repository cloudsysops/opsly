import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { PeskidsLockup } from '@/components/brand/peskids-logo';
import { SiteFooter } from '@/components/layout/site-footer';
import { WhatsAppLink } from '@/components/contact/whatsapp-link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WhatsAppMessagePreview } from '@/components/forms';
import {
  PESKIDS_FORM_SUCCESS_DETAIL,
  PESKIDS_FORM_SUCCESS_DOMICILIO,
  PESKIDS_FORM_SUCCESS_LLANOGRANDE,
  PESKIDS_FORM_SUCCESS_NEXT,
  PESKIDS_FORM_SUCCESS_TITLE,
  PESKIDS_WHATSAPP_CTA_LABEL,
} from '@/lib/peskids-landing-copy';

type ThanksSearchParams = Promise<{
  modality?: string;
  lead_id?: string;
}>;

function thanksCopy(modality: string | undefined): {
  detail: string;
  waLabel: string;
} {
  if (modality === 'domicilio') {
    return {
      detail: PESKIDS_FORM_SUCCESS_DOMICILIO,
      waLabel: 'WhatsApp Domicilios →',
    };
  }
  if (modality === 'llanogrande') {
    return {
      detail: PESKIDS_FORM_SUCCESS_LLANOGRANDE,
      waLabel: 'WhatsApp Llanogrande →',
    };
  }
  return {
    detail: PESKIDS_FORM_SUCCESS_DETAIL,
    waLabel: `${PESKIDS_WHATSAPP_CTA_LABEL} →`,
  };
}

export default async function ThanksPage({
  searchParams,
}: {
  searchParams?: ThanksSearchParams;
}): Promise<React.ReactElement> {
  const resolvedSearchParams = (await searchParams) ?? {};
  const modality = resolvedSearchParams.modality?.trim();
  const leadId = resolvedSearchParams.lead_id?.trim();
  const copy = thanksCopy(modality);

  let leadData: {
    full_name: string;
    email: string;
    phone: string;
    lead_type: string;
    grade_interested: string;
    class_modality: string | null;
    company_name: string | null;
    company_nit: string | null;
    metadata: Record<string, unknown> | null;
  } | null = null;

  if (leadId) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_PESKIDS_URL || 'http://localhost:3004';
      const response = await fetch(`${baseUrl}/api/leads/${leadId}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const result = (await response.json()) as {
          ok?: boolean;
          data?: {
            full_name: string;
            email: string;
            phone: string;
            lead_type: string;
            grade_interested: string;
            class_modality: string | null;
            company_name: string | null;
            company_nit: string | null;
            metadata: Record<string, unknown> | null;
          };
        };
        if (result.ok && result.data) {
          leadData = result.data;
        }
      }
    } catch (error) {
      console.error('Failed to fetch lead data:', error);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-pk-bg">
      <header className="border-b border-pk-border bg-pk-surface/90 px-6 py-4">
        <PeskidsLockup height={36} />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md text-center shadow-card-hover" accent="green">
          <CardHeader className="items-center border-0 pb-0 pt-8">
            <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-pk-primary">
              <CheckCircle2 className="h-9 w-9" aria-hidden />
            </span>
            <CardTitle className="text-2xl">{PESKIDS_FORM_SUCCESS_TITLE}</CardTitle>
            <CardDescription className="text-base">{copy.detail}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            {leadData && leadId ? (
              <WhatsAppMessagePreview
                clientName={leadData.full_name}
                clientEmail={leadData.email}
                clientPhone={leadData.phone}
                leadType={
                  leadData.lead_type === 'teacher_applicant' || leadData.lead_type === 'company'
                    ? leadData.lead_type
                    : 'family'
                }
                gradeInterested={leadData.grade_interested}
                classModality={
                  leadData.class_modality === 'llanogrande' ||
                  leadData.class_modality === 'domicilio'
                    ? leadData.class_modality
                    : null
                }
                companyName={leadData.company_name}
                companyNit={leadData.company_nit}
                metadata={leadData.metadata}
                leadId={leadId}
              />
            ) : (
              <WhatsAppLink
                variant="hero"
                className="w-full"
                label={copy.waLabel}
                modality={modality ?? null}
              />
            )}
            {leadId ? (
              <div className="rounded-xl border border-pk-primary/30 bg-pk-primary/10 px-4 py-3 text-left text-sm">
                <p className="font-semibold text-pk-ink">📋 Ver tu solicitud en el panel:</p>
                <Link
                  href={`/admin/leads/${leadId}`}
                  className="mt-2 inline-flex items-center gap-2 font-medium text-pk-primary hover:underline"
                >
                  Abrir en Peskids Admin →
                </Link>
              </div>
            ) : null}
            <div className="rounded-xl border border-pk-border bg-pk-bg px-4 py-3 text-left text-sm text-pk-sub">
              <p className="font-semibold text-pk-ink">¿Qué sigue?</p>
              <p className="mt-1">
                {leadData && leadId
                  ? 'Envía el mensaje de arriba al soporte de Peskids. El equipo abrirá el link para ver tus detalles y responderá pronto.'
                  : PESKIDS_FORM_SUCCESS_NEXT}
              </p>
            </div>
            <Link href="/">
              <Button variant="primary" fullWidth>
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
