import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { PeskidsLockup } from '@/components/brand/peskids-logo';
import { SiteFooter } from '@/components/layout/site-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThanksWhatsAppFallback } from '@/components/forms/thanks-whatsapp-fallback';
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
            <ThanksWhatsAppFallback
              label={copy.waLabel}
              modality={modality ?? null}
              leadId={leadId ?? null}
            />
            <div className="rounded-xl border border-pk-border bg-pk-bg px-4 py-3 text-left text-sm text-pk-sub">
              <p className="font-semibold text-pk-ink">¿Qué sigue?</p>
              <p className="mt-1">{PESKIDS_FORM_SUCCESS_NEXT}</p>
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
