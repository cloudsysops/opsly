import { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { LeadCaptureForm } from '@/components/forms';
import { buildWhatsAppUrl } from '@/lib/contact-channels';
import { PeskidsLogo } from '@/components/brand/peskids-logo';
import { InstagramCTA } from './instagram-cta';

export const metadata = {
  title: 'Clase de prueba gratuita de natación | Peskids',
  description:
    'Reserva una clase de prueba gratis en Peskids. Academia de natación en Llanogrande (Rionegro) y a domicilio en el área metropolitana de Medellín.',
  openGraph: {
    title: 'Clase de prueba gratuita de natación',
    description:
      'Déjanos tus datos o continúa directamente por WhatsApp. Seguiremos atendiéndote como siempre.',
    url: 'https://peskids.op-sly.com/instagram',
    type: 'website',
  },
};

export default function InstagramPage(): React.ReactElement {
  const whatsappUrl = buildWhatsAppUrl();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1 bg-pk-bg px-4 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-2xl">
          {/* Hero Section */}
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-6">
              <PeskidsLogo size={120} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-pk-ink mb-3">
              Clase de prueba gratuita de natación
            </h1>
            <p className="text-lg text-pk-sub mb-6">
              Déjanos tus datos o continúa directamente por WhatsApp. Seguiremos atendiéndote como
              siempre.
            </p>

            {/* CTA Buttons */}
            <InstagramCTA whatsappUrl={whatsappUrl} />
          </div>

          {/* Lead Capture Form */}
          <div id="form-container" className="scroll-mt-8">
            <Suspense fallback={<div className="h-96" />}>
              <LeadCaptureForm source="instagram-pilot" />
            </Suspense>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
