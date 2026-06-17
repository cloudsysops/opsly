import { Suspense } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { InstagramFeedSection } from '@/components/marketing/instagram-feed-section';
import { HeroSection } from '@/components/marketing/hero-section';
import { LeadCaptureForm } from '@/components/forms/lead-capture-form';
import { LevelsSection } from '@/components/marketing/levels-section';

export const metadata = {
  title: 'Peskids — Academia de natación · Medellín',
  description:
    'Natación para niños de 3 meses a 15 años. Sede Llanogrande. Aprenden, se divierten, son Peskids. Solicita una clase de prueba gratuita.',
};

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <HeroSection />

      {/* Lead Capture Form Section - Consolidate from /instagram page */}
      <section className="bg-pk-surface/50 px-4 py-12 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-pk-ink mb-2 text-center">
            Solicita tu clase de prueba
          </h2>
          <p className="text-center text-pk-sub mb-8">
            Déjanos tus datos y nuestro equipo se pondrá en contacto contigo pronto.
          </p>
          <Suspense fallback={<div className="h-96" />}>
            <LeadCaptureForm />
          </Suspense>
        </div>
      </section>

      <LevelsSection />
      <InstagramFeedSection />
      <SiteFooter />
    </div>
  )
}
